import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { validateCashPayment, type CashPayment } from '../domain/payment';
import { freezeSettlement } from '../domain/settlement';
import { cashBalance, type CashSession } from '../domain/cash-session';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { cashMovements } from './cash-sessions';
import type { StockMetadata } from './stock-groups';

export interface ConfirmedCashPaymentInput { orderId:string; expectedBatchRevision:number; expectedSessionRevision:number; received:number }

/** Build the immutable records solely from the confirmed batch and explicit intent. */
export function makeConfirmedCashPaymentChange(batch:FirstBatch,session:CashSession,data:ConfirmedCashPaymentInput,meta:StockMetadata,before:number):AtomicChange {
 validateFirstBatch(batch);
 if(!data || Object.keys(data).sort().join(',')!=='expectedBatchRevision,expectedSessionRevision,orderId,received' || data.orderId!==batch.draft.orderId || data.expectedBatchRevision!==0 || !Number.isSafeInteger(data.expectedSessionRevision) || data.expectedSessionRevision<0 || batch.storeId!==meta.storeId || session.storeId!==meta.storeId || session.id!==batch.draft.cashSessionId) throw new Error('Sumber pembayaran tidak sah');
 const d=batch.draft;
 const settlement=freezeSettlement(d.orderId,d.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo,identity:{choices:i.choices.map(c=>c.id),toppings:i.toppings.map(t=>t.id),serving:i.serving,note:i.note}})),d.discount,d.taxBp,d.serviceBp,'payment');
 const payment:CashPayment={id:`payment:${d.orderId}`,orderId:d.orderId,storeId:meta.storeId,cashSessionId:session.id,settlementId:`settlement:${d.orderId}`,paidAt:meta.recordedAt,method:'cash',amount:settlement.totals.total,received:data.received,change:data.received-settlement.totals.total};
 validateCashPayment(payment);
 const balance=before+payment.amount;if(!Number.isSafeInteger(before) || before<0 || !Number.isSafeInteger(balance)) throw new Error('Saldo kas tidak sah');
 const operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'payment.confirmed-cash',targetId:d.orderId,payload:{data,metadata:meta,contractVersion:1},
  state:[{key:`cash-session:${session.id}`,expectedRevision:data.expectedSessionRevision,value:{recordType:'cash-session',schemaVersion:1,session}},{key:payment.settlementId,expectedRevision:null,value:{recordType:'settlement',schemaVersion:1,settlement}},{key:payment.id,expectedRevision:null,value:{recordType:'payment',schemaVersion:1,payment}},{key:`customer-job:${d.orderId}`,expectedRevision:null,value:{recordType:'customer-job',schemaVersion:1,payment,settlement,batch}}],
  ledger:[{id:`payment-ledger:${operationId}`,operationId,value:{kind:'sale',sessionId:session.id,storeId:meta.storeId,amount:payment.amount,category:'',description:''}}],
  audit:[{id:`payment-audit:${operationId}`,operationId,value:{payment,settlement,actorId:meta.actorId,policyVersion:meta.policyVersion,before,after:balance}}],outbox:{id:`payment-outbox:${operationId}`,operationId,value:{orderId:d.orderId,paymentId:payment.id}},result:{orderId:d.orderId,payment,settlement,balance,sessionRevision:data.expectedSessionRevision+1}};
}

/** Internal only. T-04 must authorize the actor, device, session and operation. */
export function payConfirmedFirstBatchCash(db:BerrieDatabase,input:ConfirmedCashPaymentInput,metadata:StockMetadata,locks:LockProvider=navigator.locks,beforeCommit?:()=>void):Promise<unknown> {
 const data=copyInput(input) as ConfirmedCashPaymentInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='payment.confirmed-cash' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Pesanan tidak sah');
  if(await db.state.get(`unpaid-cancellation:${data.orderId}`)) throw new Error('Batch sudah dibatalkan');
  if(await db.state.get(`settlement:${data.orderId}`) || await db.state.get(`payment:${data.orderId}`) || await db.state.get(`customer-job:${data.orderId}`)) throw new Error('Pesanan sudah dibayar');
  const row=await db.state.get(`first-batch:${data.orderId}`);validateBusinessRecord(row?.value);const record=row?.value as BusinessRecord;
  if(!row || row.revision!==data.expectedBatchRevision || record?.recordType!=='first-batch' || record.batch.storeId!==meta.storeId || record.batch.draft.orderId!==data.orderId) throw new Error('Batch atau revisi tidak sesuai');
  const sessionRow=await db.state.get(`cash-session:${record.batch.draft.cashSessionId}`);validateBusinessRecord(sessionRow?.value);const sessionRecord=sessionRow?.value as BusinessRecord;
  if(!sessionRow || sessionRow.revision!==data.expectedSessionRevision || sessionRecord?.recordType!=='cash-session' || sessionRecord.session.storeId!==meta.storeId || sessionRecord.session.id!==record.batch.draft.cashSessionId) throw new Error('Sesi atau revisi tidak sesuai');
  const before=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),sessionRecord.session.id),sessionRecord.session);
  return commit(makeConfirmedCashPaymentChange(record.batch,sessionRecord.session,data,meta,before));
 },beforeCommit);
}
