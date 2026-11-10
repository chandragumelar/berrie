import { permitExpiry } from '../domain/offline-permit';
import { exportCashReportCsv } from '../domain/cash-report-csv';
import type { CashReport } from '../domain/cash-report';
import { canonical, copyInput, type LockProvider } from './commit';
import { openCashSession, moveCash, readCashBalance, type OpenCashInput, type MoveCashInput, type CashMetadata } from './cash-sessions';
import { readInternalCashReport } from './cash-report';
import { changeCashCount, type CountInput } from './cash-count';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { compareCashCount, custodySegments, type CashCountHistory } from '../domain/cash-count';
import { cashBalance, type CashSession } from '../domain/cash-session';
import { cashMovements } from './cash-sessions';
import type { AtomicChange } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';

type Denied={status:'denied'}|{status:'approval-required'};
type MutationResult=Denied|{status:'ok';sessionId:string;revision:number};
type ReadResult<T>=Denied|{status:'ok';value:T};
export interface CashOperation { operationId:string; localSequence:number; recordedAt:string }
type Action='open'|'move'|'balance'|'report'|'csv'|'count'|'count-read'|'handover'|'handover-read';
type CloseCountInput=Pick<CountInput,'sessionId'|'expectedSessionRevision'|'expectedCountRevision'> & {amount?:number;reason?:string|null};
export type CountBaseInput=Pick<CountInput,'sessionId'|'expectedSessionRevision'|'expectedCountRevision'>;
export type CountAmountInput=CountBaseInput & {amount:number};
export type HandoverFinalInput=CountBaseInput & {received:number;reason?:string|null};
export type TakeoverFinalInput=HandoverFinalInput & {withoutOutgoingReason:string};
type HandoverInput=CountBaseInput & {amount?:number;received?:number;reason?:string|null;withoutOutgoingReason?:string};
type CountResult={sessionId:string;sessionRevision:number;countRevision:number};
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(value:unknown,keys:string[])=>!!value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join(',')===[...keys].sort().join(',');

/** Internal authorized boundary for this cash slice. Primitive storage functions remain internal. */
export class AuthorizedCash {
 constructor(private db:BerrieDatabase,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private locks:LockProvider=navigator.locks) {}

