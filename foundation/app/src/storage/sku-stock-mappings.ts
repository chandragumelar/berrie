import { createSkuStockMappingRecord, validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { BerrieDatabase } from './database';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { StockMetadata } from './stock-groups';
type MappingRecord=Extract<BusinessRecord,{recordType:'sku-stock-mapping'}>;
export const mappingKey=(storeId:string,skuId:string)=>`sku-stock-mapping:${JSON.stringify([storeId,skuId])}`;
export function mappingRecord(value:unknown):MappingRecord {
 validateBusinessRecord(value);
 if(!value || typeof value!=='object' || !('recordType' in value) || value.recordType!=='sku-stock-mapping') throw new Error('Target bukan pemetaan');
 return value as MappingRecord;
}
/** Internal command; metadata does not establish authorization. */
export function registerSkuStockMapping(db:BerrieDatabase,input:unknown,metadata:StockMetadata,locks:LockProvider=navigator.locks,now:()=>string=()=>new Date().toISOString()):Promise<unknown> {
 const data=copyInput(input), meta=copyInput(metadata) as StockMetadata;
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Pemetaan tidak sah');
 const fields=data as Record<string,unknown>;
 if(Object.keys(fields).sort().join(',')!=='groupId,skuId') throw new Error('Pemetaan tidak sah');
 const record=createSkuStockMappingRecord({storeId:meta.storeId,skuId:fields.skuId,groupId:fields.groupId});
 if(typeof meta.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(meta.recordedAt) || !Number.isFinite(Date.parse(meta.recordedAt))) throw new Error('Waktu tidak sah');
 const intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange;if(change.kind!=='mapping.create' || canonical(change.payload)!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const m=record.mapping;
  if(await db.state.get(mappingKey(m.storeId,m.skuId))) throw new Error('SKU sudah dipetakan');
  const group=await db.state.get(`stock-group:${m.groupId}`);validateBusinessRecord(group?.value);
  if(!group?.value || typeof group.value!=='object' || !('recordType' in group.value) || group.value.recordType!=='stock-group' || !('stockGroup' in group.value) || (group.value.stockGroup as {storeId:string;groupId:string}).storeId!==m.storeId || (group.value.stockGroup as {groupId:string}).groupId!==m.groupId) throw new Error('Grup stok tidak ditemukan');
  const operationId=meta.operationId, recordedAt=now();
  const change:AtomicChange={operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'mapping.create',targetId:m.skuId,payload:intent,state:[{key:mappingKey(m.storeId,m.skuId),expectedRevision:null,value:record}],ledger:[],audit:[{id:`mapping-audit:${operationId}`,operationId,value:{mapping:m,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,recordedAt}}],outbox:{id:`mapping-outbox:${operationId}`,operationId,value:{skuId:m.skuId}},result:{mapping:m,revision:0}};
  return commit(change);
 });
}
export async function readSkuStockMapping(db:BerrieDatabase,storeId:string,skuId:string):Promise<{mapping:MappingRecord['mapping'];revision:number}|undefined> {
 createSkuStockMappingRecord({storeId,skuId,groupId:'validation'});
 const row=await db.state.get(mappingKey(storeId,skuId));if(!row)return undefined;
 const mapping=mappingRecord(row.value).mapping;if(mapping.storeId!==storeId || mapping.skuId!==skuId) throw new Error('Identitas pemetaan berbeda');return {mapping,revision:row.revision};
}
