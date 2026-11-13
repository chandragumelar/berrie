import { permitExpiry } from '../domain/offline-permit';
import type { BusinessRecord } from '../domain/business-record';
import { canonical, copyInput, type AtomicChange, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { storedUnitBeforeSnapshot } from './permit-capability';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { readDraft } from './drafts';
import { confirmFirstBatch, type ConfirmFirstBatchInput } from './confirm-first-batch';
import { cancelStoredDraft, readCancelledDraft, type CancelDraftInput } from './draft-cancellation';

export interface DraftOperation {operationId:string;localSequence:number;recordedAt:string}
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(v:unknown,keys:string[])=>!!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype && Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const id=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=200;
const integer=(v:unknown,min=0):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=min;
function identity(value:PinIdentity):PinIdentity {const i=copyInput(value) as PinIdentity;if(!exact(i,['storeId','deviceId','epoch','actorId']) || ![i.storeId,i.deviceId,i.actorId].every(id) || !integer(i.epoch,1)) throw new Error('Identitas tidak sah');return i;}
export function draftSource(snap:Snapshot,storeId:string,orderId:string) {
 const row=snap.state.find(r=>r.key===`draft:${orderId}`),record=row?.value as BusinessRecord|undefined;
 if(!row || record?.recordType!=='draft' || record.draft.orderId!==orderId) throw new Error('Draft tidak ditemukan');
 const history=snap.receipts.map(r=>JSON.parse(r.payload) as AtomicChange).filter(c=>c.state.some(s=>s.key===row.key));
 if(!history.length || history.some(c=>c.storeId!==storeId) || !history.some(c=>c.state.some(s=>s.key===row.key && (s.expectedRevision ?? -1)+1===row.revision && canonical(s.value)===canonical(row.value)))) throw new Error('Histori tidak sesuai');
 const session=snap.state.find(r=>r.key===`cash-session:${record.draft.cashSessionId}`)?.value as BusinessRecord|undefined;
 if(session?.recordType!=='cash-session' || session.session.id!==record.draft.cashSessionId || session.session.storeId!==storeId) throw new Error('Sesi tidak sesuai');
 return {draft:record.draft,revision:row.revision,session:session.session};
}
/** Internal boundary; raw storage primitives do not authorize a caller. */
export class AuthorizedDrafts {
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
 private read(identityInput:PinIdentity,input:{id:string},cancelled:boolean) {
  try {const i=identity(identityInput),v=copyInput(input) as {id:string};canonical({i,v});if(!exact(v,['id']) || !id(v.id)) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{const snap=validateCheckpoint(await checkpoint(this.db));draftSource(snap,ctx.storeId,v.id);const result=cancelled?await readCancelledDraft(this.db,v.id):await readDraft(this.db,v.id);if(!result) throw new Error('Draft tidak ditemukan');return result;});
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
 readDraft(i:PinIdentity,input:{id:string}) {return this.read(i,input,false);}
 readCancelledDraft(i:PinIdentity,input:{id:string}) {return this.read(i,input,true);}
 confirmFirstBatch(identityInput:PinIdentity,input:ConfirmFirstBatchInput,operation:DraftOperation) {
  try {const i=identity(identityInput),d=copyInput(input) as ConfirmFirstBatchInput,o=copyInput(operation) as DraftOperation;canonical({i,d,o});
   if(!exact(d,['orderId','expectedDraftRevision','mappings','groups']) || !id(d.orderId) || !integer(d.expectedDraftRevision) || !Array.isArray(d.mappings) || !Array.isArray(d.groups) || !d.mappings.every(m=>exact(m,['skuId','groupId','revision']) && id(m.skuId) && id(m.groupId) && integer(m.revision)) || !d.groups.every(g=>exact(g,['groupId','balance','revision']) && id(g.groupId) && integer(g.balance) && integer(g.revision)) || new Set(d.mappings.map(m=>m.skuId)).size!==d.mappings.length || new Set(d.groups.map(g=>g.groupId)).size!==d.groups.length || !exact(o,['operationId','localSequence','recordedAt']) || !id(o.operationId) || !integer(o.localSequence,1) || typeof o.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(o.recordedAt) || !Number.isFinite(Date.parse(o.recordedAt))) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{const snap=validateCheckpoint(await checkpoint(this.db)),s=draftSource(snap,ctx.storeId,d.orderId);
    const count=snap.state.find(r=>r.key===`cash-count:${s.session.id}`)?.value as BusinessRecord|undefined;
    if(count?.recordType==='cash-count' && ['save','revise','close'].includes(count.history.events.at(-1)?.action ?? '')) throw new Error('Sesi tidak tersedia');
    const old=s.draft.items.every(item=>item.unitIds.every(unitId=>storedUnitBeforeSnapshot(snap,ctx.storeId,{orderId:d.orderId,unitId},ctx.expiry)));ctx.guard(old);
    const result=await confirmFirstBatch(this.db,d,{...o,storeId:ctx.storeId,deviceId:ctx.deviceId,deviceEpoch:ctx.epoch,actorId:ctx.actorId,policyVersion:ctx.policyVersion},direct,undefined,()=>ctx.guard(old)) as {orderId:string;batchNumber:1};
    return {orderId:result.orderId,batchNumber:result.batchNumber};
   });
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
 cancelStoredDraft(identityInput:PinIdentity,input:CancelDraftInput,operation:DraftOperation) {
  try {const i=identity(identityInput),d=copyInput(input) as CancelDraftInput,o=copyInput(operation) as DraftOperation;canonical({i,d,o});
   if(!exact(d,['orderId','expectedRevision','reason']) || !id(d.orderId) || !integer(d.expectedRevision) || typeof d.reason!=='string' || !d.reason.trim() || d.reason.length>500 || !exact(o,['operationId','localSequence','recordedAt']) || !id(o.operationId) || !integer(o.localSequence,1) || typeof o.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(o.recordedAt) || !Number.isFinite(Date.parse(o.recordedAt))) throw new Error('Input tidak sah');
   return this.execute(i,async ctx=>{const snap=validateCheckpoint(await checkpoint(this.db)),s=draftSource(snap,ctx.storeId,d.orderId);
    if(s.revision!==d.expectedRevision || snap.state.some(r=>r.key===`first-batch:${d.orderId}`)) throw new Error('Draft tidak tersedia');
    const count=snap.state.find(r=>r.key===`cash-count:${s.session.id}`)?.value as BusinessRecord|undefined;
    if(count?.recordType==='cash-count' && ['save','revise','close'].includes(count.history.events.at(-1)?.action ?? '')) throw new Error('Sesi tidak tersedia');
    const old=s.draft.items.every(item=>item.unitIds.every(unitId=>storedUnitBeforeSnapshot(snap,ctx.storeId,{orderId:d.orderId,unitId},ctx.expiry)));ctx.guard(old);
    const result=await cancelStoredDraft(this.db,d,{...o,storeId:ctx.storeId,deviceId:ctx.deviceId,deviceEpoch:ctx.epoch,actorId:ctx.actorId,policyVersion:ctx.policyVersion,storeTimeZone:s.session.timeZone},direct,()=>ctx.guard(old)) as {orderId:string};
    return {orderId:result.orderId};
   });
  } catch {return Promise.resolve({status:'denied'} as const);}
 }
}
