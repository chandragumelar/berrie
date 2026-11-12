import { validateDraftCancellation, type DraftCancellation } from '../domain/draft-cancellation';
import { draftDateCode, type OrderDraft } from '../domain/draft';
import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { DraftMetadata } from './drafts';
import { requireOrderSession } from './order-session';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

export interface CancelDraftInput { orderId:string; expectedRevision:number; reason:string }
export function makeDraftCancellationChange(draft:OrderDraft,data:CancelDraftInput,metadata:DraftMetadata,sessionSource:{id:string;revision:number}):AtomicChange {
 if(!data || Object.keys(data).sort().join(',')!=='expectedRevision,orderId,reason' || data.orderId!==draft.orderId) throw new Error('Intent pembatalan tidak sah');
 draftDateCode(metadata.recordedAt,metadata.storeTimeZone);
 const event:DraftCancellation={orderId:data.orderId,reason:data.reason,recordedAt:metadata.recordedAt,operationId:metadata.operationId,actorId:metadata.actorId,policyVersion:metadata.policyVersion,draftRevision:data.expectedRevision};validateDraftCancellation(event);
 const operationId=metadata.operationId;
 return {operationId,storeId:metadata.storeId,deviceId:metadata.deviceId,deviceEpoch:metadata.deviceEpoch,localSequence:metadata.localSequence,actorId:metadata.actorId,policyVersion:metadata.policyVersion,kind:'draft.cancel',targetId:data.orderId,payload:{data,metadata,contractVersion:2,sessionSource},state:[{key:`draft-cancellation:${data.orderId}`,expectedRevision:null,value:{recordType:'draft-cancellation',schemaVersion:1,cancellation:event}}],ledger:[],audit:[{id:`draft-cancel-audit:${operationId}`,operationId,value:{action:'cancel',event,draft}}],outbox:{id:`draft-cancel-outbox:${operationId}`,operationId,value:{orderId:data.orderId}},result:{orderId:data.orderId,cancellation:event}};
}
/** Internal only: caller must enforce T-04 authorization. */
export function cancelStoredDraft(db:BerrieDatabase,input:CancelDraftInput,metadata:DraftMetadata,locks:LockProvider=navigator.locks,beforeCommit?:()=>void):Promise<unknown> {
 const data=copyInput(input) as CancelDraftInput,meta=copyInput(metadata) as DraftMetadata;canonical({data,metadata:meta});
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as {data:unknown;metadata:unknown};if(c.kind!=='draft.cancel' || canonical({data:p.data,metadata:p.metadata})!==canonical({data,metadata:meta})) throw new Error('Konflik operation ID');return prior.result;}
  validateCheckpoint(await checkpoint(db));
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Intent pembatalan tidak sah');
  const row=await db.state.get(`draft:${data.orderId}`);validateBusinessRecord(row?.value);
  if(!row || row.revision!==data.expectedRevision || !row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='draft') throw new Error('Draft atau revisi tidak sesuai');
  if((await Promise.all(['draft-cancellation','first-batch','settlement','payment','customer-job','refund-history'].map(prefix=>db.state.get(`${prefix}:${data.orderId}`)))).some(Boolean)) throw new Error('Draft tidak dapat dibatalkan');
  const draft=(row.value as Extract<BusinessRecord,{recordType:'draft'}>).draft;
  const session=await requireOrderSession(db,meta.storeId,draft.cashSessionId);
  return commit(makeDraftCancellationChange(draft,data,meta,session));
 },beforeCommit);
}
export async function readDraftCancellation(db:BerrieDatabase,orderId:string):Promise<DraftCancellation|undefined> {
 if(typeof orderId!=='string' || !orderId.trim()) throw new Error('ID tidak sah');
 const row=await db.state.get(`draft-cancellation:${orderId}`);if(!row)return undefined;validateBusinessRecord(row.value);
 const record=row.value as Extract<BusinessRecord,{recordType:'draft-cancellation'}>;if(record.recordType!=='draft-cancellation' || record.cancellation.orderId!==orderId) throw new Error('Pembatalan tidak sesuai');return record.cancellation;
}
/** Reads the retained snapshot and terminal event without making it resumable. */
export async function readCancelledDraft(db:BerrieDatabase,orderId:string):Promise<{draft:OrderDraft;revision:number;cancellation:DraftCancellation}|undefined> {
 if(typeof orderId!=='string' || !orderId.trim()) throw new Error('ID tidak sah');
 return db.transaction('r',db.state,async()=>{
  const cancellation=await readDraftCancellation(db,orderId);if(!cancellation)return undefined;
  const row=await db.state.get(`draft:${orderId}`);validateBusinessRecord(row?.value);
  if(!row || !row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='draft' || row.revision!==cancellation.draftRevision) throw new Error('Sumber pembatalan tidak sesuai');
  const draft=(row.value as Extract<BusinessRecord,{recordType:'draft'}>).draft;if(draft.orderId!==orderId) throw new Error('Identitas draft tidak sesuai');
  return {draft,revision:row.revision,cancellation};
 });
}
