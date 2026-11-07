import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { validateNoncashPayment, type NoncashPayment } from '../domain/payment';
import { freezeSettlement } from '../domain/settlement';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { ConfirmFirstBatchInput } from './confirm-first-batch';
import { BerrieDatabase } from './database';
import { requireOrderSession } from './order-session';
import { paymentMethodsKey } from './payment-methods';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { StockMetadata } from './stock-groups';

export interface NoncashDetails { expectedSessionRevision:number; expectedMethodsRevision:number; method:NoncashPayment['method']; verified:true; note?:string|null }
export interface ConfirmedNoncashInput extends NoncashDetails { orderId:string; expectedBatchRevision:number }
export interface DraftNoncashInput extends NoncashDetails, ConfirmFirstBatchInput {}
export interface SourceRevision { id:string; revision:number }
export function noncashBatchIntent(data:DraftNoncashInput):ConfirmFirstBatchInput { return {orderId:data.orderId,expectedDraftRevision:data.expectedDraftRevision,mappings:data.mappings,groups:data.groups}; }
export function makeConfirmedNoncashChange(batch:FirstBatch,data:ConfirmedNoncashInput,meta:StockMetadata,sessionSource:SourceRevision,methodsSource:SourceRevision):AtomicChange {
 validateFirstBatch(batch);
 if(!data || !['expectedBatchRevision,expectedMethodsRevision,expectedSessionRevision,method,note,orderId,verified','expectedBatchRevision,expectedMethodsRevision,expectedSessionRevision,method,orderId,verified'].includes(Object.keys(data).sort().join(',')) || data.orderId!==batch.draft.orderId || data.expectedBatchRevision!==0 || !Number.isSafeInteger(data.expectedSessionRevision) || data.expectedSessionRevision<0 || !Number.isSafeInteger(data.expectedMethodsRevision) || data.expectedMethodsRevision<0 || batch.storeId!==meta.storeId || sessionSource.id!==batch.draft.cashSessionId || sessionSource.revision!==data.expectedSessionRevision || methodsSource.id!==meta.storeId || methodsSource.revision!==data.expectedMethodsRevision) throw new Error('Sumber pembayaran tidak sah');
 const d=batch.draft,settlement=freezeSettlement(d.orderId,d.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo,identity:{choices:i.choices.map(c=>c.id),toppings:i.toppings.map(t=>t.id),serving:i.serving,note:i.note}})),d.discount,d.taxBp,d.serviceBp,'payment');
 const payment:NoncashPayment={id:`payment:${d.orderId}`,orderId:d.orderId,storeId:meta.storeId,cashSessionId:sessionSource.id,settlementId:`settlement:${d.orderId}`,paidAt:meta.recordedAt,method:data.method,amount:settlement.totals.total,verified:data.verified,note:data.note ?? null};validateNoncashPayment(payment);
 const operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'payment.confirmed-noncash',targetId:d.orderId,payload:{data,metadata:meta,contractVersion:2,sessionSource,methodsSource},state:[{key:payment.settlementId,expectedRevision:null,value:{recordType:'settlement',schemaVersion:1,settlement}},{key:payment.id,expectedRevision:null,value:{recordType:'payment',schemaVersion:2,payment}},{key:`customer-job:${d.orderId}`,expectedRevision:null,value:{recordType:'customer-job',schemaVersion:3,payment,settlement,batch}}],ledger:[],audit:[{id:`noncash-audit:${operationId}`,operationId,value:{payment,settlement,sessionSource,methodsSource,actorId:meta.actorId,policyVersion:meta.policyVersion}}],outbox:{id:`noncash-outbox:${operationId}`,operationId,value:{orderId:d.orderId,paymentId:payment.id}},result:{orderId:d.orderId,payment,settlement}};
}
export function combineDraftNoncashChange(batch:AtomicChange,payment:AtomicChange,data:DraftNoncashInput):AtomicChange {
 return {...batch,kind:'payment.draft-noncash',payload:{...(batch.payload as object),data,methodsSource:(payment.payload as {methodsSource:SourceRevision}).methodsSource},state:[...batch.state,...payment.state],ledger:batch.ledger,audit:[...batch.audit,...payment.audit],outbox:{id:`draft-noncash-outbox:${batch.operationId}`,operationId:batch.operationId,value:{orderId:data.orderId,paymentId:`payment:${data.orderId}`}},result:{...(payment.result as object),batchNumber:1}};
}
export function draftNoncashBatchPart(change:AtomicChange):AtomicChange {
 const p=change.payload as {data:DraftNoncashInput;metadata:unknown;contractVersion:number;sessionSource:unknown};
 return {...change,kind:'batch.confirm-first',payload:{data:noncashBatchIntent(p.data),metadata:p.metadata,contractVersion:p.contractVersion,sessionSource:p.sessionSource},state:change.state.filter(s=>s.key.startsWith('first-batch:') || s.key.startsWith('kitchen-job:') || s.key.startsWith('stock-group:')),ledger:change.ledger,audit:change.audit.slice(0,1),outbox:{id:`batch-outbox:${change.operationId}`,operationId:change.operationId,value:{orderId:change.targetId}},result:{orderId:change.targetId,batchNumber:1}};
}
export async function requireMethods(db:BerrieDatabase,storeId:string,data:NoncashDetails):Promise<SourceRevision> {
 const row=await db.state.get(paymentMethodsKey(storeId));validateBusinessRecord(row?.value);const record=row?.value as BusinessRecord;
 if(!row || row.revision!==data.expectedMethodsRevision || record?.recordType!=='payment-methods' || record.methods.storeId!==storeId || !['qris','transfer','ewallet'].includes(data.method) || record.methods[data.method]!==true) throw new Error('Metode tidak aktif atau revisi berubah');
 return {id:storeId,revision:row.revision};
}
/** Internal only; T-04 must authorize actor, device and session. */
export function payConfirmedFirstBatchNoncash(db:BerrieDatabase,input:ConfirmedNoncashInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ConfirmedNoncashInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='payment.confirmed-noncash' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  validateCheckpoint(await checkpoint(db));
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Pesanan tidak sah');
  if(await db.state.get(`unpaid-cancellation:${data.orderId}`)) throw new Error('Batch sudah dibatalkan');
  if(await db.state.get(`settlement:${data.orderId}`) || await db.state.get(`payment:${data.orderId}`) || await db.state.get(`customer-job:${data.orderId}`)) throw new Error('Pesanan sudah dibayar');
  const row=await db.state.get(`first-batch:${data.orderId}`);validateBusinessRecord(row?.value);const record=row?.value as BusinessRecord;
  if(!row || row.revision!==data.expectedBatchRevision || record?.recordType!=='first-batch' || record.batch.storeId!==meta.storeId || record.batch.draft.orderId!==data.orderId) throw new Error('Batch atau revisi tidak sesuai');
  const sessionSource=await requireOrderSession(db,meta.storeId,record.batch.draft.cashSessionId);if(sessionSource.revision!==data.expectedSessionRevision) throw new Error('Revisi sesi berubah');
  const methodsSource=await requireMethods(db,meta.storeId,data);
  return commit(makeConfirmedNoncashChange(record.batch,data,meta,sessionSource,methodsSource));
 });
}
