import { draftDateCode } from './draft';
import { integer } from './money';

export interface CashPayment {
 id:string; orderId:string; storeId:string; cashSessionId:string; settlementId:string;
 paidAt:string; method:'cash'; amount:number; received:number; change:number;
}
export function validateCashPayment(value:unknown): asserts value is CashPayment {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pembayaran tidak sah');
 const p=value as Record<string,unknown>;
 if(Object.keys(p).sort().join(',')!=='amount,cashSessionId,change,id,method,orderId,paidAt,received,settlementId,storeId' || ![p.id,p.orderId,p.storeId,p.cashSessionId,p.settlementId].every(v=>typeof v==='string' && !!v.trim() && v.length<=200) || p.method!=='cash' || typeof p.paidAt!=='string') throw new Error('Pembayaran tidak sah');
 draftDateCode(p.paidAt,'UTC');
 const amount=integer(p.amount,1,Number.MAX_SAFE_INTEGER),received=integer(p.received,0,Number.MAX_SAFE_INTEGER),change=integer(p.change,0,Number.MAX_SAFE_INTEGER);
 if(received<amount || change!==received-amount) throw new Error('Uang diterima atau kembalian tidak sah');
}
