import { validatePaymentMethods, type PaymentMethods } from '../domain/payment-methods';
import { validateBusinessRecord } from '../domain/business-record';
import { draftDateCode } from '../domain/draft';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import type { StockMetadata } from './stock-groups';

export interface PaymentMethodsInput { expectedRevision:number|null; qris:boolean; transfer:boolean; ewallet:boolean }
export function paymentMethodsKey(storeId:string):string { return `payment-methods:${storeId}`; }
export function makePaymentMethodsChange(data:PaymentMethodsInput, meta:StockMetadata, before:PaymentMethods|null):AtomicChange {
 if(!data || Object.keys(data).sort().join(',')!=='ewallet,expectedRevision,qris,transfer' || (data.expectedRevision!==null && (!Number.isSafeInteger(data.expectedRevision) || data.expectedRevision<0)) || (before===null)!==(data.expectedRevision===null)) throw new Error('Revisi metode tidak sah');
 const methods={storeId:meta.storeId,qris:data.qris,transfer:data.transfer,ewallet:data.ewallet};validatePaymentMethods(methods);
 if(before) {validatePaymentMethods(before);if(before.storeId!==meta.storeId) throw new Error('Toko berbeda');}
 draftDateCode(meta.recordedAt,'UTC');
 const operationId=meta.operationId,revision=(data.expectedRevision ?? -1)+1;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'payment-methods.set',targetId:meta.storeId,payload:{data,metadata:meta},state:[{key:paymentMethodsKey(meta.storeId),expectedRevision:data.expectedRevision,value:{recordType:'payment-methods',schemaVersion:1,methods}}],ledger:[],audit:[{id:`payment-methods-audit:${operationId}`,operationId,value:{before,after:methods,actorId:meta.actorId,policyVersion:meta.policyVersion,recordedAt:meta.recordedAt}}],outbox:{id:`payment-methods-outbox:${operationId}`,operationId,value:{storeId:meta.storeId}},result:{methods,revision}};
}
/** Internal only; T-04 must authorize owner and device before integration. */
export function setPaymentMethods(db:BerrieDatabase,input:PaymentMethodsInput,metadata:StockMetadata,locks:LockProvider=navigator.locks,guard?:()=>void):Promise<unknown> {
 const data=copyInput(input) as PaymentMethodsInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange;if(c.kind!=='payment-methods.set' || canonical(c.payload)!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const row=await db.state.get(paymentMethodsKey(meta.storeId));
  if((row?.revision ?? null)!==data.expectedRevision) throw new Error('Revisi metode berubah');
  let before:PaymentMethods|null=null;
  if(row) {validateBusinessRecord(row.value);const v=row.value as {recordType?:unknown;methods?:unknown};if(v?.recordType!=='payment-methods') throw new Error('Record metode tidak sah');validatePaymentMethods(v.methods);before=v.methods;}
  return commit(makePaymentMethodsChange(data,meta,before));
 },guard);
}
export async function readPaymentMethods(db:BerrieDatabase,storeId:string):Promise<{methods:PaymentMethods;revision:number|null}> {
 if(typeof storeId!=='string' || !storeId.trim() || storeId.length>200) throw new Error('Toko tidak sah');
 const row=await db.state.get(paymentMethodsKey(storeId));
 if(!row) return {methods:{storeId,qris:false,transfer:false,ewallet:false},revision:null};
 validateBusinessRecord(row.value);const v=row.value as {recordType?:unknown;methods?:unknown};if(v?.recordType!=='payment-methods') throw new Error('Record metode tidak sah');validatePaymentMethods(v.methods);if(v.methods.storeId!==storeId) throw new Error('Toko berbeda');return {methods:v.methods,revision:row.revision};
}