 private async execute<T>(identity:PinIdentity,action:Action,work:(meta:Pick<CashMetadata,'storeId'|'deviceId'|'deviceEpoch'|'actorId'|'policyVersion'>,guard:()=>void,role:'owner'|'staff')=>Promise<T>):Promise<Denied|{status:'ok';value:T}> {
  try {
   const checkCaptured=this.pin.captureIdentity(identity);
   if(this.db.name!==this.pin.businessName || this.db.name!==this.permits.businessName || !this.locks || typeof this.locks.request!=='function') return {status:'denied'};
   const first=await this.permits.read(identity);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    checkCaptured();
    const pinGuard=await checkPin(identity), current=await readPermit(identity);
    if(canonical(first.permit)!==canonical(current.permit) || canonical(first.policy ?? null)!==canonical(current.policy ?? null) || current.clockFault || current.permit.payload.version!==2 || !current.policy) return {status:'denied'} as const;
    const p=current.permit.payload, actor=current.policy.actors.find(a=>a.id===identity.actorId);
    if(!actor || !actor.active || actor.role!==p.role || current.policy.version!==p.policyVersion) return {status:'denied'} as const;
    const mutation=action==='open'||action==='move'||action==='count'||action==='handover';
    const guard=()=>{checkCaptured();pinGuard();const now=current.assertTime();if((action==='open'||action==='move'||action==='handover'||action==='handover-read'||actor.role==='staff') && now>=permitExpiry(p)) throw new Error('Permit kedaluwarsa');};
    guard();
    if(!mutation && action!=='count-read' && action!=='handover-read' && actor.role!=='owner') return {status:'denied'} as const;
    if(action==='move' && actor.role==='staff') {
     const mode=current.policy.matrix['cash-adjustment'];
     if(mode==='approval') return {status:'approval-required'} as const;
     if(mode!=='allow') return {status:'denied'} as const;
    }
    const meta={storeId:p.storeId,deviceId:p.deviceId,deviceEpoch:p.epoch,actorId:p.actorId,policyVersion:current.policy.version};
    const value=await work(meta,guard,actor.role);if(!mutation) guard();return {status:'ok',value} as const;
   })));
  } catch {
   // Persist any clock fault noticed by the synchronous pre-commit guards, after
   // the business transaction and the ordered locks have both been released.
   try {await this.pin.checkIdentity(identity);} catch { /* fail closed */ }
   try {await this.permits.read(identity);} catch { /* fail closed */ }
   return {status:'denied'};
  }
 }

 open(identity:PinIdentity,input:OpenCashInput,operation:CashOperation):Promise<MutationResult> {
  let i:PinIdentity,d:OpenCashInput,o:CashOperation;
  try {i=copyInput(identity) as PinIdentity;d=copyInput(input) as OpenCashInput;o=copyInput(operation) as CashOperation;canonical({i,d,o});if(!exact(d,['sessionId','number','initialCustodian','openingAmount','timeZone']) || !exact(o,['operationId','localSequence','recordedAt'])) throw new Error('Input tidak sah');} catch {return Promise.resolve({status:'denied'});}
  return this.execute(i,'open',async(meta,guard)=>{
   if(d.initialCustodian!==meta.actorId) throw new Error('Penanggung jawab tidak sesuai');
   const result=await openCashSession(this.db,d,{...o,...meta},direct,guard) as {sessionId:string;revision:number};
   return {sessionId:result.sessionId,revision:result.revision};
  }).then(r=>r.status==='ok'?{status:'ok',...r.value}:r);
 }
 move(identity:PinIdentity,input:MoveCashInput,operation:CashOperation):Promise<MutationResult> {
  let i:PinIdentity,d:MoveCashInput,o:CashOperation;
  try {i=copyInput(identity) as PinIdentity;d=copyInput(input) as MoveCashInput;o=copyInput(operation) as CashOperation;canonical({i,d,o});if(!exact(d,['sessionId','expectedRevision','kind','amount','category','description']) || !exact(o,['operationId','localSequence','recordedAt'])) throw new Error('Input tidak sah');} catch {return Promise.resolve({status:'denied'});}
  return this.execute(i,'move',async(meta,guard)=>{
   const result=await moveCash(this.db,d,{...o,...meta},direct,guard,meta.actorId) as {sessionId:string;revision:number};
   return {sessionId:result.sessionId,revision:result.revision};
  }).then(r=>r.status==='ok'?{status:'ok',...r.value}:r);
 }
 balance(identity:PinIdentity,sessionId:string):Promise<ReadResult<number>> {
  const i={...identity},id=sessionId;
  return this.execute(i,'balance',meta=>readCashBalance(this.db,meta.storeId,id));
 }
 report(identity:PinIdentity,sessionId:string):Promise<ReadResult<CashReport>> {
  const i={...identity},id=sessionId;
  return this.execute(i,'report',meta=>readInternalCashReport(this.db,meta.storeId,id));
 }
 csv(identity:PinIdentity,sessionId:string):Promise<ReadResult<{summary:string;ledger:string;segments:string}>> {
  const i={...identity},id=sessionId;
  return this.execute(i,'csv',async meta=>exportCashReportCsv(await readInternalCashReport(this.db,meta.storeId,id)));
 }
 private countMutation(identity:PinIdentity,action:'save'|'revise'|'cancel'|'close',input:CloseCountInput,operation:CashOperation):Promise<Denied|({status:'ok'} & CountResult)> {
  let i:PinIdentity,d:CloseCountInput,o:CashOperation;
  try {
   i=copyInput(identity) as PinIdentity;d=copyInput(input) as CloseCountInput;o=copyInput(operation) as CashOperation;canonical({i,d,o});
   const base=['sessionId','expectedSessionRevision','expectedCountRevision'];
   const keys=action==='save'||action==='revise'?[...base,'amount']:base;
   if(!(exact(d,keys) || action==='close' && exact(d,[...base,'reason'])) || !exact(o,['operationId','localSequence','recordedAt'])) throw new Error('Input tidak sah');
  } catch {return Promise.resolve({status:'denied'});}
  return this.execute(i,'count',async(meta,guard)=>{
   const result=await changeCashCount(this.db,action,d,{...o,...meta},direct,guard,meta.actorId) as CountResult;
   return {sessionId:result.sessionId,sessionRevision:result.sessionRevision,countRevision:result.countRevision};
  }).then(r=>r.status==='ok'?{status:'ok',...r.value}:r);
 }
 saveCount(identity:PinIdentity,input:CloseCountInput,operation:CashOperation) {return this.countMutation(identity,'save',input,operation);}
 reviseCount(identity:PinIdentity,input:CloseCountInput,operation:CashOperation) {return this.countMutation(identity,'revise',input,operation);}
 cancelCount(identity:PinIdentity,input:CloseCountInput,operation:CashOperation) {return this.countMutation(identity,'cancel',input,operation);}
 close(identity:PinIdentity,input:CloseCountInput,operation:CashOperation) {return this.countMutation(identity,'close',input,operation);}
 count(identity:PinIdentity,sessionId:string) {
  let i:PinIdentity,id:string;
  try {i=copyInput(identity) as PinIdentity;id=sessionId;canonical({i,id});} catch {return Promise.resolve({status:'denied'} as const);}
  return this.execute(i,'count-read',async meta=>{
   const snapshot=validateCheckpoint(await checkpoint(this.db));
   const row=snapshot.state.find(r=>r.key===`cash-session:${id}`),record=row?.value as {recordType?:string;session?:CashSession}|undefined;
   if(record?.recordType!=='cash-session' || !record.session || record.session.id!==id || record.session.storeId!==meta.storeId) throw new Error('Sesi tidak ditemukan');
   const count=snapshot.state.find(r=>r.key===`cash-count:${id}`),history=(count?.value as {history?:CashCountHistory}|undefined)?.history;
   const segment=custodySegments(record.session,history ?? null).at(-1)!;
   if(segment.custodian!==meta.actorId || segment.closingOperationId!==null) throw new Error('Penanggung jawab tidak sesuai');
   const last=history?.events.at(-1),active=last && (last.action==='save'||last.action==='revise')?last:undefined;
   if(active && (active.purpose!=='close'||active.actorId!==meta.actorId)) throw new Error('Hitungan tidak sesuai');
   const context={sessionId:id,sessionRevision:row!.revision,countRevision:count?.revision ?? null};
   if(!active) return {...context,active:null};
   const expected=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),id),record.session);
   return {...context,active:{amount:active.amount,expected,...compareCashCount(segment,active.amount!,expected)}};
  });
 }

 private handoverMutation(identity:PinIdentity,action:'save'|'revise'|'cancel'|'handover',input:HandoverInput,operation:CashOperation,takeover:boolean,abandon=false):Promise<Denied|({status:'ok'} & CountResult)> {
  let i:PinIdentity,d:HandoverInput,o:CashOperation;
  try {
   i=copyInput(identity) as PinIdentity;d=copyInput(input) as HandoverInput;o=copyInput(operation) as CashOperation;canonical({i,d,o});
   if(!exact(i,['storeId','deviceId','epoch','actorId'])) throw new Error('Identitas tidak sah');
   const base=['sessionId','expectedSessionRevision','expectedCountRevision'];
   const keys=action==='save'||action==='revise'?[...base,'amount']:action==='handover'?[...base,'received',...(takeover?['withoutOutgoingReason']:[])]:abandon?[...base,'reason']:base;
   if(!(exact(d,keys) || action==='handover' && exact(d,[...keys,'reason'])) || !exact(o,['operationId','localSequence','recordedAt'])) throw new Error('Input tidak sah');
   if((takeover && action==='handover' && (typeof d.withoutOutgoingReason!=='string' || !d.withoutOutgoingReason.trim())) || (abandon && (typeof d.reason!=='string' || !d.reason.trim()))) throw new Error('Alasan wajib');
  } catch {return Promise.resolve({status:'denied'});}
  return this.execute(i,'handover',async(meta,guard,role)=>{
   if(takeover && role!=='owner') throw new Error('Pengambilalihan hanya owner');
   const data:CountInput={...d,purpose:'handover',...(action==='handover'?{incoming:meta.actorId}:{})};
   const authorize=(snapshot:import('./recovery').Snapshot,replay:boolean)=>{
    const row=snapshot.state.find(r=>r.key===`cash-session:${d.sessionId}`),record=row?.value as {recordType?:string;session?:CashSession}|undefined;
    if(record?.recordType!=='cash-session' || !record.session || record.session.id!==d.sessionId || record.session.storeId!==meta.storeId) throw new Error('Sesi tidak ditemukan');
    const history=(snapshot.state.find(r=>r.key===`cash-count:${d.sessionId}`)?.value as {history?:CashCountHistory}|undefined)?.history;
    const segment=custodySegments(record.session,history ?? null).at(-1)!;
    if(replay && action==='handover') {if(segment.custodian!==meta.actorId) throw new Error('Penanggung jawab berubah');return;}
    if(segment.closingOperationId!==null) throw new Error('Sesi sudah ditutup');
    if(action==='handover') {if(segment.custodian===meta.actorId) throw new Error('Penanggung jawab tidak berubah');}
    else if(takeover ? segment.custodian===meta.actorId : segment.custodian!==meta.actorId) throw new Error('Penanggung jawab tidak sesuai');
    const last=history?.events.at(-1),active=last && (last.action==='save'||last.action==='revise')?last:undefined;
    if(!replay && action!=='save' && (!active || active.purpose!=='handover' || active.actorId!==(abandon || action==='handover' && !takeover?segment.custodian:meta.actorId))) throw new Error('Actor hitungan tidak sesuai');
   };
   const result=await changeCashCount(this.db,action,data,{...o,...meta},direct,guard,undefined,authorize) as CountResult;
   return {sessionId:result.sessionId,sessionRevision:result.sessionRevision,countRevision:result.countRevision};
  }).then(r=>r.status==='ok'?{status:'ok',...r.value}:r);
 }
 saveHandoverCount(identity:PinIdentity,input:CountAmountInput,operation:CashOperation) {return this.handoverMutation(identity,'save',input,operation,false);}
 reviseHandoverCount(identity:PinIdentity,input:CountAmountInput,operation:CashOperation) {return this.handoverMutation(identity,'revise',input,operation,false);}
 cancelHandoverCount(identity:PinIdentity,input:CountBaseInput,operation:CashOperation) {return this.handoverMutation(identity,'cancel',input,operation,false);}
 saveTakeoverCount(identity:PinIdentity,input:CountAmountInput,operation:CashOperation) {return this.handoverMutation(identity,'save',input,operation,true);}
 reviseTakeoverCount(identity:PinIdentity,input:CountAmountInput,operation:CashOperation) {return this.handoverMutation(identity,'revise',input,operation,true);}
 cancelTakeoverCount(identity:PinIdentity,input:CountBaseInput,operation:CashOperation) {return this.handoverMutation(identity,'cancel',input,operation,true);}
 cancelAbandonedHandoverCount(identity:PinIdentity,input:CountBaseInput & {reason:string},operation:CashOperation) {return this.handoverMutation(identity,'cancel',input,operation,true,true);}
 handover(identity:PinIdentity,input:HandoverFinalInput,operation:CashOperation) {return this.handoverMutation(identity,'handover',input,operation,false);}
 takeover(identity:PinIdentity,input:TakeoverFinalInput,operation:CashOperation) {return this.handoverMutation(identity,'handover',input,operation,true);}
 handoverCount(identity:PinIdentity,sessionId:string,takeover=false) {
  let i:PinIdentity,id:string;
  try {i=copyInput(identity) as PinIdentity;id=sessionId;canonical({i,id,takeover});if(!exact(i,['storeId','deviceId','epoch','actorId']) || typeof takeover!=='boolean') throw new Error('Input tidak sah');} catch {return Promise.resolve({status:'denied'} as const);}
  return this.execute(i,'handover-read',async(meta,_guard,role)=>{
   if(takeover && role!=='owner') throw new Error('Pengambilalihan hanya owner');
   const snapshot=validateCheckpoint(await checkpoint(this.db));
   const row=snapshot.state.find(r=>r.key===`cash-session:${id}`),record=row?.value as {recordType?:string;session?:CashSession}|undefined;
   if(record?.recordType!=='cash-session' || !record.session || record.session.id!==id || record.session.storeId!==meta.storeId) throw new Error('Sesi tidak ditemukan');
   const count=snapshot.state.find(r=>r.key===`cash-count:${id}`),history=(count?.value as {history?:CashCountHistory}|undefined)?.history;
   const segment=custodySegments(record.session,history ?? null).at(-1)!;
   if(segment.closingOperationId!==null || (takeover?segment.custodian===meta.actorId:segment.custodian!==meta.actorId)) throw new Error('Penanggung jawab tidak sesuai');
   const last=history?.events.at(-1),active=last && (last.action==='save'||last.action==='revise')?last:undefined;
   if(active && (active.purpose!=='handover'||active.actorId!==meta.actorId)) {
    if(takeover && active.purpose==='handover' && active.actorId===segment.custodian) return {sessionId:id,sessionRevision:row!.revision,countRevision:count?.revision ?? null,active:null,abandoned:true};
    throw new Error('Hitungan tidak sesuai');
   }
   const context={sessionId:id,sessionRevision:row!.revision,countRevision:count?.revision ?? null};
   if(!active) return {...context,active:null};
   const expected=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),id),record.session);
   return {...context,active:{amount:active.amount,expected,...compareCashCount(segment,active.amount!,expected)}};
  });
 }

}
