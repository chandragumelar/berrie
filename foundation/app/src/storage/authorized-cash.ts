import { permitExpiry } from '../domain/offline-permit';
import { exportCashReportCsv } from '../domain/cash-report-csv';
import type { CashReport } from '../domain/cash-report';
import { canonical, copyInput, type LockProvider } from './commit';
import { openCashSession, moveCash, readCashBalance, type OpenCashInput, type MoveCashInput, type CashMetadata } from './cash-sessions';
import { readInternalCashReport } from './cash-report';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';

type Denied={status:'denied'}|{status:'approval-required'};
type MutationResult=Denied|{status:'ok';sessionId:string;revision:number};
type ReadResult<T>=Denied|{status:'ok';value:T};
export interface CashOperation { operationId:string; localSequence:number; recordedAt:string }
type Action='open'|'move'|'balance'|'report'|'csv';
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(value:unknown,keys:string[])=>!!value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join(',')===[...keys].sort().join(',');

/** Internal authorized boundary for this cash slice. Primitive storage functions remain internal. */
export class AuthorizedCash {
 constructor(private db:BerrieDatabase,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private locks:LockProvider=navigator.locks) {}

 private async execute<T>(identity:PinIdentity,action:Action,work:(meta:Pick<CashMetadata,'storeId'|'deviceId'|'deviceEpoch'|'actorId'|'policyVersion'>,guard:()=>void)=>Promise<T>):Promise<Denied|{status:'ok';value:T}> {
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
    const mutation=action==='open'||action==='move';
    const guard=()=>{checkCaptured();pinGuard();const now=current.assertTime();if(mutation && now>=permitExpiry(p)) throw new Error('Permit kedaluwarsa');};
    guard();
    if(!mutation && actor.role!=='owner') return {status:'denied'} as const;
    if(action==='move' && actor.role==='staff') {
     const mode=current.policy.matrix['cash-adjustment'];
     if(mode==='approval') return {status:'approval-required'} as const;
     if(mode!=='allow') return {status:'denied'} as const;
    }
    const meta={storeId:p.storeId,deviceId:p.deviceId,deviceEpoch:p.epoch,actorId:p.actorId,policyVersion:current.policy.version};
    const value=await work(meta,guard);if(!mutation) guard();return {status:'ok',value} as const;
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
}
