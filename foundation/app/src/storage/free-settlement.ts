import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { draftDateCode } from '../domain/draft';
import { freezeSettlement } from '../domain/settlement';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { ConfirmFirstBatchInput } from './confirm-first-batch';
import { BerrieDatabase } from './database';
import { requireOrderSession } from './order-session';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { StockMetadata } from './stock-groups';

export interface ConfirmedFreeInput { orderId:string; expectedBatchRevision:number; expectedSessionRevision:number; reason:string }
export interface DraftFreeInput extends ConfirmFirstBatchInput { expectedSessionRevision:number; reason:string }
export interface FreeSessionSource { id:string; revision:number }

export function validateFreeReason(reason:unknown):asserts reason is string {
 if(typeof reason!=='string' || !reason.trim() || reason.length>500) throw new Error('Alasan gratis tidak sah');
}
export function freeBatchIntent(data:DraftFreeInput):ConfirmFirstBatchInput {
 return {orderId:data.orderId,expectedDraftRevision:data.expectedDraftRevision,mappings:data.mappings,groups:data.groups};
}
/** The free settlement has no Payment, cash movement, or session mutation. */
export function makeConfirmedFreeChange(batch:FirstBatch, data:ConfirmedFreeInput, meta:StockMetadata, sessionSource:FreeSessionSource):AtomicChange {
 validateFirstBatch(batch);validateFreeReason(data?.reason);
 if(!data || Object.keys(data).sort().join(',')!=='expectedBatchRevision,expectedSessionRevision,orderId,reason' || data.orderId!==batch.draft.orderId || data.expectedBatchRevision!==0 || !Number.isSafeInteger(data.expectedSessionRevision) || data.expectedSessionRevision<0 || batch.storeId!==meta.storeId || sessionSource.id!==batch.draft.cashSessionId || sessionSource.revision!==data.expectedSessionRevision) throw new Error('Sumber gratis tidak sah');
 draftDateCode(meta.recordedAt,'UTC');
 const d=batch.draft;
 const settlement=freezeSettlement(d.orderId,d.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo,identity:{choices:i.choices.map(c=>c.id),toppings:i.toppings.map(t=>t.id),serving:i.serving,note:i.note}})),d.discount,d.taxBp,d.serviceBp,'free');
 const operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'settlement.confirmed-free',targetId:d.orderId,payload:{data,metadata:meta,contractVersion:2,sessionSource},
  state:[{key:`settlement:${d.orderId}`,expectedRevision:null,value:{recordType:'settlement',schemaVersion:1,settlement}},{key:`customer-job:${d.orderId}`,expectedRevision:null,value:{recordType:'customer-job',schemaVersion:2,settlement,batch,reason:data.reason}}],ledger:[],
  audit:[{id:`free-audit:${operationId}`,operationId,value:{orderId:d.orderId,sessionSource,batch,settlement,reason:data.reason,actorId:meta.actorId,policyVersion:meta.policyVersion,recordedAt:meta.recordedAt}}],outbox:{id:`free-outbox:${operationId}`,operationId,value:{orderId:d.orderId}},result:{orderId:d.orderId,settlement}};
}
export function combineDraftFreeChange(batch:AtomicChange, free:AtomicChange, data:DraftFreeInput):AtomicChange {
 return {...batch,kind:'settlement.draft-free',payload:{...(batch.payload as object),data},state:[...batch.state,...free.state],ledger:batch.ledger,audit:[...batch.audit,...free.audit],outbox:{id:`draft-free-outbox:${batch.operationId}`,operationId:batch.operationId,value:{orderId:data.orderId}},result:{...(free.result as object),batchNumber:1}};
}
export function draftFreeBatchPart(change:AtomicChange):AtomicChange {
 const p=change.payload as {data:DraftFreeInput;metadata:unknown;contractVersion:number;sessionSource:unknown};
 return {...change,kind:'batch.confirm-first',payload:{...p,data:freeBatchIntent(p.data)},state:change.state.filter(s=>s.key.startsWith('first-batch:') || s.key.startsWith('kitchen-job:') || s.key.startsWith('stock-group:')),ledger:change.ledger,audit:change.audit.slice(0,1),outbox:{id:`batch-outbox:${change.operationId}`,operationId:change.operationId,value:{orderId:change.targetId}},result:{orderId:change.targetId,batchNumber:1}};
}
/** Internal only. T-04 must authorize the actor, device, session and owner approval. */
export function settleConfirmedFirstBatchFree(db:BerrieDatabase,input:ConfirmedFreeInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ConfirmedFreeInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='settlement.confirmed-free' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  validateCheckpoint(await checkpoint(db));
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Pesanan tidak sah');
  if(await db.state.get(`unpaid-cancellation:${data.orderId}`)) throw new Error('Batch sudah dibatalkan');
  if(await db.state.get(`settlement:${data.orderId}`) || await db.state.get(`payment:${data.orderId}`) || await db.state.get(`customer-job:${data.orderId}`)) throw new Error('Pesanan sudah dibayar');
  const row=await db.state.get(`first-batch:${data.orderId}`);validateBusinessRecord(row?.value);const record=row?.value as BusinessRecord;
  if(!row || row.revision!==data.expectedBatchRevision || record?.recordType!=='first-batch' || record.batch.storeId!==meta.storeId || record.batch.draft.orderId!==data.orderId) throw new Error('Batch atau revisi tidak sesuai');
  const sessionSource=await requireOrderSession(db,meta.storeId,record.batch.draft.cashSessionId);
  if(sessionSource.revision!==data.expectedSessionRevision) throw new Error('Revisi sesi berubah');
  return commit(makeConfirmedFreeChange(record.batch,data,meta,sessionSource));
 });
}
