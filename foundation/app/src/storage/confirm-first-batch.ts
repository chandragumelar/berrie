import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { planFirstBatch, snapshotBatchDraft, validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { mappingKey, mappingRecord } from './sku-stock-mappings';
import type { StockMetadata } from './stock-groups';
import { requireOrderSession } from './order-session';

export interface ConfirmFirstBatchInput {
 orderId:string;
 expectedDraftRevision:number;
 mappings:{skuId:string;groupId:string;revision:number}[];
 groups:{groupId:string;balance:number;revision:number}[];
}

/** Internal only. Identity and policy metadata do not authorize this operation. */
export function confirmFirstBatch(db:BerrieDatabase, input:ConfirmFirstBatchInput, metadata:StockMetadata, locks:LockProvider=navigator.locks, now:()=>string=()=>new Date().toISOString()):Promise<unknown> {
 const data=copyInput(input) as ConfirmFirstBatchInput, meta=copyInput(metadata) as StockMetadata;
 const intent={data,metadata:meta};canonical(intent);
 if(!data || typeof data.orderId!=='string' || !data.orderId.trim() || !Number.isSafeInteger(data.expectedDraftRevision) || data.expectedDraftRevision<0 || !Array.isArray(data.mappings) || !Array.isArray(data.groups)) throw new Error('Intent batch tidak sah');
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange;const payload=change.payload as typeof intent;if(change.kind!=='batch.confirm-first' || canonical({data:payload.data,metadata:payload.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(await db.state.get(`first-batch:${data.orderId}`)) throw new Error('Draft sudah dikonfirmasi');
  const row=await db.state.get(`draft:${data.orderId}`);validateBusinessRecord(row?.value);
  if(!row || row.revision!==data.expectedDraftRevision || !row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='draft') throw new Error('Draft atau revisi tidak sesuai');
  const draft=(row.value as Extract<BusinessRecord,{recordType:'draft'}>).draft;
  const sessionSource=await requireOrderSession(db,meta.storeId,draft.cashSessionId);
  const history=(await db.receipts.toArray()).map(r=>JSON.parse(r.payload) as AtomicChange).filter(c=>c.state.some(s=>s.key===`draft:${data.orderId}`));
  if(draft.orderId!==data.orderId || !history.length || history.some(c=>c.storeId!==meta.storeId) || !history.some(c=>c.state.some(s=>s.key===`draft:${data.orderId}` && (s.expectedRevision ?? -1)+1===row.revision && canonical(s.value)===canonical(row.value)))) throw new Error('Histori atau toko draft berbeda');
  const skus=[...new Set(draft.items.map(item=>item.skuId))].sort();
  if(data.mappings.length!==skus.length || new Set(data.mappings.map(m=>m.skuId)).size!==skus.length) throw new Error('Pemetaan tidak lengkap');
  const mappings:FirstBatch['skuGroups']=[];
  for(const skuId of skus) {
   const expected=data.mappings.find(m=>m.skuId===skuId), source=await db.state.get(mappingKey(meta.storeId,skuId));
   if(!expected || !source || source.revision!==expected.revision || source.revision!==0) throw new Error('Pemetaan berubah');
   const mapping=mappingRecord(source.value).mapping;
   if(mapping.storeId!==meta.storeId || mapping.skuId!==skuId || mapping.groupId!==expected.groupId) throw new Error('Pemetaan berbeda');
   mappings.push({skuId,groupId:mapping.groupId});
  }
  const groupIds=[...new Set(mappings.map(m=>m.groupId))].sort();
  if(data.groups.length!==groupIds.length || new Set(data.groups.map(g=>g.groupId)).size!==groupIds.length) throw new Error('Grup tidak lengkap');
  const groups=[] as {row:{key:string;revision:number};stock:Extract<BusinessRecord,{recordType:'stock-group'}>['stockGroup']}[];
  for(const id of groupIds) {
   const expected=data.groups.find(g=>g.groupId===id), source=await db.state.get(`stock-group:${id}`);validateBusinessRecord(source?.value);
   if(!expected || !source || source.revision!==expected.revision || !source.value || typeof source.value!=='object' || !('recordType' in source.value) || source.value.recordType!=='stock-group') throw new Error('Grup atau revisi berubah');
   const stock=(source.value as Extract<BusinessRecord,{recordType:'stock-group'}>).stockGroup;
   if(stock.storeId!==meta.storeId || stock.groupId!==id || stock.balance!==expected.balance) throw new Error('Saldo atau toko berubah');
   groups.push({row:source,stock});
  }
  const batch:FirstBatch={storeId:meta.storeId,number:1,confirmedAt:now(),draft:snapshotBatchDraft(draft),skuGroups:mappings};validateFirstBatch(batch);
  const plan=planFirstBatch(batch,groups.map(({stock})=>({groupId:stock.groupId,balance:stock.balance})));
  if(!plan.ok) throw new Error('Stok tidak cukup');
  const operationId=meta.operationId;
  const change:AtomicChange={operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'batch.confirm-first',targetId:data.orderId,payload:{...intent,contractVersion:2,sessionSource},
   state:[{key:`first-batch:${data.orderId}`,expectedRevision:null,value:{recordType:'first-batch',schemaVersion:2,batch}},{key:`kitchen-job:${data.orderId}`,expectedRevision:null,value:{recordType:'kitchen-job',schemaVersion:2,batch}},...groups.map(({row,stock})=>({key:row.key,expectedRevision:row.revision,value:{recordType:'stock-group',schemaVersion:1,stockGroup:{...stock,balance:plan.debits.find(d=>d.groupId===stock.groupId)!.after}}}))],
   ledger:plan.debits.map(debit=>({id:`batch-debit:${operationId}:${debit.groupId}`,operationId,value:{storeId:meta.storeId,orderId:data.orderId,...debit}})),
   audit:[{id:`batch-audit:${operationId}`,operationId,value:{batch,actorId:meta.actorId,policyVersion:meta.policyVersion}}],outbox:{id:`batch-outbox:${operationId}`,operationId,value:{orderId:data.orderId}},result:{orderId:data.orderId,batchNumber:1}};
  return commit(change);
 });
}
