import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { planPaidCancellation, validatePaidCancellationEvent, paidRefundDue, type PaidCancellationEvent } from '../domain/paid-cancellation';
import { initialServing, type ServingState } from '../domain/serving';
import type { FirstBatch } from '../domain/first-batch';
import type { Payment } from '../domain/payment';
import type { SettlementSnapshot } from '../domain/settlement';
import type { ServedRefundEvent, RefundSelection } from '../domain/served-refund';
import type { CashSession } from '../domain/cash-session';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { StockMetadata } from './stock-groups';
import { refundKey, returnKey, returnEffects, type ReturnOption } from './served-refunds';
import type { StockReturnEvent } from '../domain/served-refund';
import type { StockGroup } from '../domain/stock-group';

export const cancellationKey=(orderId:string)=>`paid-cancellations:${orderId}`;
export interface CancelPaidInput {
 orderId:string; expectedServingRevision:number|null; expectedCancellationRevision:number|null;
 expectedRefundRevision:number|null; expectedSessionRevision:number; selection:RefundSelection[];
 reason:string; kitchenConfirmed:true; returnStock:ReturnOption|null;
}
export interface CancellationSources {
 batch:FirstBatch; payment:Payment; settlement:SettlementSnapshot; serving:ServingState|null;
 session:CashSession; cancellations:PaidCancellationEvent[]; refunds:ServedRefundEvent[]; returns:StockReturnEvent[]; groups:StockGroup[];
}
const validRevision=(n:unknown,nullable=false)=>nullable && n===null || typeof n==='number' && Number.isSafeInteger(n) && n>=0 && n<Number.MAX_SAFE_INTEGER;
const text=(v:unknown,max=200)=>typeof v==='string' && !!v.trim() && v.length<=max;
export function makePaidCancellationChange(s:CancellationSources,data:CancelPaidInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedCancellationRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock,selection' || !text(data.orderId) || !text(data.reason,500) || data.kitchenConfirmed!==true || !validRevision(data.expectedServingRevision,true) || !validRevision(data.expectedCancellationRevision,true) || !validRevision(data.expectedRefundRevision,true) || !validRevision(data.expectedSessionRevision)) throw new Error('Intent pembatalan tidak sah');
 if(!s || !Array.isArray(s.cancellations) || !Array.isArray(s.refunds) || data.expectedCancellationRevision!==(s.cancellations.length?s.cancellations.length-1:null) || data.expectedRefundRevision!==(s.refunds.length?s.refunds.length-1:null) || (s.serving===null)!==(data.expectedServingRevision===null) || s.batch.storeId!==meta.storeId || s.session.storeId!==meta.storeId || s.session.id!==s.payment.cashSessionId || s.payment.orderId!==data.orderId) throw new Error('Sumber pembatalan tidak sah');
 for(const event of s.cancellations) {validatePaidCancellationEvent(event);if(event.orderId!==data.orderId || event.paymentId!==s.payment.id || event.storeId!==meta.storeId || event.cashSessionId!==s.session.id) throw new Error('Histori pembatalan asing');}
 const serving=s.serving ?? initialServing(s.batch),refundHistory=s.refunds.map(r=>({unitIds:r.units.map(u=>u.id),amount:r.amount,source:'payment' as const}));
 const plan=planPaidCancellation(s.batch,s.payment,s.settlement,serving,refundHistory,s.cancellations.flatMap(c=>c.units.map(u=>u.id)),data.selection);
 const event:PaidCancellationEvent={id:`cancel:${meta.operationId}`,paymentId:s.payment.id,orderId:data.orderId,storeId:meta.storeId,cashSessionId:s.session.id,units:plan.units,reason:data.reason,kitchenConfirmed:true,actorId:meta.actorId,recordedAt:meta.recordedAt};validatePaidCancellationEvent(event);
 const selected=new Set(plan.units.map(unit=>unit.id));
 const next={...serving,units:serving.units.map(unit=>selected.has(unit.id)?{...unit,status:'cancelled' as const}:unit)};
 const cancellations=[...s.cancellations,event],due=paidRefundDue(cancellations,refundHistory),operationId=meta.operationId;
 const ret=data.returnStock===null?null:returnEffects(s,event,event.units.map(u=>u.id),data.returnStock,meta);
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'cancellation.paid',targetId:data.orderId,payload:{data,metadata:meta,contractVersion:1},state:[{key:cancellationKey(data.orderId),expectedRevision:data.expectedCancellationRevision,value:{recordType:'paid-cancellations',schemaVersion:1,cancellations}},{key:`serving:${data.orderId}`,expectedRevision:data.expectedServingRevision,value:{recordType:'serving',schemaVersion:2,serving:next}},...(ret?[{key:returnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:2,returns:[...s.returns,ret.event]}},...ret.state]:[])],ledger:ret?.ledger ?? [],audit:[{id:`cancellation-audit:${operationId}`,operationId,value:{cancellation:event,stockReturn:ret?.event ?? null,before:serving,after:next,refundDue:due,policyVersion:meta.policyVersion}}],outbox:{id:`cancellation-outbox:${operationId}`,operationId,value:{orderId:data.orderId,paymentId:s.payment.id}},result:{cancellation:event,stockReturn:ret?.event ?? null,serving:next,refundDue:due,cancellationRevision:s.cancellations.length,servingRevision:(data.expectedServingRevision ?? -1)+1}};
}
function get(snapshot:Awaited<ReturnType<typeof checkpoint>>,key:string,type:BusinessRecord['recordType'],revision:number|null):BusinessRecord|undefined {
 const row=snapshot.state.find(r=>r.key===key);if((row?.revision ?? null)!==revision) throw new Error(`Revisi ${key} berubah`);if(!row)return;
 validateBusinessRecord(row.value);const value=row.value as BusinessRecord;if(value?.recordType!==type) throw new Error(`Sumber ${key} tidak sah`);return value;
}
export function cancelPaidUnits(db:BerrieDatabase,input:CancelPaidInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CancelPaidInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange,p=change.payload as typeof intent;if(change.kind!=='cancellation.paid' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId)) throw new Error('Pesanan tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const batch=get(snapshot,`first-batch:${data.orderId}`,'first-batch',0),payment=get(snapshot,`payment:${data.orderId}`,'payment',0),settlement=get(snapshot,`settlement:${data.orderId}`,'settlement',0);
  if(batch?.recordType!=='first-batch' || payment?.recordType!=='payment' || settlement?.recordType!=='settlement') throw new Error('Sumber payment tidak ditemukan');
  const serving=get(snapshot,`serving:${data.orderId}`,'serving',data.expectedServingRevision),session=get(snapshot,`cash-session:${payment.payment.cashSessionId}`,'cash-session',data.expectedSessionRevision),cancellations=get(snapshot,cancellationKey(data.orderId),'paid-cancellations',data.expectedCancellationRevision),refunds=get(snapshot,refundKey(data.orderId),'served-refunds',data.expectedRefundRevision);
  if((serving && serving.recordType!=='serving') || session?.recordType!=='cash-session' || (cancellations && cancellations.recordType!=='paid-cancellations') || (refunds && refunds.recordType!=='served-refunds')) throw new Error('Sumber pembatalan tidak ditemukan');
  const ret=data.returnStock,returnRow=snapshot.state.find(r=>r.key===returnKey(data.orderId));
  const returns=get(snapshot,returnKey(data.orderId),'stock-returns',ret===null?(returnRow?.revision ?? null):ret?.expectedReturnRevision);
  if(returns && returns.recordType!=='stock-returns') throw new Error('Histori return tidak sah');
  if(ret!==null && (!ret || !Array.isArray(ret.groups))) throw new Error('Sumber grup tidak sah');
  const groups=(ret?.groups ?? []).map(g=>{const record=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(record?.recordType!=='stock-group') throw new Error('Grup tidak sah');return record.stockGroup;});
  return commit(makePaidCancellationChange({batch:batch.batch,payment:payment.payment,settlement:settlement.settlement,serving:serving?.serving ?? null,session:session.session,cancellations:cancellations?.cancellations ?? [],refunds:refunds?.refunds ?? [],returns:returns?.returns ?? [],groups},data,meta));
 });
}

