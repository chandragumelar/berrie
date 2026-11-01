import { draftDateCode } from '../domain/draft';
import { createDraftRecord, validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { BerrieDatabase } from './database';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';

export interface DraftMetadata { operationId:string; storeId:string; deviceId:string; deviceEpoch:number; localSequence:number; actorId:string; policyVersion:number; recordedAt:string; storeTimeZone:string }
export interface DraftResult { orderId:string; displayNumber:string; revision:number }
type DraftRecord=Extract<BusinessRecord,{recordType:'draft'}>;
const key=(id:string)=>`draft:${id}`;

function record(value:unknown):DraftRecord {
 validateBusinessRecord(value);
 if(!value || typeof value!=='object' || !('recordType' in value) || value.recordType!=='draft') throw new Error('Target bukan draft');
 return value as DraftRecord;
}
/** Internal only: metadata is not proof of authentication, policy or authorization. */
function save(db:BerrieDatabase, input:unknown, metadata:DraftMetadata, expectedRevision:number|null, locks:LockProvider = navigator.locks, now:()=>string=()=>new Date().toISOString()):Promise<unknown> {
 // Freeze caller-owned objects before any asynchronous work, including the lock wait.
 const data=copyInput(input), meta=copyInput(metadata) as DraftMetadata;
 draftDateCode(meta.recordedAt,meta.storeTimeZone);
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Draft tidak sah');
 const fields=data as Record<string,unknown>;
 const normalized={...fields,externalOrderId:typeof fields.externalOrderId==='string'?fields.externalOrderId.trim():fields.externalOrderId};
 // Validate before acquiring the lock; create's number is allocated inside the transaction.
 const candidate=createDraftRecord({...normalized,displayNumber:expectedRevision===null?`000101-E${meta.deviceEpoch}-0001`:fields.displayNumber,savedAt:meta.recordedAt});
 const intent={data,metadata:meta,expectedRevision};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const existing=await db.receipts.get(meta.operationId);
  if(existing) {
   const change=JSON.parse(existing.payload) as AtomicChange;
   if((change.kind!=='draft.create' && change.kind!=='draft.update') || canonical(change.payload)!==canonical(intent)) throw new Error('Konflik operation ID');
   return existing.result;
  }
  const committedAt=now();const day=draftDateCode(committedAt,meta.storeTimeZone);candidate.draft.savedAt=committedAt;
  const row=await db.state.get(key(candidate.draft.orderId));
  if((row?.revision ?? null)!==expectedRevision) throw new Error('Revisi berubah');
  const previous=expectedRevision===null?null:record(row?.value);
  if(previous && (previous.draft.orderId!==candidate.draft.orderId || previous.draft.displayNumber!==candidate.draft.displayNumber || previous.draft.cashSessionId!==candidate.draft.cashSessionId)) throw new Error('Identitas draft berubah');
  if(expectedRevision===null) {
   const prefix=`${day}-E${meta.deviceEpoch}-`;let maximum=0;
   for(const receipt of await db.receipts.toArray()) {
    const change=JSON.parse(receipt.payload) as AtomicChange;
    if(change.storeId!==meta.storeId) continue;
    for(const state of change.state) {
     const v=state.value;
     if(v && typeof v==='object' && 'recordType' in v && v.recordType==='draft') {
      const d=record(v).draft;
      if(d.displayNumber.startsWith(prefix)) {const n=Number(d.displayNumber.slice(prefix.length));if(Number.isSafeInteger(n)) maximum=Math.max(maximum,n);}
     }
    }
   }
   if(!Number.isSafeInteger(maximum+1)) throw new Error('Nomor pesanan melampaui batas');
   candidate.draft.displayNumber=prefix+String(maximum+1).padStart(4,'0');
  }
  const operationId=meta.operationId;const result:DraftResult={orderId:candidate.draft.orderId,displayNumber:candidate.draft.displayNumber,revision:expectedRevision===null?0:expectedRevision+1};
  const change:AtomicChange={operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:expectedRevision===null?'draft.create':'draft.update',targetId:candidate.draft.orderId,payload:intent,state:[{key:key(candidate.draft.orderId),expectedRevision,value:candidate}],ledger:[],audit:[{id:`draft-audit:${operationId}`,operationId,value:{action:expectedRevision===null?'create':'update',orderId:candidate.draft.orderId,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,recordedAt:committedAt,before:previous?.draft ?? null,after:candidate.draft}}],outbox:{id:`draft-outbox:${operationId}`,operationId,value:{orderId:candidate.draft.orderId}},result};
  return commit(change);
 });
}
export function createDraft(db:BerrieDatabase,data:unknown,metadata:DraftMetadata,locks?:LockProvider,now?:()=>string):Promise<unknown> {return save(db,data,metadata,null,locks,now);}
export function updateDraft(db:BerrieDatabase,data:unknown,metadata:DraftMetadata,expectedRevision:number,locks?:LockProvider,now?:()=>string):Promise<unknown> {if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0) throw new Error('Revisi tidak sah');return save(db,data,metadata,expectedRevision,locks,now);}
export async function readDraft(db:BerrieDatabase,orderId:string):Promise<{draft:DraftRecord['draft'];revision:number}|undefined> {
 if(typeof orderId!=='string'||!orderId.trim()) throw new Error('ID tidak sah');const row=await db.state.get(key(orderId));if(!row)return undefined;const found=record(row.value);if(found.draft.orderId!==orderId) throw new Error('Identitas draft tidak sesuai');return {draft:found.draft,revision:row.revision};
}
