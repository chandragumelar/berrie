import { expect, it } from 'vitest';
import { freezeSettlement } from './settlement';
import { initialServing } from './serving';
import { planServedRefund } from './served-refund';
import type { FirstBatch } from './first-batch';
import type { CashPayment } from './payment';

const batch:FirstBatch={storeId:'store',number:1,confirmedAt:'2026-11-01T00:00:00Z',skuGroups:[{skuId:'00000000-0000-4000-8000-000000000004',groupId:'group'}],draft:{orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000002',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-11-01T00:00:00Z',items:[{id:'00000000-0000-4000-8000-000000000003',unitIds:['00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000004',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0}};
const snapshot=freezeSettlement('00000000-0000-4000-8000-000000000001',[{unitIds:['00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000004',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'none'},0,0,'payment');
const payment:CashPayment={id:'payment:00000000-0000-4000-8000-000000000001',orderId:'00000000-0000-4000-8000-000000000001',storeId:'store',cashSessionId:'00000000-0000-4000-8000-000000000002',settlementId:'settlement:00000000-0000-4000-8000-000000000001',paidAt:'2026-11-01T00:00:00Z',method:'cash',amount:20000,received:20000,change:0};
it('memilih ID stabil hanya untuk unit served yang belum direfund',()=>{
 const serving=initialServing(batch);serving.units.forEach(unit=>unit.status='served');
 const first=planServedRefund(batch,payment,snapshot,serving,[],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}]);
 expect(first).toEqual({unitIds:['00000000-0000-4000-8000-000000000005'],amount:10000,source:'payment'});
 expect(planServedRefund(batch,payment,snapshot,serving,[first],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}]).unitIds).toEqual(['00000000-0000-4000-8000-000000000006']);
 expect(()=>planServedRefund(batch,payment,snapshot,serving,[first],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:2}])).toThrow();
 serving.units[0].status='processed';
 expect(()=>planServedRefund(batch,payment,snapshot,serving,[first],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}])).toThrow();
});
it('menolak pilihan duplikat dan sumber payment atau settlement yang tidak sesuai',()=>{
 const serving=initialServing(batch);serving.units.forEach(unit=>unit.status='served');
 expect(()=>planServedRefund(batch,payment,snapshot,serving,[],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1},{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}])).toThrow();
 expect(()=>planServedRefund(batch,{...payment,storeId:'other'},snapshot,serving,[],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}])).toThrow();
 const platform={...snapshot,source:'platform' as const,paymentAmount:0};
 expect(()=>planServedRefund(batch,payment,platform,serving,[],[{itemId:'00000000-0000-4000-8000-000000000003',quantity:1}])).toThrow();
});
it('menggunakan alokasi asal 33.350 untuk refund bertahap',()=>{
 const b=structuredClone(batch),first=b.draft.items[0];first.unitIds=[first.unitIds[1]];
 const second=structuredClone(first);second.id='00000000-0000-4000-8000-000000000007';second.unitIds=['00000000-0000-4000-8000-000000000008'];second.skuPrice=20000;b.draft.items.push(second);
 b.draft.discount={kind:'amount',value:1000};b.draft.taxBp=1000;b.draft.serviceBp=500;
 const s=freezeSettlement(b.draft.orderId,b.draft.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo})),b.draft.discount,b.draft.taxBp,b.draft.serviceBp,'payment');
 const p={...payment,amount:33350,received:33350},serving=initialServing(b);serving.units.forEach(unit=>unit.status='served');
 const a=planServedRefund(b,p,s,serving,[],[{itemId:first.id,quantity:1}]);
 const c=planServedRefund(b,p,s,serving,[a],[{itemId:second.id,quantity:1}]);
 expect([a.amount,c.amount]).toEqual([11117,22233]);
});
