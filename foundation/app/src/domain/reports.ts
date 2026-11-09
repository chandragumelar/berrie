import { halfUp } from './money';
import type { PaymentMethod } from './payment';
import type { SettlementSnapshot } from './settlement';

export interface ReportSource { orderId:string; settlementId:string; paymentId:string|null; operationId:string; settlementOperationId:string; recordedAt:string; cashSessionId:string }
export interface Sale { source:ReportSource; settlement:SettlementSnapshot; names:Record<string,string>; method:PaymentMethod|null }
export interface Refund { source:ReportSource & {refundId:string}; settlement:SettlementSnapshot; names:Record<string,string>; unitIds:string[]; method:PaymentMethod }
export interface Classification { source:ReportSource; from:PaymentMethod; to:PaymentMethod; amount:number; administrative:boolean }
export interface ReportInput { sales:Sale[]; refunds:Refund[]; classifications:Classification[] }
const methods:PaymentMethod[]=['cash','qris','transfer','ewallet'];
function add(a:number,b:number):number {const n=BigInt(a)+BigInt(b);if(n>BigInt(Number.MAX_SAFE_INTEGER)||n< -BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Agregat di luar batas');return Number(n);}
/** Reduces only already validated, selected events. Values use the original allocations. */
export function calculateReports(input:ReportInput) {
 const totals={gross:0,promo:0,discount:0,base:0,tax:0,service:0,bill:0,refundGross:0,refundPromo:0,refundDiscount:0,refundBase:0,refundTax:0,refundService:0,refund:0,netBase:0,netTax:0,netService:0,netValue:0,netReceipts:0,paymentCount:0,freeSettlements:0,averagePayment:0};
 const methodRows=Object.fromEntries(methods.map(method=>[method,{method,receipts:0,refunds:0,correction:0,adjustment:0,net:0}])) as Record<PaymentMethod,{method:PaymentMethod;receipts:number;refunds:number;correction:number;adjustment:number;net:number}>;
 const skus=new Map<string,{skuId:string;names:string[];sold:number;refunded:number;net:number;freeUnits:number;netBase:number;sources:(ReportSource & {refundId?:string;unitId:string})[]}>();
 function sku(id:string,name:string) {let row=skus.get(id);if(!row){row={skuId:id,names:[],sold:0,refunded:0,net:0,freeUnits:0,netBase:0,sources:[]};skus.set(id,row);}if(!row.names.includes(name))row.names.push(name);return row;}
 for(const sale of input.sales) {
  const t=sale.settlement.totals;for(const [k,v] of [['gross',t.subtotal],['promo',t.promo],['discount',t.discount],['base',t.base],['tax',t.tax],['service',t.service],['bill',t.total]] as const) totals[k]=add(totals[k],v);
  if(sale.method){totals.paymentCount=add(totals.paymentCount,1);methodRows[sale.method].receipts=add(methodRows[sale.method].receipts,t.total);}else totals.freeSettlements=add(totals.freeSettlements,1);
  const promoGroups=new Map<string,typeof sale.settlement.units>();
  for(const unit of sale.settlement.units){const allocation=t.allocations.find(a=>a.id===unit.id)!;const row=sku(unit.skuId,sale.names[unit.id]);row.sold=add(row.sold,1);if(unit.promo.kind==='buyXGetY'){const key=JSON.stringify(unit.groupUnitIds);const group=promoGroups.get(key)??[];group.push(unit);promoGroups.set(key,group);}else if(allocation.total===0)row.freeUnits=add(row.freeUnits,1);row.netBase=add(row.netBase,allocation.base);row.sources.push({...sale.source,unitId:unit.id});}
  for(const group of promoGroups.values()){const p=group[0].promo;if(p.kind!=='buyXGetY')throw new Error('Promo tidak sah');const zero=group.filter(u=>t.allocations.find(a=>a.id===u.id)!.total===0).length;const quantity=Math.floor(group.length/(p.buy+p.free))*p.free;const row=sku(group[0].skuId,sale.names[group[0].id]);row.freeUnits=add(row.freeUnits,Math.max(zero,quantity));}
 }
 for(const refund of input.refunds) for(const id of refund.unitIds){const u=refund.settlement.units.find(x=>x.id===id)!;const a=refund.settlement.totals.allocations.find(x=>x.id===id)!;for(const [k,v] of [['refundGross',add(u.skuPrice,u.toppingPrice)],['refundPromo',u.promoAmount],['refundDiscount',a.discount],['refundBase',a.base],['refundTax',a.tax],['refundService',a.service],['refund',a.total]] as const) totals[k]=add(totals[k],v);methodRows[refund.method].refunds=add(methodRows[refund.method].refunds,a.total);const row=sku(u.skuId,refund.names[id]);row.refunded=add(row.refunded,1);row.netBase=add(row.netBase,-a.base);row.sources.push({...refund.source,unitId:id});}
 for(const c of input.classifications){const field=c.administrative?'adjustment':'correction';methodRows[c.from][field]=add(methodRows[c.from][field],-c.amount);methodRows[c.to][field]=add(methodRows[c.to][field],c.amount);}
 totals.netBase=add(totals.base,-totals.refundBase);totals.netTax=add(totals.tax,-totals.refundTax);totals.netService=add(totals.service,-totals.refundService);totals.netValue=add(totals.bill,-totals.refund);totals.netReceipts=add(input.sales.reduce((n,s)=>add(n,s.method?s.settlement.paymentAmount:0),0),-totals.refund);totals.averagePayment=totals.paymentCount?halfUp(BigInt(input.sales.reduce((n,s)=>add(n,s.method?s.settlement.paymentAmount:0),0)),BigInt(totals.paymentCount)):0;
 for(const row of Object.values(methodRows))row.net=add(add(row.receipts,-row.refunds),add(row.correction,row.adjustment));
 const skuRows=[...skus.values()];for(const row of skuRows){row.net=add(row.sold,-row.refunded);row.names.sort();row.sources.sort((a,b)=>a.operationId.localeCompare(b.operationId)||a.unitId.localeCompare(b.unitId));}
 return {totals,methods:Object.values(methodRows),skuByValue:[...skuRows].sort((a,b)=>b.netBase-a.netBase||a.skuId.localeCompare(b.skuId)),skuByQuantity:[...skuRows].sort((a,b)=>b.net-a.net||a.skuId.localeCompare(b.skuId)),details:input};
}

/** Group selected events by local calendar date, using the same reducer as the period. */
export function calculateDailyReports(input:ReportInput, zone:string) {
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 const groups=new Map<string,ReportInput>();
 function group(time:string) {const parts=formatter.formatToParts(new Date(time));const date=['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');let value=groups.get(date);if(!value){value={sales:[],refunds:[],classifications:[]};groups.set(date,value);}return value;}
 for(const e of input.sales)group(e.source.recordedAt).sales.push(e);
 for(const e of input.refunds)group(e.source.recordedAt).refunds.push(e);
 for(const e of input.classifications)group(e.source.recordedAt).classifications.push(e);
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,events])=>({date,...calculateReports(events)}));
}
