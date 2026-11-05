import { validateFirstBatch, type FirstBatch } from './first-batch';
import { validateCashPayment, validateNoncashPayment, type Payment } from './payment';
import { validateServingState, type ServingState } from './serving';
import { refund, validateRefundHistory, validateSettlementSnapshot, type RefundRecord, type SettlementSnapshot } from './settlement';
import { draftDateCode } from './draft';
import type { PaymentMethod } from './payment';

export interface RefundSelection { itemId:string; quantity:number }
export interface ServedRefundEvent {
 id:string; paymentId:string; orderId:string; storeId:string; cashSessionId:string;
 units:{id:string;amount:number}[]; amount:number; method:PaymentMethod;
 reason:string; actorId:string; recordedAt:string; moneyReturned:true;
}
export interface StockReturnEvent {
 id:string; refundId:string; paymentId:string; orderId:string; storeId:string;
 units:{id:string;groupId:string}[]; reason:string; actorId:string; recordedAt:string; sellable:true;
}
const id=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=200;
const reason=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=500;
function plain(v:unknown):v is Record<string,unknown> { return !!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype; }
export function validateServedRefundEvent(v:unknown):asserts v is ServedRefundEvent {
 if(!plain(v) || Object.keys(v).sort().join(',')!=='actorId,amount,cashSessionId,id,method,moneyReturned,orderId,paymentId,reason,recordedAt,storeId,units' || ![v.id,v.paymentId,v.orderId,v.storeId,v.cashSessionId,v.actorId].every(id) || !reason(v.reason) || v.moneyReturned!==true || !['cash','qris','transfer','ewallet'].includes(v.method as string) || typeof v.recordedAt!=='string' || !Array.isArray(v.units) || !v.units.length) throw new Error('Refund tidak sah');
 draftDateCode(v.recordedAt,'UTC');
 let sum=0;const seen=new Set<string>();
 for(const unit of v.units) {if(!plain(unit) || Object.keys(unit).sort().join(',')!=='amount,id' || !id(unit.id) || seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || (unit.amount as number)<=0) throw new Error('Unit refund tidak sah');seen.add(unit.id);sum+=unit.amount as number;}
 if(!Number.isSafeInteger(sum) || sum!==v.amount) throw new Error('Nilai refund tidak sah');
}
export function validateStockReturnEvent(v:unknown):asserts v is StockReturnEvent {
 if(!plain(v) || Object.keys(v).sort().join(',')!=='actorId,id,orderId,paymentId,reason,recordedAt,refundId,sellable,storeId,units' || ![v.id,v.refundId,v.paymentId,v.orderId,v.storeId,v.actorId].every(id) || !reason(v.reason) || v.sellable!==true || typeof v.recordedAt!=='string' || !Array.isArray(v.units) || !v.units.length) throw new Error('Return stok tidak sah');
 draftDateCode(v.recordedAt,'UTC');const seen=new Set<string>();
 for(const unit of v.units) {if(!plain(unit) || Object.keys(unit).sort().join(',')!=='groupId,id' || !id(unit.id) || !id(unit.groupId) || seen.has(unit.id)) throw new Error('Unit return tidak sah');seen.add(unit.id);}
}

/** Selects eligible served units in stable ID order; values come only from settlement. */
export function planServedRefund(batch:FirstBatch, payment:Payment, settlement:SettlementSnapshot, serving:ServingState, history:RefundRecord[], selection:RefundSelection[]):RefundRecord {
 validateFirstBatch(batch);
 if(payment.method==='cash') validateCashPayment(payment); else validateNoncashPayment(payment);
 validateSettlementSnapshot(settlement); validateServingState(serving); validateRefundHistory(settlement,history);
 if(settlement.source!=='payment' || payment.id!==`payment:${payment.orderId}` || payment.settlementId!==`settlement:${payment.orderId}` || payment.orderId!==settlement.orderId || payment.orderId!==batch.draft.orderId || payment.storeId!==batch.storeId || payment.cashSessionId!==batch.draft.cashSessionId || payment.amount!==settlement.paymentAmount || serving.orderId!==payment.orderId || serving.storeId!==payment.storeId || serving.cashSessionId!==payment.cashSessionId) throw new Error('Sumber refund tidak sesuai');
 const batchIds=batch.draft.items.flatMap(item=>item.unitIds).sort(), settlementIds=settlement.units.map(unit=>unit.id).sort(), servingIds=serving.units.map(unit=>unit.id).sort();
 if(JSON.stringify(batchIds)!==JSON.stringify(settlementIds) || JSON.stringify(batchIds)!==JSON.stringify(servingIds)) throw new Error('Unit sumber refund tidak sesuai');
 if(!Array.isArray(selection) || !selection.length) throw new Error('Pilihan refund wajib');
 const used=new Set(history.flatMap(entry=>entry.unitIds)), served=new Set(serving.units.filter(unit=>unit.status==='served').map(unit=>unit.id));
 const positive=new Set(settlement.totals.allocations.filter(unit=>unit.total>0).map(unit=>unit.id));
 const itemIds=new Set<string>(), chosen:string[]=[];
 for(const row of selection) {
  if(!row || typeof row!=='object' || Array.isArray(row) || Object.keys(row).sort().join(',')!=='itemId,quantity' || typeof row.itemId!=='string' || itemIds.has(row.itemId) || !Number.isSafeInteger(row.quantity) || row.quantity<1 || row.quantity>999) throw new Error('Pilihan refund tidak sah');
  itemIds.add(row.itemId);
  const item=batch.draft.items.find(candidate=>candidate.id===row.itemId);
  if(!item) throw new Error('Item refund tidak ditemukan');
  const eligible=item.unitIds.filter(id=>served.has(id) && positive.has(id) && !used.has(id)).sort();
  if(eligible.length<row.quantity) throw new Error('Unit refund tidak tersedia');
  chosen.push(...eligible.slice(0,row.quantity));
 }
 return refund(settlement,history,chosen);
}
