/** Version 1 signs a fixed-order JSON array, encoded as UTF-8. Times are epoch milliseconds. */
export interface PermitPayload {
 version:1; algorithm:'ES256'; keyId:string; storeId:string; deviceId:string; epoch:number;
 actorId:string; role:'owner'|'staff'; scope:'cashier'; sequence:number; verifiedAt:number; entitlementEnd:number;
}
export interface SignedPermit { payload:PermitPayload; signature:string }
export type PermitKeys = Readonly<Record<string, CryptoKey>>;
const fields=['version','algorithm','keyId','storeId','deviceId','epoch','actorId','role','scope','sequence','verifiedAt','entitlementEnd'] as const;
const id=(v:unknown):v is string=>typeof v==='string' && /^[A-Za-z0-9._:-]{1,200}$/.test(v);
const integer=(v:unknown):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=0;
function object(v:unknown):v is Record<string,unknown> { return v!==null && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype; }
export function parsePermit(input:unknown):SignedPermit {
 if(!object(input) || Object.keys(input).sort().join(',')!=='payload,signature' || !object(input.payload)) throw new Error('Permit tidak sah');
 const p=input.payload;
 if(Object.keys(p).sort().join(',')!==[...fields].sort().join(',') || p.version!==1 || p.algorithm!=='ES256' || !id(p.keyId) || !id(p.storeId) || !id(p.deviceId) || !id(p.actorId) || !integer(p.epoch) || p.epoch<1 || !integer(p.sequence) || p.sequence<1 || !integer(p.verifiedAt) || !integer(p.entitlementEnd) || p.verifiedAt>Number.MAX_SAFE_INTEGER-604800000 || p.entitlementEnd>Number.MAX_SAFE_INTEGER-604800000 || (p.role!=='owner' && p.role!=='staff') || p.scope!=='cashier' || typeof input.signature!=='string' || !/^[A-Za-z0-9_-]{86}$/.test(input.signature)) throw new Error('Permit tidak sah');
 return {payload:{version:1,algorithm:'ES256',keyId:p.keyId,storeId:p.storeId,deviceId:p.deviceId,epoch:p.epoch,actorId:p.actorId,role:p.role,scope:'cashier',sequence:p.sequence,verifiedAt:p.verifiedAt,entitlementEnd:p.entitlementEnd},signature:input.signature};
}
export function permitBytes(p:PermitPayload):Uint8Array<ArrayBuffer> { return new TextEncoder().encode(JSON.stringify(fields.map(k=>p[k]))); }
function signatureBytes(s:string):Uint8Array<ArrayBuffer> {
 const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==');
 const bytes=Uint8Array.from(b,c=>c.charCodeAt(0));
 if(bytes.length!==64 || btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==s) throw new Error('Signature tidak sah');
 return bytes;
}
export async function verifyPermit(input:unknown,keys:PermitKeys,identity:{storeId:string;deviceId:string;epoch:number;actorId:string}):Promise<SignedPermit> {
 const permit=parsePermit(input), p=permit.payload, key=Object.hasOwn(keys,p.keyId)?keys[p.keyId]:undefined;
 if(!key || key.type!=='public' || key.algorithm.name!=='ECDSA' || (key.algorithm as EcKeyAlgorithm).namedCurve!=='P-256' || !key.usages.includes('verify')) throw new Error('Kunci tidak dikenal');
 if(p.storeId!==identity.storeId || p.deviceId!==identity.deviceId || p.epoch!==identity.epoch || p.actorId!==identity.actorId) throw new Error('Identitas permit tidak cocok');
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signatureBytes(permit.signature),permitBytes(p))) throw new Error('Signature tidak sah');
 return permit;
}
export const PERMIT_GRACE_MS=7*24*60*60*1000;
export function permitExpiry(p:PermitPayload):number { return Math.min(p.verifiedAt+PERMIT_GRACE_MS,p.entitlementEnd+PERMIT_GRACE_MS); }
