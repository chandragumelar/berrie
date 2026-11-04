import { describe, expect, it } from 'vitest';
import { correctionDeltas, effectivePaymentMethod, type CashPayment, type MethodCorrection, type PaymentMethod } from './payment';

const payment:CashPayment={id:'payment:order',orderId:'order',storeId:'store',cashSessionId:'session',settlementId:'settlement:order',paidAt:'2026-11-04T10:00:00Z',method:'cash',amount:27500,received:50000,change:22500};
const correction=(from:PaymentMethod,to:PaymentMethod):MethodCorrection=>({paymentId:payment.id,orderId:payment.orderId,storeId:payment.storeId,cashSessionId:payment.cashSessionId,from,to,amount:payment.amount,reason:'Salah pilih',actorId:'actor',recordedAt:'2026-11-04T10:01:00Z'});
describe('koreksi klasifikasi pembayaran',()=>{
 it.each(['qris','transfer','ewallet'] as const)('mempertahankan nominal untuk %s dan dua kaki nol',method=>{
  const c=correction('cash',method);
  expect(effectivePaymentMethod(payment,[c])).toBe(method);
  expect(correctionDeltas(c)).toEqual([{method:'cash',delta:-27500},{method,delta:27500}]);
  expect(payment).toMatchObject({method:'cash',received:50000,change:22500});
 });
 it('mengikuti rantai terakhir termasuk antar non-tunai dan kembali ke tunai',()=>{
  const history=[correction('cash','qris'),correction('qris','transfer'),correction('transfer','cash')];
  expect(effectivePaymentMethod(payment,history)).toBe('cash');
  expect(correctionDeltas(history[1])).toEqual([{method:'qris',delta:-27500},{method:'transfer',delta:27500}]);
 });
 it('menolak alasan kosong, nominal asing, metode sama dan rantai rusak',()=>{
  for(const bad of [{...correction('cash','qris'),reason:' '},{...correction('cash','qris'),amount:1},{...correction('cash','qris'),storeId:'other'},correction('cash','cash'),correction('qris','cash')]) expect(()=>effectivePaymentMethod(payment,[bad])).toThrow();
 });
});
