import { expect, it } from 'vitest';
import { makeAdditionalBatch, planAdditionalBatchDebits, validateOrderAdditions } from './order-additions';

const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const base=()=>({orderId:uuid(1),displayNumber:'261119-E1-0001',cashSessionId:uuid(2),customer:'A',channel:'store' as const,channelAccountId:'',externalOrderId:'',serving:'takeaway' as const,note:'',savedAt:'2026-11-19T00:00:00.000Z',items:[{id:uuid(3),unitIds:[uuid(4)],skuId:uuid(5),name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none' as const,revision:0},choices:[],toppings:[],serving:'takeaway' as const,note:''}],discount:{kind:'none' as const},taxBp:0,serviceBp:0});
const line=()=>({id:uuid(6),unitIds:[uuid(7),uuid(8)],skuId:uuid(5),name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none' as const,revision:0},choices:[],toppings:[],serving:'takeaway' as const,note:''});

it('memisahkan snapshot batch tambahan dan hanya merencanakan unit baru',()=>{
 const first=base(),head={storeId:'store',orderId:first.orderId,cashSessionId:first.cashSessionId,batchCount:1,pending:[line()]};
 const batch=makeAdditionalBatch(head,first,2,'2026-11-19T01:00:00.000Z',head.pending,[{skuId:uuid(5),groupId:'group'}]);
 expect(batch).toMatchObject({number:2,orderId:first.orderId,draft:{items:[{unitIds:[uuid(7),uuid(8)]}]}});
 expect(planAdditionalBatchDebits(batch,[{groupId:'group',balance:2}])).toMatchObject({ok:true,debits:[{required:2,before:2,after:0}]});
 expect(planAdditionalBatchDebits(batch,[{groupId:'group',balance:1}])).toMatchObject({ok:false,shortages:[{groupId:'group',required:2,available:1}]});
});

it('mengizinkan pending kosong tetapi menolak unit yang dipakai ulang atau nomor batch loncat',()=>{
 const first=base(),empty={storeId:'store',orderId:first.orderId,cashSessionId:first.cashSessionId,batchCount:1,pending:[]};
 expect(()=>validateOrderAdditions(empty)).not.toThrow();
 expect(()=>makeAdditionalBatch(empty,first,3,'2026-11-19T01:00:00.000Z',[],[])).toThrow();
 const reused={...empty,pending:[{...line(),unitIds:[first.items[0].unitIds[0]]}]};
 expect(()=>validateOrderAdditions(reused)).not.toThrow();
 expect(()=>makeAdditionalBatch(reused,first,2,'2026-11-19T01:00:00.000Z',reused.pending,[{skuId:uuid(5),groupId:'group'}])).toThrow();
});
