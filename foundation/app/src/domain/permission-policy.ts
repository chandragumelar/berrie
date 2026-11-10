import { halfUp, integer } from './money';

export const configurableActivities = ['refund','cancel-confirmed','discount','free-settlement','stock-correction','stock-in','cash-adjustment','price-change','sku-promo','payment-correction','archive','sale-status','late-order','platform-adjustment','stock-recap'] as const;
export type ConfigurableActivity = typeof configurableActivities[number];
export type PermissionMode = 'allow'|'approval'|'owner-only';
export const defaults:Record<ConfigurableActivity,PermissionMode> = Object.fromEntries(configurableActivities.map(a=>[a, a==='sale-status'||a==='stock-recap'?'allow':a==='sku-promo'||a==='platform-adjustment'?'owner-only':'approval'])) as Record<ConfigurableActivity,PermissionMode>;
export interface PolicySnapshot { version:number; storeId:string; actors:{id:string;role:'owner'|'staff';active:boolean}[]; matrix:Record<ConfigurableActivity,PermissionMode>; discountLimit:{rupiah:number|null; basisPoints:number|null} }
const id=(x:unknown):x is string=>typeof x==='string' && /^[A-Za-z0-9._:-]{1,200}$/.test(x);
const obj=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
const keys=(x:Record<string,unknown>,expected:readonly string[])=>Object.keys(x).sort().join(',')===[...expected].sort().join(',');
export function parsePolicy(input:unknown):PolicySnapshot {
 if(!obj(input)||!keys(input,['version','storeId','actors','matrix','discountLimit'])||!Number.isSafeInteger(input.version)||(input.version as number)<1||!id(input.storeId)||!Array.isArray(input.actors)||!input.actors.length||!obj(input.matrix)||!keys(input.matrix,configurableActivities)||!obj(input.discountLimit)||!keys(input.discountLimit,['rupiah','basisPoints'])) throw new Error('Kebijakan tidak sah');
 const matrix=input.matrix, limit=input.discountLimit;
 if(!configurableActivities.every(a=>matrix[a]==='allow'||matrix[a]==='approval'||matrix[a]==='owner-only')) throw new Error('Matriks tidak sah');
 const actors=input.actors.map(a=>{if(!obj(a)||!keys(a,['id','role','active'])||!id(a.id)||(a.role!=='owner'&&a.role!=='staff')||typeof a.active!=='boolean') throw new Error('Actor tidak sah'); return {id:a.id,role:a.role as 'owner'|'staff',active:a.active};});
 if(new Set(actors.map(a=>a.id)).size!==actors.length) throw new Error('Actor duplikat');
 const rupiah=limit.rupiah===null?null:integer(limit.rupiah,0,Number.MAX_SAFE_INTEGER), basisPoints=limit.basisPoints===null?null:integer(limit.basisPoints,0,10000);
 if(matrix.discount==='allow' && rupiah===null && basisPoints===null) throw new Error('Batas diskon wajib');
 return {version:input.version as number,storeId:input.storeId,actors:actors.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),matrix:Object.fromEntries(configurableActivities.map(a=>[a,matrix[a]])) as Record<ConfigurableActivity,PermissionMode>,discountLimit:{rupiah,basisPoints}};
}
export function policyBytes(input:unknown):Uint8Array<ArrayBuffer> { const p=parsePolicy(input); return new TextEncoder().encode(JSON.stringify([p.version,p.storeId,p.actors.map(a=>[a.id,a.role,a.active]),configurableActivities.map(a=>p.matrix[a]),[p.discountLimit.rupiah,p.discountLimit.basisPoints]])); }
export async function policyHash(input:unknown):Promise<string> { const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',policyBytes(input))); return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
export function discountWithinLimit(subtotal:number,discount:number,limit:PolicySnapshot['discountLimit']):boolean {
 integer(subtotal,0,Number.MAX_SAFE_INTEGER); integer(discount,0,subtotal);
 return (limit.rupiah===null||discount<=limit.rupiah) && (limit.basisPoints===null||discount<=halfUp(BigInt(subtotal)*BigInt(limit.basisPoints),10000n));
}
