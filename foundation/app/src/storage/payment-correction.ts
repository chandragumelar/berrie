import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { cashBalance, type CashSession } from '../domain/cash-session';
import { correctionDeltas, effectivePaymentMethod, validateMethodCorrection, type MethodCorrection, type Payment, type PaymentMethod } from '../domain/payment';
import { cashMovements } from './cash-sessions';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import type { StockMetadata } from './stock-groups';
import { validateCheckpoint } from './validate-checkpoint';

export interface CorrectPaymentMethodInput { orderId:string; expectedRevision:number|null; expectedSessionRevision:number; method:PaymentMethod; reason:string }
export const correctionKey=(orderId:string)=>`payment-corrections:${orderId}`;

/** Pure reconstruction is shared with checkpoint validation. */
export function makePaymentCorrectionChange(payment:Payment, session:CashSession, history:MethodCorrection[], data:CorrectPaymentMethodInput, meta:StockMetadata, before:number):AtomicChange {
 if(!data || Object.keys(data).sort().join(',')!=='expectedRevision,expectedSessionRevision,method,orderId,reason' || data.orderId!==payment.orderId || data.expectedRevision!==(history.length?history.length-1:null) || !Number.isSafeInteger(data.expectedSessionRevision) || data.expectedSessionRevision<0 || session.id!==payment.cashSessionId || session.storeId!==payment.storeId || meta.storeId!==payment.storeId || !Number.isSafeInteger(before) || before<0) throw new Error('Sumber koreksi tidak sah');
 const from=effectivePaymentMethod(payment,history);
 const correction:MethodCorrection={paymentId:payment.id,orderId:payment.orderId,storeId:payment.storeId,cashSessionId:payment.cashSessionId,from,to:data.method,amount:payment.amount,reason:data.reason,actorId:meta.actorId,recordedAt:meta.recordedAt};
 validateMethodCorrection(correction);
 const legs=correctionDeltas(correction),balance=before+legs.reduce((sum,leg)=>sum+(leg.method==='cash'?leg.delta:0),0);
 if(!Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak sah');
 const operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'payment.correct-method',targetId:payment.orderId,payload:{data,metadata:meta,contractVersion:1,paymentSource:{id:payment.id,revision:0},sessionSource:{id:session.id,revision:data.expectedSessionRevision}},state:[{key:correctionKey(payment.orderId),expectedRevision:data.expectedRevision,value:{recordType:'payment-corrections',schemaVersion:1,corrections:[...history,correction]}},{key:`cash-session:${session.id}`,expectedRevision:data.expectedSessionRevision,value:{recordType:'cash-session',schemaVersion:1,session}}],ledger:[{id:`correction-ledger:${operationId}`,operationId,value:{kind:'method-correction',sessionId:session.id,storeId:session.storeId,correction,legs}}],audit:[{id:`correction-audit:${operationId}`,operationId,value:{correction,actorId:meta.actorId,policyVersion:meta.policyVersion,before,after:balance}}],outbox:{id:`correction-outbox:${operationId}`,operationId,value:{orderId:payment.orderId,paymentId:payment.id}},result:{correction,revision:history.length,balance,sessionRevision:data.expectedSessionRevision+1}};
}
/** Internal only; T-04 must authorize actor, device, session and owner approval. */
export function correctPaymentMethod(db:BerrieDatabase,input:CorrectPaymentMethodInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CorrectPaymentMethodInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='payment.correct-method' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  if(!data || typeof data.orderId!=='string' || !data.orderId.trim()) throw new Error('Pesanan tidak sah');
  const paymentRow=await db.state.get(`payment:${data.orderId}`);validateBusinessRecord(paymentRow?.value);const record=paymentRow?.value as BusinessRecord;
  if(!paymentRow || paymentRow.revision!==0 || record?.recordType!=='payment' || record.payment.orderId!==data.orderId || record.payment.storeId!==meta.storeId) throw new Error('Payment asal tidak sah');
  const sessionRow=await db.state.get(`cash-session:${record.payment.cashSessionId}`);validateBusinessRecord(sessionRow?.value);const sessionRecord=sessionRow?.value as BusinessRecord;
  if(!sessionRow || sessionRow.revision!==data.expectedSessionRevision || sessionRecord?.recordType!=='cash-session' || sessionRecord.session.id!==record.payment.cashSessionId || sessionRecord.session.storeId!==meta.storeId) throw new Error('Sesi atau revisi tidak sesuai');
  const historyRow=await db.state.get(correctionKey(data.orderId));validateBusinessRecord(historyRow?.value);const h=historyRow?.value as BusinessRecord;
  if((historyRow?.revision ?? null)!==data.expectedRevision || (historyRow && h?.recordType!=='payment-corrections')) throw new Error('Revisi koreksi berubah');
  const history=h?.recordType==='payment-corrections'?h.corrections:[];
  const before=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),sessionRecord.session.id),sessionRecord.session);
  return commit(makePaymentCorrectionChange(record.payment,sessionRecord.session,history,data,meta,before));
 });
}
/** Internal only; access must also pass T-04. */
export async function readEffectivePayment(db:BerrieDatabase,storeId:string,orderId:string):Promise<{payment:Payment; method:PaymentMethod; corrections:MethodCorrection[]; revision:number|null}> {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
 const record=snapshot.state.find(r=>r.key===`payment:${orderId}`)?.value as BusinessRecord;
 if(record?.recordType!=='payment' || record.payment.storeId!==storeId || record.payment.orderId!==orderId) throw new Error('Payment tidak ditemukan');
 const row=snapshot.state.find(r=>r.key===correctionKey(orderId)),h=row?.value as BusinessRecord;
 if(row && h?.recordType!=='payment-corrections') throw new Error('Histori koreksi tidak sah');
 const corrections=h?.recordType==='payment-corrections'?h.corrections:[];
 return structuredClone({payment:record.payment,method:effectivePaymentMethod(record.payment,corrections),corrections,revision:row?.revision ?? null});
}
