import { permitExpiry } from '../domain/offline-permit';
import { canonical, copyInput, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { storedUnitBeforeSnapshot } from './permit-capability';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { requireOrderSession } from './order-session';
import type { BusinessRecord } from '../domain/business-record';
import { payConfirmedFirstBatchCash, type ConfirmedCashPaymentInput } from './confirmed-cash-payment';
import { payConfirmedFirstBatchNoncash, type ConfirmedNoncashInput } from './noncash-payment';
import { readPaymentMethods } from './payment-methods';

export interface PaymentOperation {operationId:string;localSequence:number;recordedAt:string}
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(v:unknown,keys:string[])=>!!v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const id=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=200;
const integer=(v:unknown,min=0):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=min;
function identity(value:PinIdentity):PinIdentity {
 const i=copyInput(value) as PinIdentity;
 if(!exact(i,['storeId','deviceId','epoch','actorId']) || ![i.storeId,i.deviceId,i.actorId].every(id) || !integer(i.epoch,1)) throw new Error('Identitas tidak sah');
 return i;
}
/** Internal authorization boundary; raw primitives are not gateways. */
export class AuthorizedPayments {
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
 readMethods(identityInput:PinIdentity) {
  try {const i=identity(identityInput);return this.execute(i,async ctx=>{validateCheckpoint(await checkpoint(this.db));return readPaymentMethods(this.db,ctx.storeId);});}
  catch {return Promise.resolve({status:'denied'} as const);}
 }
 payCash(identityInput:PinIdentity,input:ConfirmedCashPaymentInput,operation:PaymentOperation) {return this.pay(identityInput,input,operation,'cash');}
 payNoncash(identityInput:PinIdentity,input:ConfirmedNoncashInput,operation:PaymentOperation) {return this.pay(identityInput,input,operation,'noncash');}
 private pay(identityInput:PinIdentity,input:ConfirmedCashPaymentInput|ConfirmedNoncashInput,operation:PaymentOperation,kind:'cash'|'noncash') {
  try {
   const i=identity(identityInput),d=copyInput(input) as ConfirmedCashPaymentInput|ConfirmedNoncashInput,o=copyInput(operation) as PaymentOperation;canonical({i,d,o});
   const base=['orderId','expectedBatchRevision','expectedSessionRevision'];
   if(!(kind==='cash' ? exact(d,[...base,'received']) && integer((d as ConfirmedCashPaymentInput).received,1) : (exact(d,[...base,'expectedMethodsRevision','method','verified']) || exact(d,[...base,'expectedMethodsRevision','method','verified','note'])) && integer((d as ConfirmedNoncashInput).expectedMethodsRevision) && ['qris','transfer','ewallet'].includes((d as ConfirmedNoncashInput).method) && (d as ConfirmedNoncashInput).verified===true && ((d as ConfirmedNoncashInput).note===undefined || (d as ConfirmedNoncashInput).note===null || typeof (d as ConfirmedNoncashInput).note==='string')) || !id(d.orderId) || !integer(d.expectedBatchRevision) || !integer(d.expectedSessionRevision) || !exact(o,['operationId','localSequence','recordedAt']) || !id(o.operationId) || !integer(o.localSequence,1) || typeof o.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(o.recordedAt) || !Number.isFinite(Date.parse(o.recordedAt))) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{
    const snap=validateCheckpoint(await checkpoint(this.db));
    const row=snap.state.find(r=>r.key===`first-batch:${d.orderId}`),record=row?.value as BusinessRecord|undefined;
    if(!row || record?.recordType!=='first-batch' || record.batch.storeId!==ctx.storeId || record.batch.draft.orderId!==d.orderId) throw new Error('Batch tidak ditemukan');
    const sessionId=record.batch.draft.cashSessionId;await requireOrderSession(this.db,ctx.storeId,sessionId);
    const count=snap.state.find(r=>r.key===`cash-count:${sessionId}`)?.value as BusinessRecord|undefined;
    if(count?.recordType==='cash-count' && ['save','revise','close'].includes(count.history.events.at(-1)?.action ?? '')) throw new Error('Sesi kas tidak tersedia');
    const old=record.batch.draft.items.every(item=>item.unitIds.every(unitId=>storedUnitBeforeSnapshot(snap,ctx.storeId,{orderId:d.orderId,unitId},ctx.expiry)));
    ctx.guard(old);
    const meta={...o,storeId:ctx.storeId,deviceId:ctx.deviceId,deviceEpoch:ctx.epoch,actorId:ctx.actorId,policyVersion:ctx.policyVersion};
    const result=(kind==='cash' ? await payConfirmedFirstBatchCash(this.db,d as ConfirmedCashPaymentInput,meta,direct,()=>ctx.guard(old)) : await payConfirmedFirstBatchNoncash(this.db,d as ConfirmedNoncashInput,meta,direct,()=>ctx.guard(old))) as {orderId:string;payment:unknown;settlement:unknown};
    return {orderId:result.orderId,payment:result.payment,settlement:result.settlement};
   });
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
}
