import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAccessGrant, type AccessGrant, type AccessStore } from './contracts';
import type { AccessIntent } from './enrollment-store';
import type { PermitKeys } from '../domain/offline-permit';

export class AccessApiError extends Error {
 constructor(readonly code:string,readonly status:number) { super(code); }
}
export interface Bootstrap { status:'ok';ownerId:string;emailVerified:boolean;store:AccessStore|null;activation:'none'|'this-device'|'other-device' }
const plain=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && Object.getPrototypeOf(x)===Object.prototype;
const keys=(x:Record<string,unknown>,names:string[])=>Object.keys(x).sort().join(',')===names.sort().join(',');
const uuid=(x:unknown):x is string=>typeof x==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
function parseBootstrap(input:unknown):Bootstrap {
 if(!plain(input) || !keys(input,['status','ownerId','emailVerified','store','activation']) || input.status!=='ok' || !uuid(input.ownerId) || typeof input.emailVerified!=='boolean' || !['none','this-device','other-device'].includes(input.activation as string)) throw new Error('Respons akses tidak sah');
 let store:AccessStore|null=null;
 if(input.store!==null) {
  const s=input.store;
  if(!plain(s) || !keys(s,['id','name','timeZone','trialStartedAt','entitlementEnd']) || !uuid(s.id) || typeof s.name!=='string' || s.name!==s.name.trim() || s.name.length<1 || s.name.length>80 || !['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'].includes(s.timeZone as string) || typeof s.trialStartedAt!=='string' || typeof s.entitlementEnd!=='string' || Date.parse(s.entitlementEnd)-Date.parse(s.trialStartedAt)!==60*86400000) throw new Error('Data toko tidak sah');
  store=s as unknown as AccessStore;
 }
 if((store===null)!==(input.activation==='none')) throw new Error('Status aktivasi tidak sah');
 return {status:'ok',ownerId:input.ownerId,emailVerified:input.emailVerified,store,activation:input.activation as Bootstrap['activation']};
}
export class AccessApi {
 constructor(private readonly client:SupabaseClient,private readonly url:string,private readonly publishableKey:string,private readonly permitKeys:PermitKeys) {}
 private async post(route:string,body:unknown,deviceToken?:string):Promise<unknown> {
  const {data,error}=await this.client.auth.getSession();
  if(error || !data.session?.access_token) throw new AccessApiError('unauthenticated',401);
  let response:Response;
  try { response=await fetch(`${this.url.replace(/\/$/,'')}/functions/v1/berrie-access/${route}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:this.publishableKey,Authorization:`Bearer ${data.session.access_token}`,...(deviceToken?{'X-Berrie-Device-Token':deviceToken}:{})},body:JSON.stringify(body)}); }
  catch { throw new AccessApiError('network_error',0); }
  let dataResponse:unknown; try { dataResponse=await response.json(); } catch { throw new AccessApiError('service_unavailable',response.status); }
  if(!response.ok) {
   if(plain(dataResponse) && keys(dataResponse,['status','code']) && dataResponse.status==='error' && typeof dataResponse.code==='string') throw new AccessApiError(dataResponse.code,response.status);
   throw new AccessApiError('service_unavailable',response.status);
  }
  return dataResponse;
 }
 async bootstrap(deviceId:string|null,token?:string):Promise<Bootstrap> { return parseBootstrap(await this.post('bootstrap',{deviceId},token)); }
 async grant(intent:AccessIntent,token:string,ownerId:string):Promise<AccessGrant> {
  const {action,...body}=intent;
  return parseAccessGrant(await this.post(action,body,token),{ownerId,deviceId:intent.deviceId,...(intent.action==='refresh'?{storeId:intent.storeId}:{})},this.permitKeys);
 }
}
