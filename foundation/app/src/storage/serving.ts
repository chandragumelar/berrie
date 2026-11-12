import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { draftDateCode } from '../domain/draft';
import { validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { changeServing, initialServing, type ServingState } from '../domain/serving';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { requireOrderSession } from './order-session';
import type { StockMetadata } from './stock-groups';

export interface ServingInput { orderId:string; expectedRevision:number|null; unitIds:string[]; reason:string|null }
export type ServingAction='serve'|'correct';
export type SessionSource={id:string;revision:number};

/** Deterministic operation builder, also used to validate every historical receipt. */
export function makeServingChange(batch:FirstBatch, before:ServingState|null, data:ServingInput, meta:StockMetadata, action:ServingAction, sessionSource:SessionSource, refundSource?:{revision:number|null;unitIds:string[]}):AtomicChange {
 validateFirstBatch(batch);
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedRevision,orderId,reason,unitIds' || data.orderId!==batch.draft.orderId || (data.expectedRevision!==null && (!Number.isSafeInteger(data.expectedRevision) || data.expectedRevision<0)) || (before===null)!==(data.expectedRevision===null)) throw new Error('Intent penyajian tidak sah');
 if(action!=='serve' && action!=='correct') throw new Error('Aksi penyajian tidak sah');
 draftDateCode(meta.recordedAt,'UTC');
 const initial=initialServing(batch), previous=before ?? initial;
 if(previous.storeId!==initial.storeId || previous.orderId!==initial.orderId || previous.cashSessionId!==initial.cashSessionId || canonical(previous.units.map(x=>x.id))!==canonical(initial.units.map(x=>x.id)) || batch.storeId!==meta.storeId || sessionSource.id!==initial.cashSessionId || !Number.isSafeInteger(sessionSource.revision) || sessionSource.revision<0) throw new Error('Sumber penyajian tidak sesuai');
 if(refundSource && data.unitIds.some(id=>refundSource.unitIds.includes(id))) throw new Error('Unit sudah direfund');
 const next=changeServing(previous,data.unitIds,action,data.reason),operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:`serving.${action}`,targetId:data.orderId,payload:refundSource?{data,metadata:meta,contractVersion:2,sessionSource,refundRevision:refundSource.revision}:{data,metadata:meta,contractVersion:1,sessionSource},
  state:[{key:`serving:${data.orderId}`,expectedRevision:data.expectedRevision,value:{recordType:'serving',schemaVersion:previous.units.some(unit=>unit.status==='cancelled')?2:1,serving:next}}],ledger:[],
  audit:[{id:`serving-audit:${operationId}`,operationId,value:{action,orderId:data.orderId,unitIds:data.unitIds,reason:data.reason,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,before:previous,after:next}}],
  outbox:{id:`serving-outbox:${operationId}`,operationId,value:{orderId:data.orderId}},result:{orderId:data.orderId,revision:(data.expectedRevision ?? -1)+1,serving:next}};
}

/** Internal only: callers must obtain authorization separately through T-04. */
function save(db:BerrieDatabase,input:ServingInput,metadata:StockMetadata,action:ServingAction,locks:LockProvider=navigator.locks,beforeCommit?:()=>void):Promise<unknown> {
 const data=copyInput(input) as ServingInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange,p=change.payload as typeof intent;if(change.kind!==`serving.${action}` || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Pesanan tidak sah');
  const batchRow=await db.state.get(`first-batch:${data.orderId}`);validateBusinessRecord(batchRow?.value);
  const value=batchRow?.value as BusinessRecord;
  if(!batchRow || batchRow.revision!==0 || value?.recordType!=='first-batch' || value.batch.draft.orderId!==data.orderId || value.batch.storeId!==meta.storeId) throw new Error('Batch pertama tidak ditemukan atau toko berbeda');
  const sessionSource=await requireOrderSession(db,meta.storeId,value.batch.draft.cashSessionId);
  const row=await db.state.get(`serving:${data.orderId}`);
  if((row?.revision ?? null)!==data.expectedRevision) throw new Error('Revisi penyajian berubah');
  let before:ServingState|null=null;
  if(row) {validateBusinessRecord(row.value);const record=row.value as BusinessRecord;if(record?.recordType!=='serving') throw new Error('State penyajian tidak sah');before=record.serving;}
  const refundRow=await db.state.get(`served-refunds:${data.orderId}`);validateBusinessRecord(refundRow?.value);const refundRecord=refundRow?.value as BusinessRecord | undefined;
  if(refundRow && refundRecord?.recordType!=='served-refunds') throw new Error('Histori refund tidak sah');
  const refundSource={revision:refundRow?.revision ?? null,unitIds:refundRecord?.recordType==='served-refunds'?refundRecord.refunds.flatMap(r=>r.units.map(u=>u.id)):[]};
  return commit(makeServingChange(value.batch,before,data,meta,action,sessionSource,refundSource));
 },beforeCommit);
}
export function serveUnits(db:BerrieDatabase,data:ServingInput,metadata:StockMetadata,locks?:LockProvider,beforeCommit?:()=>void):Promise<unknown> {return save(db,data,metadata,'serve',locks,beforeCommit);}
export function correctServing(db:BerrieDatabase,data:ServingInput,metadata:StockMetadata,locks?:LockProvider):Promise<unknown> {return save(db,data,metadata,'correct',locks);}
export async function readServing(db:BerrieDatabase,storeId:string,orderId:string):Promise<{serving:ServingState;revision:number|null}> {
 return db.transaction('r',db.state,async()=>{
  const batchRow=await db.state.get(`first-batch:${orderId}`);validateBusinessRecord(batchRow?.value);const batch=batchRow?.value as BusinessRecord;
  if(!batchRow || batchRow.revision!==0 || batch?.recordType!=='first-batch' || batch.batch.storeId!==storeId || batch.batch.draft.orderId!==orderId) throw new Error('Batch pertama tidak ditemukan atau toko berbeda');
  const row=await db.state.get(`serving:${orderId}`);if(!row) return {serving:initialServing(batch.batch),revision:null};
  validateBusinessRecord(row.value);const record=row.value as BusinessRecord;if(record?.recordType!=='serving' || record.serving.storeId!==storeId || record.serving.orderId!==orderId) throw new Error('State penyajian tidak sah');
  return {serving:record.serving,revision:row.revision};
 });
}
