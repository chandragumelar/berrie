import { expect, it } from 'vitest';
import { freezeSettlement } from './settlement';
import { initialServing } from './serving';
import { paidRefundDue, planPaidCancellation, validatePaidCancellationEvent } from './paid-cancellation';
import type { FirstBatch } from './first-batch';
import type { CashPayment } from './payment';

const batch:FirstBatch={storeId:'store',number:1,confirmedAt:'2026-11-01T00:00:00Z',skuGroups:[{skuId:'00000000-0000-4000-8000-000000000004',groupId:'group'}],draft:{orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000002',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-11-01T00:00:00Z',items:[{id:'00000000-0000-4000-8000-000000000003',unitIds:['00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000004',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0}};
const snapshot=freezeSettlement('00000000-0000-4000-8000-000000000001',[{unitIds:['00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000004',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'none'},0,0,'payment');
const payment:CashPayment={id:'payment:00000000-0000-4000-8000-000000000001',orderId:'00000000-0000-4000-8000-000000000001',storeId:'store',cashSessionId:'00000000-0000-4000-8000-000000000002',settlementId:'settlement:00000000-0000-4000-8000-000000000001',paidAt:'2026-11-01T00:00:00Z',method:'cash',amount:20000,received:20000,change:0};
it('memilih unit processed berdasarkan ID dan alokasi settlement',()=>{
 const serving=initialServing(batch), item=batch.draft.items[0];
 const first=planPaidCancellation(batch,payment,snapshot,serving,[],[],[{itemId:item.id,quantity:1}]);
 expect(first).toEqual({units:[{id:item.unitIds[1],amount:10000}],due:10000});
 const second=planPaidCancellation(batch,payment,snapshot,serving,[],[item.unitIds[1]],[{itemId:item.id,quantity:1}]);
 expect(second.units[0].id).toBe(item.unitIds[0]);
 serving.units[0].status='served';
 expect(()=>planPaidCancellation(batch,payment,snapshot,serving,[],[item.unitIds[1]],[{itemId:item.id,quantity:1}])).toThrow();
});
it('menolak unit direfund dan sumber asing',()=>{
 const serving=initialServing(batch), item=batch.draft.items[0];
 expect(()=>planPaidCancellation(batch,payment,snapshot,serving,[{unitIds:[...item.unitIds],amount:20000,source:'payment'}],[],[{itemId:item.id,quantity:1}])).toThrow();
 expect(()=>planPaidCancellation(batch,{...payment,storeId:'other'},snapshot,serving,[],[],[{itemId:item.id,quantity:1}])).toThrow();
});

it('refund due berkurang hanya setelah refund final dan unit nol tidak menambah kewajiban',()=>{
 const event={id:'cancel:1',paymentId:payment.id,orderId:payment.orderId,storeId:payment.storeId,cashSessionId:payment.cashSessionId,units:[{id:'a',amount:11117},{id:'b',amount:0},{id:'c',amount:22233}],reason:'tidak tersedia',kitchenConfirmed:true as const,actorId:'actor',recordedAt:'2026-11-01T00:00:00Z'};
 validatePaidCancellationEvent(event);
 expect(paidRefundDue([event],[])).toBe(33350);
 expect(paidRefundDue([event],[{unitIds:['a'],amount:11117,source:'payment'}])).toBe(22233);
 expect(()=>validatePaidCancellationEvent({...event,kitchenConfirmed:false})).toThrow();
 expect(()=>paidRefundDue([event,event],[])).toThrow();
});