import { effectivePaymentMethod, type MethodCorrection, type PaymentMethod } from '../domain/payment';
import { planServedRefund, validateServedRefundEvent } from '../domain/served-refund';
import { cashBalance } from '../domain/cash-session';
import { cashMovements } from './cash-sessions';

export interface RefundDueInput {
 orderId:string; expectedServingRevision:number; expectedCancellationRevision:number; expectedRefundRevision:number|null;
 expectedCorrectionRevision:number|null; expectedSessionRevision:number; selection:RefundSelection[];
 method:PaymentMethod|null; reason:string; moneyReturned:true; returnStock:ReturnOption|null;
}
export interface DueSources extends CancellationSources { corrections:MethodCorrection[]; before:number }
export function makeRefundDueChange(s:DueSources,data:RefundDueInput,meta:StockMetadata,eligibleIds?:Set<string>):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedCancellationRevision,expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,method,moneyReturned,orderId,reason,returnStock,selection' || !text(data.orderId) || !text(data.reason,500) || data.moneyReturned!==true || !validRevision(data.expectedServingRevision) || !validRevision(data.expectedCancellationRevision) || !validRevision(data.expectedRefundRevision,true) || !validRevision(data.expectedCorrectionRevision,true) || !validRevision(data.expectedSessionRevision) || !(data.method===null || ['cash','qris','transfer','ewallet'].includes(data.method))) throw new Error('Intent pelunasan refund tidak sah');
 if(!s || !s.serving || !Array.isArray(s.cancellations) || !Array.isArray(s.refunds) || !Array.isArray(s.corrections) || data.expectedCancellationRevision!==s.cancellations.length-1 || data.expectedRefundRevision!==(s.refunds.length?s.refunds.length-1:null) || data.expectedCorrectionRevision!==(s.corrections.length?s.corrections.length-1:null) || s.batch.storeId!==meta.storeId || s.payment.storeId!==meta.storeId || s.session.storeId!==meta.storeId || s.session.id!==s.payment.cashSessionId || s.payment.orderId!==data.orderId) throw new Error('Sumber pelunasan refund tidak sah');
 const cancelled=new Set<string>();
 for(const event of s.cancellations) {validatePaidCancellationEvent(event);if(event.orderId!==data.orderId || event.paymentId!==s.payment.id || event.storeId!==meta.storeId || event.cashSessionId!==s.session.id) throw new Error('Histori pembatalan asing');for(const unit of event.units) {if(cancelled.has(unit.id) || s.settlement.totals.allocations.find(a=>a.id===unit.id)?.total!==unit.amount || !s.serving.units.some(u=>u.id===unit.id && u.status==='cancelled')) throw new Error('Histori pembatalan tidak sesuai');cancelled.add(unit.id);}}
 if(s.serving.units.some(u=>u.status==='cancelled' && !cancelled.has(u.id))) throw new Error('Unit batal tanpa histori');
 const history=s.refunds.map(r=>({unitIds:r.units.map(u=>u.id),amount:r.amount,source:'payment' as const}));
 const selected=planServedRefund(s.batch,s.payment,s.settlement,{...s.serving,units:s.serving.units.map(u=>({...u,status:u.status==='cancelled' && (!eligibleIds || eligibleIds.has(u.id))?'served' as const:'processed' as const}))},history,data.selection);
 const method=data.method ?? effectivePaymentMethod(s.payment,s.corrections);
 const event:ServedRefundEvent={id:`refund:${meta.operationId}`,paymentId:s.payment.id,orderId:data.orderId,storeId:meta.storeId,cashSessionId:s.session.id,units:selected.unitIds.map(id=>({id,amount:s.settlement.totals.allocations.find(a=>a.id===id)!.total})),amount:selected.amount,method,reason:data.reason,actorId:meta.actorId,recordedAt:meta.recordedAt,moneyReturned:true};validateServedRefundEvent(event);
 const balance=s.before-(method==='cash'?event.amount:0);if(!Number.isSafeInteger(s.before) || s.before<0 || !Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak cukup');
 const ret=data.returnStock===null?null:returnEffects(s,event,event.units.map(u=>u.id),data.returnStock,meta),operationId=meta.operationId;
 const due=paidRefundDue(s.cancellations,[...history,{unitIds:event.units.map(u=>u.id),amount:event.amount,source:'payment'}]);
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'refund.cancelled',targetId:data.orderId,payload:{data,metadata:meta,contractVersion:1},state:[{key:refundKey(data.orderId),expectedRevision:data.expectedRefundRevision,value:{recordType:'served-refunds',schemaVersion:2,refunds:[...s.refunds,event]}},{key:`cash-session:${s.session.id}`,expectedRevision:data.expectedSessionRevision,value:{recordType:'cash-session',schemaVersion:1,session:s.session}},...(ret?[{key:returnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:s.returns.some(r=>'cancellationId' in r)?2:1,returns:[...s.returns,ret.event]}},...ret.state]:[])],ledger:[{id:`refund-ledger:${operationId}`,operationId,value:{kind:'refund',sessionId:s.session.id,storeId:meta.storeId,refund:event}},...(ret?.ledger ?? [])],audit:[{id:`refund-audit:${operationId}`,operationId,value:{refund:event,stockReturn:ret?.event ?? null,before:s.before,after:balance,refundDue:due,policyVersion:meta.policyVersion}}],outbox:{id:`refund-outbox:${operationId}`,operationId,value:{orderId:data.orderId,paymentId:s.payment.id}},result:{refund:event,stockReturn:ret?.event ?? null,refundDue:due,balance,sessionRevision:data.expectedSessionRevision+1,refundRevision:s.refunds.length}};
}
export function refundCancelledUnits(db:BerrieDatabase,input:RefundDueInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as RefundDueInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='refund.cancelled' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId)) throw new Error('Pesanan tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const batch=get(snapshot,`first-batch:${data.orderId}`,'first-batch',0),payment=get(snapshot,`payment:${data.orderId}`,'payment',0),settlement=get(snapshot,`settlement:${data.orderId}`,'settlement',0),serving=get(snapshot,`serving:${data.orderId}`,'serving',data.expectedServingRevision),cancellations=get(snapshot,cancellationKey(data.orderId),'paid-cancellations',data.expectedCancellationRevision),refunds=get(snapshot,refundKey(data.orderId),'served-refunds',data.expectedRefundRevision),corrections=get(snapshot,`payment-corrections:${data.orderId}`,'payment-corrections',data.expectedCorrectionRevision);
  if(batch?.recordType!=='first-batch' || payment?.recordType!=='payment' || settlement?.recordType!=='settlement' || serving?.recordType!=='serving' || cancellations?.recordType!=='paid-cancellations' || (refunds && refunds.recordType!=='served-refunds') || (corrections && corrections.recordType!=='payment-corrections')) throw new Error('Sumber refund tidak lengkap');
  const session=get(snapshot,`cash-session:${payment.payment.cashSessionId}`,'cash-session',data.expectedSessionRevision),ret=data.returnStock,returnRow=snapshot.state.find(r=>r.key===returnKey(data.orderId));
  const returns=get(snapshot,returnKey(data.orderId),'stock-returns',ret===null?(returnRow?.revision ?? null):ret?.expectedReturnRevision);
  if(session?.recordType!=='cash-session' || (returns && returns.recordType!=='stock-returns') || (ret!==null && (!ret || !Array.isArray(ret.groups)))) throw new Error('Sumber refund tidak sah');
  const groups=(ret?.groups ?? []).map(g=>{const r=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(r?.recordType!=='stock-group') throw new Error('Sumber stok tidak sah');return r.stockGroup;});
  const before=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),session.session.id),session.session);
  return commit(makeRefundDueChange({batch:batch.batch,payment:payment.payment,settlement:settlement.settlement,serving:serving.serving,session:session.session,cancellations:cancellations.cancellations,refunds:refunds?.refunds ?? [],corrections:corrections?.corrections ?? [],returns:returns?.returns ?? [],groups,before},data,meta));
 });
}

