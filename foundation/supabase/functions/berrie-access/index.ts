import { createClient } from 'npm:@supabase/supabase-js@2';
import { permitBytes } from '../../../app/src/domain/offline-permit.ts';
import { defaults, policyHash } from '../../../app/src/domain/permission-policy.ts';

const env=(name:string):string=>Deno.env.get(name) ?? '';
const obj=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).sort().join(',')===keys.sort().join(',');
const uuid=(x:unknown):x is string=>typeof x==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const hex=(x:ArrayBuffer)=>Array.from(new Uint8Array(x),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async(x:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
const base64url=(x:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const statuses:Record<string,number>={invalid_input:400,unauthenticated:401,email_unverified:403,forbidden:403,entitlement_expired:403,device_conflict:409,already_activated:409,operation_conflict:409,grant_expired:409,service_unavailable:503,signing_unavailable:503};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const allow=env('BERRIE_ALLOWED_ORIGINS').split(',').map(x=>x.trim()).filter(Boolean);
 const cors:Record<string,string>=origin && allow.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-berrie-device-token','Access-Control-Allow-Methods':'POST, OPTIONS'}:{};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 const fail=(code:string)=>reply({status:'error',code},statuses[code] ?? 503);
 try {
 if(origin && !allow.includes(origin)) return fail('forbidden');
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST') return fail('invalid_input');
 const route=new URL(req.url).pathname.split('/').pop();
 if(!['bootstrap','activate','refresh'].includes(route ?? '')) return fail('invalid_input');
 const auth=req.headers.get('Authorization');
 if(!auth || !/^Bearer \S+$/.test(auth)) return fail('unauthenticated');
 const url=env('SUPABASE_URL'), service=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!url || !service || !allow.length) return fail('service_unavailable');
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:userError}=await db.auth.getUser(auth.slice(7));
 if(userError || !userData.user) return fail('unauthenticated');
 const user=userData.user;
 let body:unknown; try { body=await req.json(); } catch { return fail('invalid_input'); }
 if(!obj(body)) return fail('invalid_input');
 const token=req.headers.get('X-Berrie-Device-Token');
 if(token!==null && !/^[A-Za-z0-9_-]{43}$/.test(token)) return fail('invalid_input');
 if(route==='bootstrap') {
  if(!exact(body,['deviceId']) || (body.deviceId!==null && !uuid(body.deviceId))) return fail('invalid_input');
  const {data:store,error}=await db.from('berrie_access_stores').select('id,name,time_zone,trial_started_at,entitlement_end').eq('owner_user_id',user.id).maybeSingle();
  if(error) return fail('service_unavailable');
  if(!store) return reply({status:'ok',ownerId:user.id,emailVerified:!!user.email_confirmed_at,store:null,activation:'none'});
  const {data:device,error:deviceError}=await db.from('berrie_access_devices').select('device_id,binding_hash').eq('store_id',store.id).maybeSingle();
  if(deviceError || !device) return fail('service_unavailable');
  const matched=body.deviceId===device.device_id && token!==null && await hash(token)===device.binding_hash;
  return reply({status:'ok',ownerId:user.id,emailVerified:!!user.email_confirmed_at,store:{id:store.id,name:store.name,timeZone:store.time_zone,trialStartedAt:store.trial_started_at,entitlementEnd:store.entitlement_end},activation:matched?'this-device':'other-device'});
 }
 if(!user.email_confirmed_at || !Number.isFinite(Date.parse(user.email_confirmed_at))) return fail('email_unverified');
 if(!token) return fail('invalid_input');
 if(route==='activate') {
  if(!exact(body,['operationId','deviceId','storeName','timeZone']) || !uuid(body.operationId) || !uuid(body.deviceId) || typeof body.storeName!=='string' || body.storeName!==body.storeName.trim() || body.storeName.length<1 || body.storeName.length>80 || !['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'].includes(body.timeZone as string)) return fail('invalid_input');
 } else if(!exact(body,['operationId','storeId','deviceId']) || !uuid(body.operationId) || !uuid(body.deviceId) || !uuid(body.storeId)) return fail('invalid_input');
 const keyId=env('BERRIE_PERMIT_KEY_ID'); let privateKey:CryptoKey;
 try {
  if(!/^[A-Za-z0-9._:-]{1,200}$/.test(keyId)) return fail('signing_unavailable');
  const jwk=JSON.parse(env('BERRIE_PERMIT_PRIVATE_JWK'));
  if(!obj(jwk) || jwk.kty!=='EC' || jwk.crv!=='P-256' || typeof jwk.d!=='string') return fail('signing_unavailable');
  privateKey=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},privateKey,new Uint8Array([0]));
 } catch { return fail('signing_unavailable'); }
 const bindingHash=await hash(token), storeId=route==='activate'?crypto.randomUUID():body.storeId as string;
 const requestHash=await hash(JSON.stringify([route,user.id,route==='activate'?[body.operationId,body.deviceId,body.storeName,body.timeZone]:[body.operationId,body.storeId,body.deviceId],bindingHash]));
 const policy={version:1,storeId,actors:[{id:user.id,role:'owner',active:true}],matrix:defaults,discountLimit:{rupiah:null,basisPoints:null}};
 const {data:result,error:rpcError}=await db.rpc('berrie_access_create_grant',{p_owner:user.id,p_operation:body.operationId,p_action:route,p_request_hash:requestHash,p_device:body.deviceId,p_binding_hash:bindingHash,p_store:storeId,p_name:route==='activate'?body.storeName:null,p_time_zone:route==='activate'?body.timeZone:null,p_key_id:keyId,p_policy:policy,p_policy_hash:await policyHash(policy)});
 if(rpcError || !obj(result)) return fail('service_unavailable');
 if(typeof result.error==='string') return fail(result.error in statuses?result.error:'service_unavailable');
 if(!obj(result.grant) || !obj(result.store) || !obj(result.grant.payload) || !obj(result.grant.policy_snapshot)) return fail('service_unavailable');
 const grant=result.grant, store=result.store;
 if((grant.payload as Record<string,unknown>).keyId!==keyId) return fail('signing_unavailable');
 let signature:string;
 try { const bytes=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},privateKey,permitBytes(grant.payload as never)); if(bytes.byteLength!==64) return fail('signing_unavailable'); signature=base64url(bytes); } catch { return fail('signing_unavailable'); }
 const response={status:'ok',grantId:grant.id,store:{id:store.id,name:store.name,timeZone:store.time_zone,trialStartedAt:store.trial_started_at,entitlementEnd:store.entitlement_end},identity:{storeId:grant.store_id,deviceId:grant.device_id,epoch:grant.epoch,actorId:grant.owner_user_id},permit:{payload:grant.payload,signature},policy:grant.policy_snapshot};
 const {data:final,error:finalError}=await db.rpc('berrie_access_finalize_grant',{p_owner:user.id,p_grant:grant.id,p_binding_hash:bindingHash,p_payload:grant.payload,p_response:response});
 if(finalError || !obj(final)) return fail('service_unavailable');
 if(typeof final.error==='string') return fail(final.error in statuses?final.error:'service_unavailable');
 if(!obj(final.response)) return fail('service_unavailable');
 return reply(final.response);
 } catch { return fail('service_unavailable'); }
});
