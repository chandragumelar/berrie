import { draftDateCode } from './draft';
import { integer } from './money';

export interface CashPayment {
 id:string; orderId:string; storeId:string; cashSessionId:string; settlementId:string;
 paidAt:string; method:'cash'; amount:number; received:number; change:number;
}
export interface NoncashPayment {
 id:string; orderId:string; storeId:string; cashSessionId:string; settlementId:string;
 paidAt:string; method:'qris'|'transfer'|'ewallet'; amount:number; verified:true; note:string|null;
}
export function validateNoncashPayment(value:unknown):asserts value is NoncashPayment {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pembayaran tidak sah');
 const p=value as Record<string,unknown>;
 if(Object.keys(p).sort().join(',')!=='amount,cashSessionId,id,method,note,orderId,paidAt,settlementId,storeId,verified' || ![p.id,p.orderId,p.storeId,p.cashSessionId,p.settlementId].every(v=>typeof v==='string' && !!v.trim() && v.length<=200) || !['qris','transfer','ewallet'].includes(p.method as string) || p.verified!==true || !(p.note===null || typeof p.note==='string' && p.note.length<=500) || typeof p.paidAt!=='string') throw new Error('Pembayaran tidak sah');
 draftDateCode(p.paidAt,'UTC');integer(p.amount,1,Number.MAX_SAFE_INTEGER);
}
export function validateCashPayment(value:unknown): asserts value is CashPayment {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pembayaran tidak sah');
 const p=value as Record<string,unknown>;
 if(Object.keys(p).sort().join(',')!=='amount,cashSessionId,change,id,method,orderId,paidAt,received,settlementId,storeId' || ![p.id,p.orderId,p.storeId,p.cashSessionId,p.settlementId].every(v=>typeof v==='string' && !!v.trim() && v.length<=200) || p.method!=='cash' || typeof p.paidAt!=='string') throw new Error('Pembayaran tidak sah');
 draftDateCode(p.paidAt,'UTC');
 const amount=integer(p.amount,1,Number.MAX_SAFE_INTEGER),received=integer(p.received,0,Number.MAX_SAFE_INTEGER),change=integer(p.change,0,Number.MAX_SAFE_INTEGER);
 if(received<amount || change!==received-amount) throw new Error('Uang diterima atau kembalian tidak sah');
}

export type PaymentMethod = CashPayment['method'] | NoncashPayment['method'];
export type Payment = CashPayment | NoncashPayment;
export interface MethodCorrection {
 paymentId:string; orderId:string; storeId:string; cashSessionId:string;
 from:PaymentMethod; to:PaymentMethod; amount:number; reason:string; actorId:string; recordedAt:string;
}
export function validateMethodCorrection(value:unknown):asserts value is MethodCorrection {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Koreksi metode tidak sah');
 const c=value as Record<string,unknown>;
 if(Object.keys(c).sort().join(',')!=='actorId,amount,cashSessionId,from,orderId,paymentId,reason,recordedAt,storeId,to' || ![c.paymentId,c.orderId,c.storeId,c.cashSessionId,c.actorId].every(v=>typeof v==='string' && !!v.trim() && v.length<=200) || typeof c.reason!=='string' || !c.reason.trim() || c.reason.length>500 || !['cash','qris','transfer','ewallet'].includes(c.from as string) || !['cash','qris','transfer','ewallet'].includes(c.to as string) || c.from===c.to || typeof c.recordedAt!=='string') throw new Error('Koreksi metode tidak sah');
 integer(c.amount,1,Number.MAX_SAFE_INTEGER); draftDateCode(c.recordedAt,'UTC');
}
/** Derive classification only from the immutable payment and a validated, ordered chain. */
export function effectivePaymentMethod(payment:Payment, corrections:MethodCorrection[]):PaymentMethod {
 if(payment.method==='cash') validateCashPayment(payment); else validateNoncashPayment(payment);
 if(!Array.isArray(corrections)) throw new Error('Histori koreksi tidak sah');
 let method:PaymentMethod=payment.method;
 for(const c of corrections) {
  validateMethodCorrection(c);
  if(c.paymentId!==payment.id || c.orderId!==payment.orderId || c.storeId!==payment.storeId || c.cashSessionId!==payment.cashSessionId || c.amount!==payment.amount || c.from!==method) throw new Error('Rantai koreksi tidak sah');
  method=c.to;
 }
 return method;
}
export function correctionDeltas(correction:MethodCorrection):[{method:PaymentMethod; delta:number},{method:PaymentMethod; delta:number}] {
 validateMethodCorrection(correction);
 return [{method:correction.from,delta:-correction.amount},{method:correction.to,delta:correction.amount}];
}
