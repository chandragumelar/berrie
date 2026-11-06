import { expect, it } from 'vitest';
import { reduceOrderStatus, type StatusSource } from './order-status';
const base:StatusSource={orderId:'order',displayNumber:'1',cashSessionId:'session',draftUnits:2,draftCancelled:false,serving:{storeId:'store',orderId:'order',cashSessionId:'session',units:[{id:'a',status:'served'},{id:'b',status:'processed'}]},settlement:'unpaid',cancellations:[],refunds:[]};
it('separates kitchen work and financial status',()=>{
 expect(reduceOrderStatus(base)).toMatchObject({classification:'active',counts:{served:1,processed:1},reasons:['processed','unsettled']});
 const served={...base,serving:{...base.serving!,units:base.serving!.units.map(u=>({...u,status:'served' as const}))}};
 expect(reduceOrderStatus(served)).toMatchObject({classification:'active',reasons:['unsettled']});
 expect(reduceOrderStatus({...served,settlement:'paid'})).toMatchObject({classification:'history',reasons:[]});
 expect(reduceOrderStatus({...served,settlement:'free'})).toMatchObject({classification:'history',reasons:[]});
});
it('does not reopen served work for voluntary refunds and permits zero-value cancellations',()=>{
 const source:StatusSource={...base,settlement:'paid',serving:{...base.serving!,units:[{id:'a',status:'served'},{id:'b',status:'cancelled'}]},cancellations:[{id:'cancel',paymentId:'payment',orderId:'order',storeId:'store',cashSessionId:'session',units:[{id:'b',amount:0}],reason:'Batal',kitchenConfirmed:true,actorId:'actor',recordedAt:'2026-11-01T00:00:00Z'}],refunds:[{unitIds:['a'],amount:100,source:'payment'}]};
 expect(reduceOrderStatus(source)).toMatchObject({classification:'history',refundDue:0,counts:{served:1,cancelled:1},reasons:[]});
});
