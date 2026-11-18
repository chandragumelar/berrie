import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { defaults, policyHash } from '../src/domain/permission-policy';
import { importPermitKeys, parseAccessGrant } from '../src/auth/contracts';

// Isolated local project only; never use this suite against hosted Supabase.
const status=execFileSync('supabase',['status','-o','env'],{cwd:'..',encoding:'utf8'});
const env=Object.fromEntries(status.split('\n').flatMap(line=>{const m=/^([A-Z_]+)="(.*)"$/.exec(line);return m?[[m[1]!,m[2]!]]:[];}));
const url=env.API_URL, anon=env.ANON_KEY, service=env.SERVICE_ROLE_KEY;
if(url!=='http://127.0.0.1:55421' || !anon || !service) throw new Error('Suite hanya boleh berjalan pada proyek lokal FLOW-01A');
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const frontend=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const endpoint=`${url}/functions/v1/berrie-access`;
const binding=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
async function call(route:string,body:unknown,accessToken?:string,deviceToken?:string) {
 const response=await fetch(`${endpoint}/${route}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:anon,...(accessToken?{Authorization:`Bearer ${accessToken}`} : {}),...(deviceToken?{'X-Berrie-Device-Token':deviceToken}:{})},body:JSON.stringify(body)});
 return {status:response.status,body:await response.json() as Record<string,unknown>};
}
async function owner(confirmed:boolean) {
 const email=`flow-${crypto.randomUUID()}@example.test`,password=crypto.randomUUID()+'aA1!';
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:confirmed});
 if(error || !data.user) throw new Error('Tidak dapat membuat akun uji lokal');
 if(!confirmed) return {id:data.user.id,email,password,token:''};
 const {data:login,error:loginError}=await frontend().auth.signInWithPassword({email,password});
 if(loginError || !login.session) throw new Error('Tidak dapat masuk akun uji lokal');
 return {id:data.user.id,email,password,token:login.session.access_token};
}
describe('Supabase access integration',()=>{
 it('restricts CORS preflight to configured local origins',async()=>{
  const allowed=await fetch(`${endpoint}/bootstrap`,{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:5173'}});
  expect(allowed.status).toBe(204);expect(allowed.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
  const denied=await fetch(`${endpoint}/bootstrap`,{method:'OPTIONS',headers:{Origin:'https://untrusted.example'}});
  expect(denied.status).toBe(403);expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  const actual=await fetch(`${endpoint}/bootstrap`,{method:'POST',headers:{Origin:'https://untrusted.example',apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({deviceId:null})});
  expect(actual.status).toBe(403);expect(actual.headers.get('access-control-allow-origin')).toBeNull();
  const allowedActual=await fetch(`${endpoint}/bootstrap`,{method:'POST',headers:{Origin:'http://127.0.0.1:5173',apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({deviceId:null})});
  expect(allowedActual.status).toBe(401);expect(allowedActual.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
 });
 it('rejects missing/invalid JWT and extra input without creating stores',async()=>{
  expect((await call('bootstrap',{deviceId:null})).status).toBe(401);
  expect((await call('bootstrap',{deviceId:null},'invalid')).status).toBe(401);
  const user=await owner(true);
  expect(await call('bootstrap',{deviceId:null,role:'owner'},user.token)).toMatchObject({status:400,body:{code:'invalid_input'}});
  expect(await call('activate',{operationId:crypto.randomUUID(),deviceId:crypto.randomUUID(),storeName:'Toko',timeZone:'Asia/Jakarta',epoch:1},user.token,binding())).toMatchObject({status:400,body:{code:'invalid_input'}});
  expect(await call('bootstrap',{deviceId:null},user.token)).toMatchObject({status:200,body:{ownerId:user.id,store:null,activation:'none'}});
 });
 it('creates exactly one grant and returns the same signed response on retry',async()=>{
  const user=await owner(true),deviceId=crypto.randomUUID(),deviceToken=binding(),operationId=crypto.randomUUID(),body={operationId,deviceId,storeName:'Toko uji',timeZone:'Asia/Jakarta'};
  const before=Date.now();const [a,b]=await Promise.all([call('activate',body,user.token,deviceToken),call('activate',body,user.token,deviceToken)]);const after=Date.now();
  expect(a.status).toBe(200); expect(b).toEqual(a);
  const keys=await importPermitKeys(readFileSync('../supabase/permit-public.local.json','utf8'));
  const grant=await parseAccessGrant(a.body,{ownerId:user.id,deviceId},keys);
  expect(Date.parse(grant.store.entitlementEnd)-Date.parse(grant.store.trialStartedAt)).toBe(60*86400000);
  expect(grant.permit.payload.verifiedAt).toBeGreaterThanOrEqual(before-10000);expect(grant.permit.payload.verifiedAt).toBeLessThanOrEqual(after+10000);
  for(const table of ['berrie_access_stores','berrie_access_devices','berrie_access_grants','berrie_access_audit']) {const column=table==='berrie_access_stores'?'id':'store_id';const {count}=await admin.from(table).select('*',{count:'exact',head:true}).eq(column,grant.store.id);expect(count).toBe(1);}
  expect(await call('activate',{...body,storeName:'Berubah'},user.token,deviceToken)).toMatchObject({status:409,body:{code:'operation_conflict'}});
  expect(await call('activate',{...body,operationId:crypto.randomUUID()},user.token,deviceToken)).toMatchObject({status:409,body:{code:'already_activated'}});
  expect(await call('bootstrap',{deviceId},user.token,binding())).toMatchObject({status:200,body:{activation:'other-device'}});
  const refresh={operationId:crypto.randomUUID(),storeId:grant.store.id,deviceId};
  expect(await call('refresh',refresh,user.token,binding())).toMatchObject({status:403,body:{code:'forbidden'}});
  const first=await call('refresh',refresh,user.token,deviceToken),again=await call('refresh',refresh,user.token,deviceToken);
  expect(first.status).toBe(200);expect(again).toEqual(first);
  const renewed=await parseAccessGrant(first.body,{ownerId:user.id,deviceId,storeId:grant.store.id},keys);
  expect(renewed.permit.payload.sequence).toBe(2);expect(renewed.store.entitlementEnd).toBe(grant.store.entitlementEnd);
  const {count}=await admin.from('berrie_access_grants').select('*',{count:'exact',head:true}).eq('owner_user_id',user.id);
  expect(count).toBe(2);
 });
 it('allows only one device for competing activations and denies direct table access',async()=>{
  const user=await owner(true), a={operationId:crypto.randomUUID(),deviceId:crypto.randomUUID(),storeName:'Toko A',timeZone:'Asia/Jakarta'}, b={...a,operationId:crypto.randomUUID(),deviceId:crypto.randomUUID()}, tokenA=binding(),tokenB=binding();
  const results=await Promise.all([call('activate',a,user.token,tokenA),call('activate',b,user.token,tokenB)]);
  expect(results.map(x=>x.status).sort()).toEqual([200,409]);
  expect(results.find(x=>x.status===409)?.body.code).toBe('device_conflict');
  const browser=frontend();const login=await browser.auth.signInWithPassword({email:user.email,password:user.password});expect(login.error).toBeNull();
  const storeId=((results.find(x=>x.status===200)!.body.store) as {id:string}).id;
  const updates:Record<string,Record<string,unknown>>={berrie_access_stores:{name:'Tidak diizinkan'},berrie_access_devices:{epoch:2},berrie_access_grants:{action:'refresh'},berrie_access_audit:{action:'refresh'}};
  const anonymous=frontend();
  for(const table of Object.keys(updates)) for(const client of [browser,anonymous]) { expect((await client.from(table).select('*')).error).not.toBeNull(); expect((await client.from(table).insert({})).error).not.toBeNull(); expect((await client.from(table).update(updates[table]!).eq(table==='berrie_access_stores'?'id':'store_id',storeId)).error).not.toBeNull(); }
  const rpcInput={p_owner:user.id,p_operation:crypto.randomUUID(),p_action:'activate',p_request_hash:'a'.repeat(64),p_device:crypto.randomUUID(),p_binding_hash:'b'.repeat(64),p_store:crypto.randomUUID(),p_name:'Toko',p_time_zone:'Asia/Jakarta',p_key_id:'local-dev',p_policy:{},p_policy_hash:'c'.repeat(64)};
  for(const client of [browser,anonymous]) expect((await client.rpc('berrie_access_create_grant',rpcInput)).error).not.toBeNull();
 });

 it('denies an unverified user and prevents another owner from refreshing a store',async()=>{
  const unverified=await owner(false), issued=Math.floor(Date.now()/1000),header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({sub:unverified.id,aud:'authenticated',role:'authenticated',iat:issued,exp:issued+300})).toString('base64url');
  if(!env.JWT_SECRET) throw new Error('Konfigurasi JWT uji lokal tidak tersedia');
  const token=`${header}.${payload}.${createHmac('sha256',env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
  const deviceId=crypto.randomUUID();
  expect(await call('activate',{operationId:crypto.randomUUID(),deviceId,storeName:'Toko',timeZone:'Asia/Jakarta'},token,binding())).toMatchObject({status:403,body:{code:'email_unverified'}});
  expect(await call('refresh',{operationId:crypto.randomUUID(),storeId:crypto.randomUUID(),deviceId},token,binding())).toMatchObject({status:403,body:{code:'email_unverified'}});
  const one=await owner(true),two=await owner(true),deviceToken=binding();
  const created=await call('activate',{operationId:crypto.randomUUID(),deviceId,storeName:'Toko',timeZone:'Asia/Jakarta'},one.token,deviceToken);
  expect(created.status).toBe(200);const store=(created.body.store as {id:string}).id;
  expect(await call('refresh',{operationId:crypto.randomUUID(),storeId:store,deviceId},two.token,deviceToken)).toMatchObject({status:403,body:{code:'forbidden'}});
  expect(await call('bootstrap',{deviceId},two.token,deviceToken)).toMatchObject({status:200,body:{store:null,activation:'none'}});
 });
 it('finishes the same logical grant after a crash before signing',async()=>{
  const user=await owner(true),deviceId=crypto.randomUUID(),deviceToken=binding(),operationId=crypto.randomUUID(),storeId=crypto.randomUUID(),storeName='Toko crash',timeZone='Asia/Jakarta';
  const sha=(value:string)=>createHash('sha256').update(value).digest('hex'),bindingHash=sha(deviceToken);
  const requestHash=sha(JSON.stringify(['activate',user.id,[operationId,deviceId,storeName,timeZone],bindingHash]));
  const policy={version:1,storeId,actors:[{id:user.id,role:'owner',active:true}],matrix:defaults,discountLimit:{rupiah:null,basisPoints:null}};
  const {data,error}=await admin.rpc('berrie_access_create_grant',{p_owner:user.id,p_operation:operationId,p_action:'activate',p_request_hash:requestHash,p_device:deviceId,p_binding_hash:bindingHash,p_store:storeId,p_name:storeName,p_time_zone:timeZone,p_key_id:'local-dev',p_policy:policy,p_policy_hash:await policyHash(policy)});
  expect(error).toBeNull();expect(data.grant.response_json).toBeNull();
  const reply=await call('activate',{operationId,deviceId,storeName,timeZone},user.token,deviceToken);
  expect(reply.status).toBe(200);expect(reply.body.grantId).toBe(data.grant.id);
  const {count}=await admin.from('berrie_access_grants').select('*',{count:'exact',head:true}).eq('owner_user_id',user.id);expect(count).toBe(1);
 });

 it('rejects expired logical grants and expired entitlement without creating a replacement',async()=>{
  const user=await owner(true),deviceId=crypto.randomUUID(),deviceToken=binding();
  const activation=await call('activate',{operationId:crypto.randomUUID(),deviceId,storeName:'Toko expiry',timeZone:'Asia/Jakarta'},user.token,deviceToken);
  expect(activation.status).toBe(200);const store=(activation.body.store as {id:string}).id;
  const signed=activation.body.permit as {payload:Record<string,unknown>},policy=activation.body.policy,operationId=crypto.randomUUID(),bindingHash=createHash('sha256').update(deviceToken).digest('hex');
  const requestHash=createHash('sha256').update(JSON.stringify(['refresh',user.id,[operationId,store,deviceId],bindingHash])).digest('hex');
  const payload={...signed.payload,sequence:100,verifiedAt:Date.now()-8*86400000};
  const insert=await admin.from('berrie_access_grants').insert({id:crypto.randomUUID(),owner_user_id:user.id,operation_id:operationId,action:'refresh',request_hash:requestHash,store_id:store,device_id:deviceId,epoch:1,permit_sequence:100,payload,policy_snapshot:policy,created_at:new Date().toISOString()});
  expect(insert.error).toBeNull();
  expect(await call('refresh',{operationId,storeId:store,deviceId},user.token,deviceToken)).toMatchObject({status:409,body:{code:'grant_expired'}});
  const start=new Date(Date.now()-70*86400000),end=new Date(start.getTime()+60*86400000);
  const changed=await admin.from('berrie_access_stores').update({trial_started_at:start.toISOString(),entitlement_end:end.toISOString()}).eq('id',store);expect(changed.error).toBeNull();
  expect(await call('refresh',{operationId:crypto.randomUUID(),storeId:store,deviceId},user.token,deviceToken)).toMatchObject({status:403,body:{code:'entitlement_expired'}});
  const {data:device}=await admin.from('berrie_access_devices').select('permit_sequence').eq('store_id',store).single();expect(device?.permit_sequence).toBe(1);
 });

});
