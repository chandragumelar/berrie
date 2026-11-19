import type { OrderDraft } from '../domain/draft';
import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateOrderAdditions, type AdditionalBatch, type OrderAdditions } from '../domain/order-additions';
import type { BerrieDatabase } from './database';

export const additionsKey=(orderId:string)=>`order-additions:${orderId}`;
export const additionalBatchKey=(orderId:string,number:number)=>`order-batch:${orderId}:${number}`;
export const additionalKitchenJobKey=(orderId:string,number:number)=>`kitchen-job:${orderId}:${number}`;

export interface AdditionSources { first:OrderDraft; additions:OrderAdditions; additionsRevision:number|null; batches:AdditionalBatch[] }

/**
 * Reads the ordered billing/serving source without manufacturing a first
 * batch.  This is deliberately read-only so old order records keep their
 * exact historical meaning.
 */
export async function readAdditionSources(db:BerrieDatabase,storeId:string,orderId:string):Promise<AdditionSources> {
  return db.transaction('r',db.state,async()=>{
    const firstRow=await db.state.get(`first-batch:${orderId}`);validateBusinessRecord(firstRow?.value);
    const firstRecord=firstRow?.value as BusinessRecord|undefined;
    if(firstRecord?.recordType!=='first-batch'||firstRecord.batch.storeId!==storeId||firstRecord.batch.draft.orderId!==orderId) throw new Error('Batch pertama tidak ditemukan');
    const headRow=await db.state.get(additionsKey(orderId));validateBusinessRecord(headRow?.value);
    const headRecord=headRow?.value as BusinessRecord|undefined;
    if(headRow && headRecord?.recordType!=='order-additions') throw new Error('Head tambahan tidak sah');
    const additions:OrderAdditions=headRecord?.recordType==='order-additions'?headRecord.additions:{storeId,orderId,cashSessionId:firstRecord.batch.draft.cashSessionId,batchCount:1,pending:[]};
    if(additions.storeId!==storeId||additions.orderId!==orderId||additions.cashSessionId!==firstRecord.batch.draft.cashSessionId) throw new Error('Head tambahan tidak sesuai');
    const batches:AdditionalBatch[]=[];
    for(let number=2;number<=additions.batchCount;number++){
      const row=await db.state.get(additionalBatchKey(orderId,number));validateBusinessRecord(row?.value);
      const record=row?.value as BusinessRecord|undefined;
      if(record?.recordType!=='order-batch'||record.batch.number!==number||record.batch.storeId!==storeId||record.batch.orderId!==orderId||record.batch.cashSessionId!==additions.cashSessionId) throw new Error('Sumber batch tambahan tidak lengkap');
      batches.push(structuredClone(record.batch));
    }
    const rows=await db.state.where('key').startsWith(`order-batch:${orderId}:`).toArray();
    if(rows.length!==batches.length) throw new Error('Batch tambahan asing');
    const allUnits=[...firstRecord.batch.draft.items.flatMap(item=>item.unitIds),...batches.flatMap(batch=>batch.draft.items.flatMap(item=>item.unitIds)),...additions.pending.flatMap(item=>item.unitIds)];
    if(new Set(allUnits).size!==allUnits.length) throw new Error('Unit pesanan dipakai ulang');
    return {first:structuredClone(firstRecord.batch.draft),additions:structuredClone(additions),additionsRevision:headRow?.revision??null,batches};
  });
}

export function additionDraft(base:OrderDraft,head:OrderAdditions):OrderDraft {
  validateOrderAdditions(head);
  if(base.orderId!==head.orderId||base.cashSessionId!==head.cashSessionId) throw new Error('Sumber draft tambahan tidak sesuai');
  return {...structuredClone(base),items:structuredClone(head.pending)};
}