export interface CancelRefundInput extends CancelPaidInput { expectedCorrectionRevision:number|null; method:PaymentMethod|null; moneyReturned:true }
/** Composes the cancellation and final refund into one receipt and one transaction. */
export function makeCancelRefundChange(s:DueSources,data:CancelRefundInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedCancellationRevision,expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,method,moneyReturned,orderId,reason,returnStock,selection' || data.moneyReturned!==true || !validRevision(data.expectedCorrectionRevision,true) || !(data.method===null || ['cash','qris','transfer','ewallet'].includes(data.method))) throw new Error('Intent batal dan refund tidak sah');
 const base:CancelPaidInput={orderId:data.orderId,expectedServingRevision:data.expectedServingRevision,expectedCancellationRevision:data.expectedCancellationRevision,expectedRefundRevision:data.expectedRefundRevision,expectedSessionRevision:data.expectedSessionRevision,selection:data.selection,reason:data.reason,kitchenConfirmed:data.kitchenConfirmed,returnStock:null};
 const cancellation=makePaidCancellationChange(s,base,meta),result=cancellation.result as {cancellation:PaidCancellationEvent;serving:ServingState;refundDue:number};
 if(data.expectedCorrectionRevision!==(s.corrections.length?s.corrections.length-1:null)) throw new Error('Revisi koreksi berubah');
 const selections=s.batch.draft.items.map(item=>({itemId:item.id,quantity:result.cancellation.units.filter(u=>u.amount>0 && item.unitIds.includes(u.id)).length})).filter(item=>item.quantity>0);
 let monetary:AtomicChange|null=null;
 if(selections.length) {
  const d:RefundDueInput={orderId:data.orderId,expectedServingRevision:(data.expectedServingRevision ?? -1)+1,expectedCancellationRevision:s.cancellations.length,expectedRefundRevision:data.expectedRefundRevision,expectedCorrectionRevision:data.expectedCorrectionRevision,expectedSessionRevision:data.expectedSessionRevision,selection:selections,method:data.method,reason:data.reason,moneyReturned:true,returnStock:null};
  monetary=makeRefundDueChange({...s,serving:result.serving,cancellations:[...s.cancellations,result.cancellation]},d,meta,new Set(result.cancellation.units.map(u=>u.id)));
 }
 const ret=data.returnStock===null?null:returnEffects(s,result.cancellation,result.cancellation.units.map(u=>u.id),data.returnStock,meta),operationId=meta.operationId;
 const mr=monetary?.result as {refund:ServedRefundEvent;refundDue:number;balance:number;sessionRevision:number;refundRevision:number}|undefined;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'cancellation.refund-paid',targetId:data.orderId,payload:{data,metadata:meta,contractVersion:1},state:[...cancellation.state,...(monetary?.state ?? []),...(ret?[{key:returnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:2,returns:[...s.returns,ret.event]}},...ret.state]:[])],ledger:[...(monetary?.ledger ?? []),...(ret?.ledger ?? [])],audit:[...cancellation.audit,...(monetary?.audit ?? []),...(ret?[{id:`return-audit:${operationId}`,operationId,value:{stockReturn:ret.event,policyVersion:meta.policyVersion}}]:[])],outbox:{id:`cancellation-refund-outbox:${operationId}`,operationId,value:{orderId:data.orderId,paymentId:s.payment.id}},result:{cancellation:result.cancellation,refund:mr?.refund ?? null,stockReturn:ret?.event ?? null,serving:result.serving,refundDue:mr?.refundDue ?? result.refundDue,balance:mr?.balance ?? s.before,sessionRevision:mr?.sessionRevision ?? data.expectedSessionRevision,refundRevision:mr?.refundRevision ?? data.expectedRefundRevision,cancellationRevision:s.cancellations.length,servingRevision:(data.expectedServingRevision ?? -1)+1}};
}
export function cancelAndRefundPaidUnits(db:BerrieDatabase,input:CancelRefundInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CancelRefundInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='cancellation.refund-paid' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId)) throw new Error('Pesanan tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const batch=get(snapshot,`first-batch:${data.orderId}`,'first-batch',0),payment=get(snapshot,`payment:${data.orderId}`,'payment',0),settlement=get(snapshot,`settlement:${data.orderId}`,'settlement',0),serving=get(snapshot,`serving:${data.orderId}`,'serving',data.expectedServingRevision),cancellations=get(snapshot,cancellationKey(data.orderId),'paid-cancellations',data.expectedCancellationRevision),refunds=get(snapshot,refundKey(data.orderId),'served-refunds',data.expectedRefundRevision),corrections=get(snapshot,`payment-corrections:${data.orderId}`,'payment-corrections',data.expectedCorrectionRevision);
  if(batch?.recordType!=='first-batch' || payment?.recordType!=='payment' || settlement?.recordType!=='settlement' || (serving && serving.recordType!=='serving') || (cancellations && cancellations.recordType!=='paid-cancellations') || (refunds && refunds.recordType!=='served-refunds') || (corrections && corrections.recordType!=='payment-corrections')) throw new Error('Sumber refund tidak lengkap');
  const session=get(snapshot,`cash-session:${payment.payment.cashSessionId}`,'cash-session',data.expectedSessionRevision),ret=data.returnStock,returnRow=snapshot.state.find(r=>r.key===returnKey(data.orderId)),returns=get(snapshot,returnKey(data.orderId),'stock-returns',ret===null?(returnRow?.revision ?? null):ret?.expectedReturnRevision);
  if(session?.recordType!=='cash-session' || (returns && returns.recordType!=='stock-returns') || (ret!==null && (!ret || !Array.isArray(ret.groups)))) throw new Error('Sumber refund tidak sah');
  const groups=(ret?.groups ?? []).map(g=>{const r=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(r?.recordType!=='stock-group') throw new Error('Sumber stok tidak sah');return r.stockGroup;});
  const before=cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),session.session.id),session.session);
  return commit(makeCancelRefundChange({batch:batch.batch,payment:payment.payment,settlement:settlement.settlement,serving:serving?.serving ?? null,session:session.session,cancellations:cancellations?.cancellations ?? [],refunds:refunds?.refunds ?? [],corrections:corrections?.corrections ?? [],returns:returns?.returns ?? [],groups,before},data,meta));
 });
}

