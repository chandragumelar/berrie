import { describe,expect,it } from 'vitest';
import { freezeSettlement } from './settlement';
import { calculateReports, calculateDailyReports, type Sale } from './reports';
const source={orderId:'order',settlementId:'settlement:order',paymentId:'payment:order',operationId:'sale',settlementOperationId:'sale',recordedAt:'2026-11-01T00:00:00Z',cashSessionId:'session'};
const names={a:'Kopi',b:'Kopi',c:'Teh'};
describe('report aggregation',()=>{
 it('conserves original allocations for discounts, toppings, tax, service and refund in another period',()=>{
  const settlement=freezeSettlement('order',[{unitIds:['a','b'],skuId:'sku',skuPrice:10000,toppingPrice:1000,promo:{kind:'none',revision:0}},{unitIds:['c'],skuId:'tea',skuPrice:5000,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'amount',value:1000},1000,500,'payment');
  const sale:Sale={source,settlement,names,method:'cash'};const refund={source:{...source,operationId:'refund',refundId:'refund'},settlement,names,unitIds:['a'],method:'qris' as const};const all=calculateReports({sales:[sale],refunds:[refund],classifications:[]});const a=settlement.totals.allocations.find(x=>x.id==='a')!;
  expect(all.totals).toMatchObject({gross:27000,discount:1000,base:26000,tax:2600,service:1300,bill:29900,refundBase:a.base,refundTax:a.tax,refundService:a.service,refund:a.total,netValue:29900-a.total});expect(all.skuByValue.find(x=>x.skuId==='sku')).toMatchObject({sold:2,refunded:1,net:1,netBase:settlement.totals.allocations.find(x=>x.id==='b')!.base});
  const later=calculateReports({sales:[],refunds:[refund],classifications:[]});expect(later.totals.netReceipts).toBe(-a.total);expect(later.skuByValue[0]).toMatchObject({sold:0,refunded:1,net:-1,netBase:-a.base});
 });
 it('keeps SKU promotions and quantity promotion in the settlement allocation',()=>{
  const identity={toppings:[],choices:[],serving:'takeaway' as const,note:''};const settlement=freezeSettlement('order',[{unitIds:['a','b'],skuId:'sku',skuPrice:10000,toppingPrice:1000,promo:{kind:'buyXGetY',buy:1,free:1,promotionId:'promo',revision:1},identity}],{kind:'none'},1000,0,'payment');const r=calculateReports({sales:[{source,settlement,names,method:'cash'}],refunds:[],classifications:[]});expect(r.totals).toMatchObject({gross:22000,promo:10000,base:12000,tax:1200,bill:13200});expect(r.skuByValue[0]).toMatchObject({netBase:12000,freeUnits:1});
 });
 it('keeps classification legs separate and zero-sum, and checks overflow',()=>{
  const settlement=freezeSettlement('order',[{unitIds:['a'],skuId:'sku',skuPrice:10,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'none'},0,0,'payment');const sale:Sale={source,settlement,names,method:'cash'};const r=calculateReports({sales:[sale],refunds:[],classifications:[{source,from:'cash',to:'qris',amount:10,administrative:false},{source,from:'qris',to:'transfer',amount:10,administrative:true}]});expect(r.methods.map(x=>x.net)).toEqual([0,0,10,0]);expect(r.totals.bill).toBe(10);expect(()=>calculateReports({sales:[],refunds:[],classifications:[{source,from:'cash',to:'qris',amount:Number.MAX_SAFE_INTEGER,administrative:false},{source,from:'cash',to:'qris',amount:1,administrative:false}]})).toThrow();
 });
 it('separates zero-value units and full refunds with deterministic ordering',()=>{
  const free=freezeSettlement('free',[{unitIds:['a'],skuId:'z',skuPrice:100,toppingPrice:0,promo:{kind:'percent',value:10000,revision:1}}],{kind:'none'},0,0,'free');const paid=freezeSettlement('order',[{unitIds:['b','c'],skuId:'a',skuPrice:100,toppingPrice:0,promo:{kind:'amount',value:10,revision:1}}],{kind:'none'},0,0,'payment');const r=calculateReports({sales:[{source:{...source,orderId:'free',paymentId:null},settlement:free,names,method:null},{source,settlement:paid,names,method:'cash'}],refunds:[{source:{...source,refundId:'r'},settlement:paid,names,unitIds:['b','c'],method:'cash'}],classifications:[]});expect(r.totals).toMatchObject({promo:120,freeSettlements:1,paymentCount:1,refund:180,netReceipts:0,averagePayment:180});expect(r.skuByValue.find(x=>x.skuId==='z')).toMatchObject({freeUnits:1,sold:1,netBase:0});expect(r.skuByValue.map(x=>x.skuId)).toEqual(['a','z']);
 });

});

it('reconciles all additive daily totals, including a refund-only day and classification',()=>{
 const settlement=freezeSettlement('order',[{unitIds:['a'],skuId:'sku',skuPrice:10000,toppingPrice:1000,promo:{kind:'amount',value:1000,revision:1}}],{kind:'none'},1000,500,'payment');
 const input={sales:[{source:{...source,recordedAt:'2026-11-01T16:59:59Z'},settlement,names,method:'cash' as const}],refunds:[{source:{...source,recordedAt:'2026-11-01T17:00:00Z',operationId:'refund',refundId:'r'},settlement,names,unitIds:['a'],method:'cash' as const}],classifications:[{source:{...source,recordedAt:'2026-11-01T17:00:00Z'},from:'cash' as const,to:'qris' as const,amount:100,administrative:true}]};
 const period=calculateReports(input),days=calculateDailyReports(input,'Asia/Jakarta');expect(days.map(d=>d.date)).toEqual(['2026-11-01','2026-11-02']);expect(days[1].totals.netValue).toBe(-settlement.totals.total);expect(days[1].methods[1].adjustment).toBe(100);
 for(const key of Object.keys(period.totals) as (keyof typeof period.totals)[])if(key!=='averagePayment')expect(days.reduce((sum,d)=>sum+d.totals[key],0),key).toBe(period.totals[key]);
 expect(days[0].totals.averagePayment).toBe(period.totals.averagePayment);expect(days[1].totals.averagePayment).toBe(0);
});
