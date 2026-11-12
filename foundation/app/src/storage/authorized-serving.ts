import { permitExpiry } from '../domain/offline-permit';
import { canonical, copyInput, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { storedUnitBeforeSnapshot } from './permit-capability';
import { readServing, serveUnits, type ServingInput } from './serving';
import { readOrderOperationalStatus } from './order-status';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { requireOrderSession } from './order-session';
import type { BusinessRecord } from '../domain/business-record';

export interface ServingOperation {operationId:string;localSequence:number;recordedAt:string}
type Selection={orderId:string;expectedRevision:number|null;unitIds:string[]};
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(v:unknown,keys:string[])=>!!v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const id=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=200;
const integer=(v:unknown,min=0):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=min;
function identity(value:PinIdentity):PinIdentity {
 const i=copyInput(value) as PinIdentity;
 if(!exact(i,['storeId','deviceId','epoch','actorId']) || ![i.storeId,i.deviceId,i.actorId].every(id) || !integer(i.epoch,1)) throw new Error('Identitas tidak sah');
 return i;
}
/** Internal authorization boundary. Raw storage primitives are not alternate gateways. */
export class AuthorizedServing {
 constructor(private db:BerrieDatabase,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private locks:LockProvider=navigator.locks) {}
 private async execute<T>(i:PinIdentity,work:(context:{storeId:string;actorId:string;deviceId:string;epoch:number;policyVersion:number;role:'owner'|'staff';expiry:number;guard:(old?:boolean)=>void})=>Promise<T>):Promise<{status:'denied'}|{status:'ok';value:T}> {
  try {
   const captured=this.pin.captureIdentity(i);
   if(this.db.name!==this.pin.businessName || this.db.name!==this.permits.businessName || !this.locks || typeof this.locks.request!=='function') return {status:'denied'};
   const first=await this.permits.read(i);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    captured();const pinGuard=await checkPin(i),current=await readPermit(i);
    if(canonical(first.permit)!==canonical(current.permit) || canonical(first.policy ?? null)!==canonical(current.policy ?? null) || current.clockFault || current.permit.payload.version!==2 || !current.policy) return {status:'denied'} as const;
    const p=current.permit.payload,actor=current.policy.actors.find(a=>a.id===p.actorId);
    if(!actor || !actor.active || actor.role!==p.role || current.policy.version!==p.policyVersion) return {status:'denied'} as const;
    const expiry=permitExpiry(p);
    const guard=(old=true)=>{captured();pinGuard();const now=current.assertTime();if(now>=expiry && (actor.role!=='owner' || !old)) throw new Error('Permit kedaluwarsa');};
    guard();const value=await work({storeId:p.storeId,actorId:p.actorId,deviceId:p.deviceId,epoch:p.epoch,policyVersion:current.policy.version,role:actor.role,expiry,guard});
    const finalPin=await checkPin(i),finalPermit=await readPermit(i);
    if(finalPermit.clockFault || canonical(current.permit)!==canonical(finalPermit.permit) || canonical(current.policy)!==canonical(finalPermit.policy ?? null)) return {status:'denied'} as const;
    guard();finalPin();const now=finalPermit.assertTime();if(actor.role==='staff' && now>=expiry) return {status:'denied'} as const;
    return {status:'ok',value} as const;
   })));
  } catch {try {await this.pin.checkIdentity(i);} catch { /* fail closed */ } try {await this.permits.read(i);} catch { /* persist clock fault */ } return {status:'denied'};}
 }
 private read(identityInput:PinIdentity,input:{id:string},kind:'serving'|'status') {
  try {
   const i=identity(identityInput),v=copyInput(input) as {id:string};canonical({i,v});if(!exact(v,['id']) || !id(v.id)) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{
    validateCheckpoint(await checkpoint(this.db));
    if(kind==='serving') return readServing(this.db,ctx.storeId,v.id);
    const result=await readOrderOperationalStatus(this.db,ctx.storeId,v.id);
    if(!result.status || result.incomplete.length) throw new Error('Pesanan tidak ditemukan');
    return result;
   });
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
 readServing(i:PinIdentity,input:{id:string}) {return this.read(i,input,'serving');}
 readOrderOperationalStatus(i:PinIdentity,input:{id:string}) {return this.read(i,input,'status');}
 serveUnits(identityInput:PinIdentity,input:Selection,operation:ServingOperation) {
  try {
   const i=identity(identityInput),d=copyInput(input) as Selection,o=copyInput(operation) as ServingOperation;canonical({i,d,o});
   if(!exact(d,['orderId','expectedRevision','unitIds']) || !id(d.orderId) || !(d.expectedRevision===null || integer(d.expectedRevision)) || !Array.isArray(d.unitIds) || !d.unitIds.length || !d.unitIds.every(id) || new Set(d.unitIds).size!==d.unitIds.length || !exact(o,['operationId','localSequence','recordedAt']) || !id(o.operationId) || !integer(o.localSequence,1) || typeof o.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(o.recordedAt) || !Number.isFinite(Date.parse(o.recordedAt))) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{
    const snap=validateCheckpoint(await checkpoint(this.db));
    const row=snap.state.find(r=>r.key===`first-batch:${d.orderId}`),record=row?.value as BusinessRecord|undefined;
    if(!row || record?.recordType!=='first-batch' || record.batch.storeId!==ctx.storeId) throw new Error('Batch tidak ditemukan');
    const sessionId=record.batch.draft.cashSessionId;
    await requireOrderSession(this.db,ctx.storeId,sessionId);
    const count=snap.state.find(r=>r.key===`cash-count:${sessionId}`)?.value as BusinessRecord|undefined;
    if(count?.recordType==='cash-count' && ['save','revise','close'].includes(count.history.events.at(-1)?.action ?? '')) throw new Error('Sesi kas tidak tersedia');
    let old=true;for(const unitId of d.unitIds) if(!storedUnitBeforeSnapshot(snap,ctx.storeId,{orderId:d.orderId,unitId},ctx.expiry)) old=false;
    ctx.guard(old);
    const data:ServingInput={...d,reason:null};
    const result=await serveUnits(this.db,data,{...o,storeId:ctx.storeId,deviceId:ctx.deviceId,deviceEpoch:ctx.epoch,actorId:ctx.actorId,policyVersion:ctx.policyVersion},direct,()=>ctx.guard(old)) as {orderId:string;revision:number};
    return {orderId:result.orderId,revision:result.revision};
   });
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
}