export interface ReturnCancelledInput { orderId:string; cancellationId:string; unitIds:string[]; expectedCancellationRevision:number; expectedReturnRevision:number|null; expectedSessionRevision:number; groups:import('./served-refunds').GroupSource[]; reason:string; sellable:true }
export function makeCancelledReturnChange(s:CancellationSources,data:ReturnCancelledInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='cancellationId,expectedCancellationRevision,expectedReturnRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds' || !text(data.orderId) || !text(data.cancellationId) || !validRevision(data.expectedCancellationRevision) || !validRevision(data.expectedSessionRevision) || data.expectedCancellationRevision!==s.cancellations.length-1 || s.payment.orderId!==data.orderId || s.payment.storeId!==meta.storeId || s.batch.storeId!==meta.storeId || s.session.storeId!==meta.storeId || s.session.id!==s.payment.cashSessionId) throw new Error('Intent return pembatalan tidak sah');
 const source=s.cancellations.find(c=>c.id===data.cancellationId);validatePaidCancellationEvent(source);
 if(source.orderId!==data.orderId || source.storeId!==meta.storeId || source.paymentId!==s.payment.id || source.cashSessionId!==s.session.id) throw new Error('Sumber pembatalan tidak sah');
 const ret=returnEffects(s,source,data.unitIds,{reason:data.reason,sellable:data.sellable,expectedReturnRevision:data.expectedReturnRevision,groups:data.groups},meta),operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'cancellation.return-stock',targetId:data.orderId,payload:{data,metadata:meta,contractVersion:1},state:[{key:returnKey(data.orderId),expectedRevision:data.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:2,returns:[...s.returns,ret.event]}},...ret.state],ledger:ret.ledger,audit:[{id:`return-audit:${operationId}`,operationId,value:{stockReturn:ret.event,policyVersion:meta.policyVersion}}],outbox:{id:`return-outbox:${operationId}`,operationId,value:{orderId:data.orderId,cancellationId:source.id}},result:{stockReturn:ret.event,returnRevision:s.returns.length}};
}
export function returnCancelledStock(db:BerrieDatabase,input:ReturnCancelledInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ReturnCancelledInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='cancellation.return-stock' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId) || !Array.isArray(data.groups)) throw new Error('Sumber return tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const batch=get(snapshot,`first-batch:${data.orderId}`,'first-batch',0),payment=get(snapshot,`payment:${data.orderId}`,'payment',0),settlement=get(snapshot,`settlement:${data.orderId}`,'settlement',0),cancellations=get(snapshot,cancellationKey(data.orderId),'paid-cancellations',data.expectedCancellationRevision),returns=get(snapshot,returnKey(data.orderId),'stock-returns',data.expectedReturnRevision);
  if(batch?.recordType!=='first-batch' || payment?.recordType!=='payment' || settlement?.recordType!=='settlement' || cancellations?.recordType!=='paid-cancellations' || (returns && returns.recordType!=='stock-returns')) throw new Error('Sumber return tidak lengkap');
  const session=get(snapshot,`cash-session:${payment.payment.cashSessionId}`,'cash-session',data.expectedSessionRevision);if(session?.recordType!=='cash-session') throw new Error('Sesi return tidak sah');
  const groups=data.groups.map(g=>{const r=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(r?.recordType!=='stock-group') throw new Error('Sumber stok tidak sah');return r.stockGroup;});
  return commit(makeCancelledReturnChange({batch:batch.batch,payment:payment.payment,settlement:settlement.settlement,serving:null,session:session.session,cancellations:cancellations.cancellations,refunds:[],returns:returns?.returns ?? [],groups},data,meta));
 });
}
/** Internal read; callers must separately authorize access via T-04. */
export async function readPaidCancellationStatus(db:BerrieDatabase,storeId:string,orderId:string):Promise<{serving:ServingState;cancellations:PaidCancellationEvent[];refundDue:number;cancellationRevision:number|null;servingRevision:number|null;refundRevision:number|null}> {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
 const batch=get(snapshot,`first-batch:${orderId}`,'first-batch',0),payment=get(snapshot,`payment:${orderId}`,'payment',0);
 if(batch?.recordType!=='first-batch' || payment?.recordType!=='payment' || batch.batch.storeId!==storeId || payment.payment.storeId!==storeId) throw new Error('Sumber payment tidak ditemukan');
 const cr=snapshot.state.find(r=>r.key===cancellationKey(orderId)),sr=snapshot.state.find(r=>r.key===`serving:${orderId}`),rr=snapshot.state.find(r=>r.key===refundKey(orderId));
 const cancellations=get(snapshot,cancellationKey(orderId),'paid-cancellations',cr?.revision ?? null),serving=get(snapshot,`serving:${orderId}`,'serving',sr?.revision ?? null),refunds=get(snapshot,refundKey(orderId),'served-refunds',rr?.revision ?? null);
 if((cancellations && cancellations.recordType!=='paid-cancellations') || (serving && serving.recordType!=='serving') || (refunds && refunds.recordType!=='served-refunds')) throw new Error('Histori tidak sah');
 const history=(refunds?.refunds ?? []).map(r=>({unitIds:r.units.map(u=>u.id),amount:r.amount,source:'payment' as const}));
 return structuredClone({serving:serving?.serving ?? initialServing(batch.batch),cancellations:cancellations?.cancellations ?? [],refundDue:paidRefundDue(cancellations?.cancellations ?? [],history),cancellationRevision:cr?.revision ?? null,servingRevision:sr?.revision ?? null,refundRevision:rr?.revision ?? null});
}
