import { validateFirstBatch, type FirstBatch } from './first-batch';
import { validateCashPayment, validateNoncashPayment, type Payment } from './payment';
import { validateServingState, type ServingState } from './serving';
import { validateRefundHistory, validateSettlementSnapshot, type RefundRecord, type SettlementSnapshot } from './settlement';
import type { RefundSelection } from './served-refund';
import { draftDateCode } from './draft';

/** Pure unit selection; cancellation and settlement never change the original snapshot. */
export function planPaidCancellation(batch:FirstBatch,payment:Payment,settlement:SettlementSnapshot,serving:ServingState,refunds:RefundRecord[],cancelledIds:string[],selection:RefundSelection[]):{units:{id:string;amount:number}[];due:number} {
 validateFirstBatch(batch);
 if(payment.method==='cash') validateCashPayment(payment); else validateNoncashPayment(payment);
 validateSettlementSnapshot(settlement);validateServingState(serving,true);validateRefundHistory(settlement,refunds);
 if(settlement.source!=='payment' || payment.id!==`payment:${payment.orderId}` || payment.settlementId!==`settlement:${payment.orderId}` || payment.orderId!==settlement.orderId || payment.orderId!==batch.draft.orderId || payment.storeId!==batch.storeId || payment.cashSessionId!==batch.draft.cashSessionId || payment.amount!==settlement.paymentAmount || serving.orderId!==payment.orderId || serving.storeId!==payment.storeId || serving.cashSessionId!==payment.cashSessionId) throw new Error('Sumber pembatalan tidak sesuai');
 const ids=batch.draft.items.flatMap(item=>item.unitIds).sort();
 if(JSON.stringify(ids)!==JSON.stringify(settlement.units.map(unit=>unit.id).sort()) || JSON.stringify(ids)!==JSON.stringify(serving.units.map(unit=>unit.id).sort())) throw new Error('Unit sumber pembatalan tidak sesuai');
 if(!Array.isArray(cancelledIds) || cancelledIds.some(id=>typeof id!=='string' || !ids.includes(id)) || new Set(cancelledIds).size!==cancelledIds.length || !Array.isArray(selection) || !selection.length) throw new Error('Pilihan pembatalan tidak sah');
 const unavailable=new Set([...cancelledIds,...refunds.flatMap(entry=>entry.unitIds)]),processed=new Set(serving.units.filter(unit=>unit.status==='processed').map(unit=>unit.id));
 const itemIds=new Set<string>(),chosen:string[]=[];
 for(const row of selection) {
  if(!row || typeof row!=='object' || Array.isArray(row) || Object.keys(row).sort().join(',')!=='itemId,quantity' || typeof row.itemId!=='string' || itemIds.has(row.itemId) || !Number.isSafeInteger(row.quantity) || row.quantity<1 || row.quantity>999) throw new Error('Pilihan pembatalan tidak sah');
  itemIds.add(row.itemId);
  const item=batch.draft.items.find(candidate=>candidate.id===row.itemId);
  if(!item) throw new Error('Item pembatalan tidak ditemukan');
  const eligible=item.unitIds.filter(id=>processed.has(id) && !unavailable.has(id)).sort();
  if(eligible.length<row.quantity) throw new Error('Unit pembatalan tidak tersedia');
  chosen.push(...eligible.slice(0,row.quantity));
 }
 const units=chosen.map(id=>({id,amount:settlement.totals.allocations.find(unit=>unit.id===id)!.total}));
 const due=units.reduce((sum,unit)=>sum+unit.amount,0);
 if(!Number.isSafeInteger(due)) throw new Error('Nilai pembatalan tidak sah');
 return {units,due};
}

export interface PaidCancellationEvent {
 id:string; paymentId:string; orderId:string; storeId:string; cashSessionId:string;
 units:{id:string;amount:number}[]; reason:string; kitchenConfirmed:true; actorId:string; recordedAt:string;
}
export function validatePaidCancellationEvent(value:unknown):asserts value is PaidCancellationEvent {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pembatalan tidak sah');
 const v=value as Record<string,unknown>, id=(x:unknown)=>typeof x==='string' && !!x.trim() && x.length<=200;
 if(Object.keys(v).sort().join(',')!=='actorId,cashSessionId,id,kitchenConfirmed,orderId,paymentId,reason,recordedAt,storeId,units' || ![v.actorId,v.cashSessionId,v.id,v.orderId,v.paymentId,v.storeId].every(id) || typeof v.reason!=='string' || !v.reason.trim() || v.reason.length>500 || v.kitchenConfirmed!==true || typeof v.recordedAt!=='string' || !Array.isArray(v.units) || !v.units.length) throw new Error('Pembatalan tidak sah');
 draftDateCode(v.recordedAt,'UTC');const seen=new Set<string>();
 for(const unit of v.units) {
  if(!unit || typeof unit!=='object' || Array.isArray(unit) || Object.getPrototypeOf(unit)!==Object.prototype || Object.keys(unit).sort().join(',')!=='amount,id' || !id(unit.id) || seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || unit.amount<0) throw new Error('Unit pembatalan tidak sah');
  seen.add(unit.id);
 }
}
/** Outstanding money is derived from immutable cancellation amounts and final refunds. */
export function paidRefundDue(cancellations:PaidCancellationEvent[],refunds:RefundRecord[]):number {
 const refunded=new Set(refunds.flatMap(refund=>refund.unitIds)),seen=new Set<string>();
 let due=0;
 for(const event of cancellations) {
  validatePaidCancellationEvent(event);
  for(const unit of event.units) {
  if(seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || unit.amount<0) throw new Error('Histori pembatalan tidak sah');
  seen.add(unit.id);if(!refunded.has(unit.id)) due+=unit.amount;
  }
 }
 if(!Number.isSafeInteger(due)) throw new Error('Nilai refund due tidak sah');
 return due;
}
