import { verifyPermit, type PermitKeys, type SignedPermit } from '../domain/offline-permit';
import { parsePolicy, policyHash, type PolicySnapshot } from '../domain/permission-policy';
import type { PinIdentity } from '../storage/local-pin';

export interface AccessStore { id:string; name:string; timeZone:'Asia/Jakarta'|'Asia/Makassar'|'Asia/Jayapura'; trialStartedAt:string; entitlementEnd:string }
export interface AccessGrant { status:'ok'; grantId:string; store:AccessStore; identity:PinIdentity; permit:SignedPermit; policy:PolicySnapshot }
const uuid = (x:unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
function object(x:unknown, keys:string[]): x is Record<string,unknown> {
 return x !== null && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype && Object.keys(x).sort().join(',') === keys.sort().join(',');
}
function timestamp(x:unknown): x is string { return typeof x === 'string' && Number.isSafeInteger(Date.parse(x)); }
function storeFrom(input:unknown):AccessStore {
 if(!object(input,['id','name','timeZone','trialStartedAt','entitlementEnd']) || !uuid(input.id) || typeof input.name!=='string' || input.name!==input.name.trim() || input.name.length<1 || input.name.length>80 || (input.timeZone!=='Asia/Jakarta' && input.timeZone!=='Asia/Makassar' && input.timeZone!=='Asia/Jayapura') || !timestamp(input.trialStartedAt) || !timestamp(input.entitlementEnd) || Date.parse(input.entitlementEnd)-Date.parse(input.trialStartedAt)!==60*86400000) throw new Error('Data toko tidak sah');
 return {id:input.id,name:input.name,timeZone:input.timeZone,trialStartedAt:input.trialStartedAt,entitlementEnd:input.entitlementEnd};
}
/** Validate all server data and its signed binding before retaining an enrollment. */
export async function parseAccessGrant(input:unknown, expected:{ownerId:string;deviceId:string;storeId?:string}, keys:PermitKeys):Promise<AccessGrant> {
 if(!object(input,['status','grantId','store','identity','permit','policy']) || input.status!=='ok' || !uuid(input.grantId) || !uuid(expected.ownerId) || !uuid(expected.deviceId)) throw new Error('Respons akses tidak sah');
 const store=storeFrom(input.store), i=input.identity;
 if(!object(i,['storeId','deviceId','epoch','actorId']) || !uuid(i.storeId) || !uuid(i.deviceId) || !uuid(i.actorId) || !Number.isSafeInteger(i.epoch) || (i.epoch as number)<1 || i.storeId!==store.id || i.deviceId!==expected.deviceId || i.actorId!==expected.ownerId || (expected.storeId!==undefined && i.storeId!==expected.storeId)) throw new Error('Identitas akses tidak cocok');
 const identity:PinIdentity={storeId:i.storeId,deviceId:i.deviceId,epoch:i.epoch as number,actorId:i.actorId};
 const permit=await verifyPermit(input.permit,keys,identity), policy=parsePolicy(input.policy), p=permit.payload;
 if(p.version!==2 || p.role!=='owner' || p.scope!=='cashier' || p.entitlementEnd!==Date.parse(store.entitlementEnd) || policy.storeId!==store.id || policy.version!==p.policyVersion || await policyHash(policy)!==p.policyHash || !policy.actors.some(a=>a.id===expected.ownerId && a.role==='owner' && a.active)) throw new Error('Permit atau kebijakan tidak cocok');
 return {status:'ok',grantId:input.grantId,store,identity,permit,policy};
}
/** Keys are pinned in frontend configuration; private JWK material is forbidden. */
export async function importPermitKeys(config:string):Promise<PermitKeys> {
 let parsed:unknown;
 try { parsed=JSON.parse(config); } catch { throw new Error('Konfigurasi kunci tidak sah'); }
 if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || Object.getPrototypeOf(parsed)!==Object.prototype || Object.keys(parsed).length===0) throw new Error('Konfigurasi kunci tidak sah');
 const result:Record<string,CryptoKey>=Object.create(null) as Record<string,CryptoKey>;
 for(const [id,value] of Object.entries(parsed)) {
  if(!/^[A-Za-z0-9._:-]{1,200}$/.test(id) || !value || typeof value!=='object' || Array.isArray(value) || Object.hasOwn(value,'d')) throw new Error('Konfigurasi kunci tidak sah');
  const jwk=value as JsonWebKey;
  if(jwk.kty!=='EC' || jwk.crv!=='P-256' || typeof jwk.x!=='string' || typeof jwk.y!=='string') throw new Error('Konfigurasi kunci tidak sah');
  result[id]=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 }
 return Object.freeze(result);
}
