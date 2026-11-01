import { validateBusinessRecord } from '../domain/business-record';
import { BerrieDatabase, type EventRow } from './database';
import { validateTransitions } from './transitions';
export interface StateChange { key:string; expectedRevision:number | null; value:unknown }
export interface AtomicChange { operationId:string; storeId:string; deviceId:string; deviceEpoch:number; localSequence:number; kind:string; targetId:string; actorId:string; policyVersion:number; payload:unknown; state:StateChange[]; ledger:EventRow[]; audit:EventRow[]; outbox:EventRow; result:unknown }
export interface LockProvider { request<T>(name:string, callback:()=>Promise<T>): Promise<T> }
export function canonical(value:unknown):string {
 if(value===null || typeof value==='boolean' || typeof value==='string') return JSON.stringify(value);
 if(typeof value==='number' && Number.isSafeInteger(value)) return JSON.stringify(value);
 if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
 if(typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype) { const obj=value as Record<string,unknown>; return `{${Object.keys(obj).sort().map(k=>`${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`; }
 throw new Error('Data operasi tidak sah');
}
export function copyInput(value:unknown):unknown {
 if(Array.isArray(value)) return value.map(copyInput);
 if(value!==null && typeof value==='object') {
  if(Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Data operasi tidak sah');
  return Object.fromEntries(Object.keys(value).map(key=>[key,copyInput((value as Record<string,unknown>)[key])]));
 }
 return value;
}
function validId(id:unknown): boolean { return typeof id==='string' && id.trim().length>0 && id.length<=200; }
function positive(v:unknown, min=1):v is number { return typeof v==='number' && Number.isSafeInteger(v) && v>=min; }
/** Execute only within the writer lock and a transaction covering all six collections. */
async function commitInTransaction(db:BerrieDatabase, change:AtomicChange):Promise<unknown> {
 if(![change.operationId,change.storeId,change.deviceId,change.kind,change.targetId,change.actorId].every(validId) || !positive(change.deviceEpoch) || !positive(change.localSequence) || !positive(change.policyVersion) || !Array.isArray(change.state) || !change.state.length || !Array.isArray(change.ledger) || !Array.isArray(change.audit) || !change.audit.length || !change.outbox || change.outbox.operationId!==change.operationId) throw new Error('Envelope operasi tidak sah');
 if(new Set(change.state.map(x=>x.key)).size!==change.state.length || change.state.some(x=>!(validId(x.key) || (typeof x.key==='string' && x.key.startsWith('sku-stock-mapping:') && x.key.length<=2500 && !!x.value && typeof x.value==='object' && 'recordType' in x.value && x.value.recordType==='sku-stock-mapping')) || (x.expectedRevision!==null && (!positive(x.expectedRevision,0) || x.expectedRevision===Number.MAX_SAFE_INTEGER)))) throw new Error('Revisi state tidak sah');
 if([...change.ledger,...change.audit,change.outbox].some(x=>!validId(x.id) || x.operationId!==change.operationId)) throw new Error('Event operasi tidak sah');
 for(const row of change.state) validateBusinessRecord(row.value);
 const payload=canonical(change);
  const existing=await db.receipts.get(change.operationId);
  if(existing) { if(existing.payload!==payload) throw new Error('Konflik operation ID'); return existing.result; }
  for(const row of change.state) { const old=await db.state.get(row.key); if((old?.revision ?? null)!==row.expectedRevision) throw new Error('Revisi berubah');
   if(change.kind==='draft.update') {
    const value=old?.value;
    if(!value || typeof value!=='object' || !('recordType' in value) || value.recordType!=='draft') throw new Error('Target bukan draft');
   }
  }
  const currentState=await db.state.toArray();
  const projected=currentState.filter(row=>!change.state.some(next=>next.key===row.key));
  projected.push(...change.state.map(row=>({key:row.key,revision:(row.expectedRevision ?? -1)+1,value:row.value})));
  validateTransitions([...(await db.receipts.toArray()),{id:change.operationId,payload,result:change.result}],projected);
  const sequenceKey=JSON.stringify([change.storeId,change.deviceId,change.deviceEpoch]);
  const sequence=await db.sequences.get(sequenceKey);
  if(change.localSequence!==(sequence?.sequence ?? 0)+1) throw new Error('Urutan operasi tidak sah');
  await db.sequences.put({key:sequenceKey,sequence:change.localSequence});
  await db.state.bulkPut(change.state.map(row=>({key:row.key,revision:(row.expectedRevision ?? -1)+1,value:row.value})));
  await db.ledger.bulkAdd(change.ledger); await db.audit.bulkAdd(change.audit); await db.outbox.add(change.outbox);
  await db.receipts.add({id:change.operationId,payload,result:change.result}); return change.result;
}

/** Internal primitive. T-04 must authorize every business command before it reaches this layer. */
export async function commitChange(db:BerrieDatabase, input:AtomicChange, locks:LockProvider = navigator.locks):Promise<unknown> {
 const change=copyInput(input) as AtomicChange;
 return withWriterTransaction(db,locks,commit=>commit(change));
}
export function withWriterTransaction<T>(db:BerrieDatabase, locks:LockProvider, fn:(commit:(change:AtomicChange)=>Promise<unknown>)=>Promise<T>):Promise<T> {
 if(!locks || typeof locks.request!=='function') throw new Error('Penguncian penulis tidak tersedia');
 return locks.request(`berrie-writer:${db.name}`,()=>db.transaction('rw',[db.state,db.ledger,db.audit,db.outbox,db.receipts,db.sequences],()=>fn(change=>commitInTransaction(db,change))));
}
