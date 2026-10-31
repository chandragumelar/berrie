import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,createOrder,makeUnits,reduceAction,type State,type Order,type Action} from './domain.ts';
import {salesReport,reportCSV,type ReportScope} from './reports.ts';
const date=(d:string)=>Date.parse(d+'T05:00:00Z');
const scope:ReportScope={kind:'dates',from:'2026-10-13',to:'2026-10-14',zone:'Asia/Jakarta',session:'now'};
function paid(s:State,sku:string,qty:number,day:string,source:'Payment'|'Platform'='Payment'){
 const o=createOrder(s);o.identity='Rani';if(source==='Platform'){o.channel='GoFood';o.externalId='GF-'+o.id;}o.units=makeUnits(s,o,s.catalog.find(x=>x.id===sku)!,qty,[],'Bungkus','');s.orders.push(o);
 const action:Action={kind:'settle',activity:'Rutin',order:o.id,revision:o.revision,data:{source,method:'Tunai',received:'100000',verified:true},reason:'',amount:0};
 const next=reduceAction(s,action,o.id);next.orders.at(-1)!.settlement!.time=date(day);next.orders.at(-1)!.session='old';next.seq++;return next;
}
function refund(s:State,o:Order,day:string,method='QRIS'){
 const ids=[o.units[0].id];s.audits.push({id:'refund-'+o.id,time:date(day),actor:'owner',approver:'',action:'refund',object:o.number,amount:0,reason:'Refund',units:ids,session:'now',refundMethod:method});o.units[0].refunded=true;if(method==='Platform')o.platform!.reversed=o.units[0].allocation!.total;else o.refund=o.units[0].allocation!.total;
}
function start(){const s=fixture();s.settings.enabledChannels=['Toko','GoFood'];s.settings.channelAccounts={GoFood:'Kedai'};s.catalog.find(x=>x.id==='air')!.channelPrices.GoFood=5000;s.cash.open=true;s.cash.id='now';s.cash.segments=[{actor:'owner',baseline:100000,startExpected:100000,counts:[]}];s.cash.opening=100000;return s;}
test('refund from an earlier day uses its own date and actual refund method; net can be negative',()=>{
 const s=paid(start(),'air',1,'2026-10-12');refund(s,s.orders[0],'2026-10-13');const r=salesReport(s,scope);
 assert.equal(r.gross,0);assert.equal(r.refunds,5000);assert.equal(r.receiptsNet,-5000);assert.equal(r.salesNet,-5000);assert.deepEqual(r.methods,[{method:'QRIS',received:0,refund:5000}]);assert.equal(r.menu[0].sold,0);assert.equal(r.menu[0].refunded,1);
 const previous=salesReport(s,{...scope,from:'2026-10-12',to:'2026-10-13'});assert.equal(previous.receiptsNet,5000);assert.equal(previous.refunds,0);
});
test('session filter follows the refund session, not the order origin; exclusive dates use shop zone',()=>{
 const s=paid(start(),'air',1,'2026-10-12');refund(s,s.orders[0],'2026-10-13');assert.equal(salesReport(s,{...scope,kind:'session'}).receiptsNet,-5000);
 s.orders[0].settlement!.time=Date.parse('2026-10-13T17:00:00Z');assert.equal(salesReport(s,scope).orders.length,0);
 s.orders[0].settlement!.time=Date.parse('2026-10-12T17:00:00Z');assert.equal(salesReport(s,scope).orders.length,1);
 assert.equal(salesReport(s,{...scope,to:scope.from}).events.length,0);
});
test('platform reversals reduce sales but never direct receipts; unpaid drafts are excluded',()=>{
 const s=paid(start(),'air',2,'2026-10-13','Platform');refund(s,s.orders[0],'2026-10-13','Platform');const draft=createOrder(s);draft.units=makeUnits(s,draft,s.catalog.find(x=>x.id==='air')!,1,[],'Bungkus','');s.orders.push(draft);const r=salesReport(s,scope);assert.equal(r.salesNet,5000);assert.equal(r.receiptsNet,0);assert.equal(r.reversals,5000);assert.equal(r.paidCount,0);assert.equal(r.menu[0].sold,2);
});
test('menu ranking uses net quantity; split promo, taxes and refunds conserve components',()=>{
 let s=paid(start(),'air',2,'2026-10-13');s.settings.tax=1100;s.settings.service=500;s=paid(s,'teh',3,'2026-10-13');refund(s,s.orders[1],'2026-10-13');const r=salesReport(s,scope);assert.equal(r.menu[0].sold-r.menu[0].refunded,2);assert.equal(r.salesNet+r.taxNet+r.serviceNet,r.receiptsNet);assert.equal(r.skuDiscount+r.orderDiscount,r.discounts);assert.equal(r.average,13700);
});
test('filtered export includes dated refund from older orders, escapes formulas and records scope',()=>{
 const s=paid(start(),'air',1,'2026-10-12');refund(s,s.orders[0],'2026-10-13');s.orders[0].number='=CMD';s.audits.at(-1)!.object='=CMD';const r=salesReport(s,scope),csv=reportCSV(r,scope);assert.equal(r.events.length,1);assert.match(csv,/Refund/);assert.match(csv,/'=CMD/);assert.match(csv,/2026-10-14/);assert.doesNotMatch(csv,/"Penjualan"/);
});
test('incomplete legacy refund audit warns instead of assigning it to the original sale date',()=>{
 const s=paid(start(),'air',1,'2026-10-12');refund(s,s.orders[0],'2026-10-13');delete s.audits.at(-1)!.units;assert.equal(salesReport(s,scope).incomplete,1);
});
test('SKU promotion stays separate from order discount in the reporting snapshot',()=>{
 const initial=start();initial.catalog.find(x=>x.id==='air')!.promos={Toko:{mode:'percent',value:1000,name:'Hemat',active:true,revision:1}};
 const s=paid(initial,'air',2,'2026-10-13'),r=salesReport(s,scope);assert.equal(r.gross,10000);assert.equal(r.skuDiscount,1000);assert.equal(r.orderDiscount,0);assert.equal(r.salesBase,9000);assert.equal(r.receiptsNet,9000);
});
test('zero settlements are separate from paid transaction count and average',()=>{
 const s=start(),o=createOrder(s);o.identity='Gratis';o.units=makeUnits(s,o,s.catalog.find(x=>x.id==='air')!,1,[],'Bungkus','');o.discount=10000;o.discountType='percent';o.discountReason='Bonus';s.orders.push(o);
 const next=reduceAction(s,{kind:'settle',activity:'Rutin',order:o.id,revision:0,data:{source:'Gratis',method:'Gratis',received:'0'},reason:'Bonus',amount:0},'free');next.orders[0].settlement!.time=date('2026-10-13');
 const r=salesReport(next,scope);assert.equal(r.freeCount,1);assert.equal(r.paidCount,0);assert.equal(r.average,0);assert.equal(r.menu[0].free,1);assert.equal(r.orderDiscount,5000);
});

test('daily rows reconcile with period totals and separate old-order payment/refund clocks',async()=>{
 const {dailyReport}=await import('./reports.ts');let s=paid(start(),'air',2,'2026-10-12');
 s.orders[0].created=date('2026-10-10');s=paid(s,'teh',1,'2026-10-13');refund(s,s.orders[0],'2026-10-13');
 const r=salesReport(s,{...scope,from:'2026-10-12',to:'2026-10-14'}),days=dailyReport(r,scope.zone);
 assert.deepEqual(days.map(x=>x.date),['2026-10-12','2026-10-13']);assert.equal(days[0].sales,10000);assert.equal(days[1].receipts,0);
 assert.equal(days.reduce((n,d)=>n+d.sales,0),r.salesBase);assert.equal(days.reduce((n,d)=>n+d.receipts,0),r.receiptsNet);assert.equal(days.reduce((n,d)=>n+d.paidCount,0),r.paidCount);
 assert.deepEqual(dailyReport(salesReport(s,{...scope,from:'2026-10-01',to:'2026-10-02'}),scope.zone),[]);
});
