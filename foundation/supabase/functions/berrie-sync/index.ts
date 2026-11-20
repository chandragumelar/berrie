import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateCheckpoint } from '../_shared/checkpoint-validator.ts';

type Obj=Record<string,unknown>;
const env=(name:string)=>Deno.env.get(name)??'';
const obj=(x:unknown):x is Obj=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const positive=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>0;
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const bad=(code:string,status=400)=>new Response(JSON.stringify({status:'error',code}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const canonical=(value:unknown):string=>{
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isSafeInteger(value))return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(obj(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
 throw new Error('receipt_invalid');
};

/** Derive the checkpoint only from accepted server receipts plus this receipt. */
function checkpoint(changes:Obj[]){
 const states=new Map<string,Obj>(),ledger:Obj[]=[],audit:Obj[]=[],outbox:Obj[]=[],receipts:Obj[]=[],sequences=new Map<string,number>();
 for(const change of changes){
  if(!obj(change)||!uuid(change.operationId)||!uuid(change.storeId)||!uuid(change.deviceId)||!positive(change.deviceEpoch)||!positive(change.localSequence)||!Array.isArray(change.state)||!Array.isArray(change.ledger)||!Array.isArray(change.audit)||!obj(change.outbox))throw new Error('receipt_invalid');
  const payload=canonical(change);receipts.push({id:change.operationId,payload,result:change.result});
  for(const row of change.state){if(!obj(row)||typeof row.key!=='string'||(row.expectedRevision!==null&&!Number.isSafeInteger(row.expectedRevision)))throw new Error('receipt_invalid');states.set(row.key,{key:row.key,revision:(row.expectedRevision===null?-1:row.expectedRevision as number)+1,value:row.value});}
  for(const row of change.ledger){if(!obj(row))throw new Error('receipt_invalid');ledger.push(row);} for(const row of change.audit){if(!obj(row))throw new Error('receipt_invalid');audit.push(row);} outbox.push(change.outbox);
  const stream=JSON.stringify([change.storeId,change.deviceId,change.deviceEpoch]);sequences.set(stream,change.localSequence);
 }
 const snapshot={schema:1 as const,state:[...states.values()],ledger,audit,outbox,receipts,sequences:[...sequences].map(([key,sequence])=>({key,sequence}))};
 for(const row of snapshot.receipts)if(canonical(JSON.parse(row.payload))!==row.payload)throw new Error('receipt_invalid');
 return validateCheckpoint(snapshot);
}

Deno.serve(async(req)=>{
 const origin=req.headers.get('origin'),allow=env('BERRIE_ALLOWED_ORIGINS').split(',').map(x=>x.trim()).filter(Boolean);
 const cors:Record<string,string>=origin&&allow.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-berrie-device-token','Access-Control-Allow-Methods':'POST, OPTIONS'}:{};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 try{
  if(origin&&!allow.includes(origin))return bad('forbidden',403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return bad('invalid_input');
  const authorization=req.headers.get('authorization'),deviceToken=req.headers.get('x-berrie-device-token');if(!authorization||!/^Bearer \S+$/.test(authorization)||!deviceToken||!/^[A-Za-z0-9_-]{43}$/.test(deviceToken))return bad('unauthenticated',401);
  const body=await req.json();if(!obj(body)||Object.keys(body).sort().join(',')!=='change,hash,provenance'||!obj(body.change)||!obj(body.provenance)||typeof body.hash!=='string'||!/[0-9a-f]{64}/.test(body.hash))return bad('invalid_input');
  const change=body.change,provenance=body.provenance;
  if(!uuid(change.operationId)||!uuid(change.storeId)||!uuid(change.deviceId)||!positive(change.deviceEpoch)||!positive(change.localSequence)||!uuid(provenance.grantId)||!positive(provenance.permitSequence)||!positive(provenance.policyVersion))return bad('invalid_input');
  const encoded=canonical(change);if(await sha256(`berrie-sync-v1:${encoded}`)!==body.hash)return bad('hash_mismatch',409);
  const url=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!service)return bad('service_unavailable',503);const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:user}=await db.auth.getUser(authorization.slice(7));if(!user.user)return bad('unauthenticated',401);
  const tokenHash=await sha256(deviceToken);
  const {data:store}=await db.from('berrie_access_stores').select('id,owner_user_id,policy_version').eq('id',change.storeId).eq('owner_user_id',user.user.id).maybeSingle();
  const {data:device}=await db.from('berrie_access_devices').select('device_id,epoch,binding_hash').eq('store_id',change.storeId).maybeSingle();
  const {data:grant}=await db.from('berrie_access_grants').select('id,owner_user_id,store_id,device_id,epoch,permit_sequence,payload,policy_snapshot,created_at').eq('id',provenance.grantId).maybeSingle();
  if(!store||!device||!grant||device.device_id!==change.deviceId||device.epoch!==change.deviceEpoch||device.binding_hash!==tokenHash||grant.owner_user_id!==user.user.id||grant.store_id!==change.storeId||grant.device_id!==change.deviceId||grant.epoch!==change.deviceEpoch||grant.permit_sequence!==provenance.permitSequence||(grant.payload as Obj).policyVersion!==provenance.policyVersion||change.actorId!==user.user.id||change.policyVersion!==provenance.policyVersion)return bad('forbidden',403);
  // Receipt time remains historical; upload after permit expiry is allowed only
  // when this original, signed owner grant was valid at its own verification.
  const verified=(grant.payload as Obj).verifiedAt,expires=(grant.payload as Obj).entitlementEnd;if(!positive(verified)||!positive(expires)||verified>=expires)return bad('grant_invalid',409);
  const {data:rows,error:readError}=await db.from('berrie_sync_operations').select('operation_id,payload_hash,receipt').eq('store_id',change.storeId).order('device_id').order('epoch').order('local_sequence');if(readError)return bad('service_unavailable',503);
  const prior=(rows??[]).find(row=>row.operation_id===change.operationId);if(prior&&prior.payload_hash!==body.hash)return bad('operation_conflict',409);
  let staged;try{staged=checkpoint(prior?(rows??[]).map(row=>row.receipt as Obj):[...(rows??[]).map(row=>row.receipt as Obj),change]);}catch{return bad('receipt_invalid',409);}
  const checkpointHash=await sha256(`berrie-checkpoint-v1:${canonical(staged)}`);
  const {data:result,error:commitError}=await db.rpc('berrie_sync_commit',{p_store:change.storeId,p_device:change.deviceId,p_epoch:change.deviceEpoch,p_sequence:change.localSequence,p_operation:change.operationId,p_hash:body.hash,p_receipt:change,p_grant:provenance.grantId,p_checkpoint_hash:checkpointHash});
  if(commitError||!obj(result))return bad('service_unavailable',503);if(typeof result.error==='string')return bad(result.error,result.error==='sequence_wait'?409:409);return reply(result);
 }catch(error){console.error('berrie-sync failed',error instanceof Error?error.message:'unknown');return bad('service_unavailable',503);}
});
