import type {State, Order, Unit} from './domain.ts';
import {storeDate} from './history-dates.ts';
export interface ReportScope {kind:'session'|'dates';from:string;to:string;session:string;zone:string}
export interface ReportEvent {id:string;kind:'Penjualan'|'Refund'|'Pembalikan platform';time:number;order:Order;method:string;total:number;base:number;tax:number;service:number;units:Unit[]}
export function inReportScope(scope:ReportScope,time:number,session?:string) {
 if(scope.kind==='session')return session===scope.session;
 if(!scope.from||!scope.to||scope.to<=scope.from)return false;
 const date=storeDate(time,scope.zone);return date>=scope.from&&date<scope.to;
}
/** Prototype read model: settlement snapshots and dated refund audit events, never order.refund totals. */
export function salesReport(s:State,scope:ReportScope){
 const orders=s.orders.filter(o=>o.settlement&&inReportScope(scope,o.settlement.time,o.session));
 const events:ReportEvent[]=orders.map(o=>{const t=o.settlement!;return{id:o.id,kind:'Penjualan',time:t.time,order:o,method:t.method,total:t.total,base:t.subtotal-t.discount,tax:t.tax,service:t.service,units:o.units.filter(u=>u.allocation)};});
 let incomplete=0;
 for(const a of s.audits){
  if(a.action!=='refund'||!inReportScope(scope,a.time,a.session))continue;
  const o=s.orders.find(o=>o.number===a.object);
  const units=o?.units.filter(u=>a.units?.includes(u.id))??[];
  if(!o?.settlement||!a.refundMethod||!a.units?.length||units.length!==a.units.length||units.some(u=>!u.allocation)){incomplete++;continue;}
  const sum=(key:'total'|'base'|'tax'|'service')=>units.reduce((n,u)=>n+u.allocation![key],0);
  events.push({id:a.id,kind:a.refundMethod==='Platform'?'Pembalikan platform':'Refund',time:a.time,order:o,method:a.refundMethod,total:sum('total'),base:sum('base'),tax:sum('tax'),service:sum('service'),units});
 }
 // Missing dates in older snapshots must not silently look like a complete period.
 const untraced=s.orders.filter(o=>{
  const actual=o.refund+(o.platform?.reversed??0);
  if(!actual)return false;
  const recorded=s.audits.filter(a=>a.action==='refund'&&a.object===o.number&&a.refundMethod&&a.units?.length).reduce((n,a)=>n+o.units.filter(u=>a.units!.includes(u.id)).reduce((n,u)=>n+(u.allocation?.total??0),0),0);
  return actual>recorded;
 }).length;
 incomplete=Math.max(incomplete,untraced);
 const sales=events.filter(e=>e.kind==='Penjualan'),refunds=events.filter(e=>e.kind==='Refund'),reversals=events.filter(e=>e.kind==='Pembalikan platform');
 const sum=(xs:ReportEvent[],key:'total'|'base'|'tax'|'service')=>xs.reduce((n,e)=>n+e[key],0);
 const gross=orders.reduce((n,o)=>n+o.settlement!.subtotal,0),discounts=orders.reduce((n,o)=>n+o.settlement!.discount,0);
 const skuDiscount=orders.reduce((n,o)=>n+(o.settlement!.skuDiscount??0),0),orderDiscount=discounts-skuDiscount;
 const paid=sales.filter(e=>e.order.settlement!.source==='Payment'&&e.total>0),payments=sum(paid,'total');
 const menu=new Map<string,{id:string;name:string;sold:number;refunded:number;free:number;base:number;orders:Order[]}>();
 for(const e of events)for(const u of e.units){
  const row=menu.get(u.sku)??{id:u.sku,name:u.name,sold:0,refunded:0,free:0,base:0,orders:[]};
  if(e.kind==='Penjualan'){row.sold++;if(u.allocation!.total===0)row.free++;row.base+=u.allocation!.base;}else{row.refunded++;row.base-=u.allocation!.base;}
  if(!row.orders.some(o=>o.id===e.order.id))row.orders.push(e.order);
  menu.set(u.sku,row);
 }
 const methods=[...new Set([...paid.map(e=>e.method),...refunds.map(e=>e.method)])].map(method=>({method,received:sum(paid.filter(e=>e.method===method),'total'),refund:sum(refunds.filter(e=>e.method===method),'total')}));
 return {orders,events:events.sort((a,b)=>b.time-a.time),gross,discounts,skuDiscount,orderDiscount,salesBase:gross-discounts,salesNet:sum(sales,'base')-sum(refunds,'base')-sum(reversals,'base'),taxNet:sum(sales,'tax')-sum(refunds,'tax')-sum(reversals,'tax'),serviceNet:sum(sales,'service')-sum(refunds,'service')-sum(reversals,'service'),payments,refunds:sum(refunds,'total'),reversals:sum(reversals,'total'),refundBase:sum([...refunds,...reversals],'base'),receiptsNet:payments-sum(refunds,'total'),paidCount:paid.length,freeCount:sales.filter(e=>e.total===0).length,average:paid.length?Number((BigInt(payments)*2n+BigInt(paid.length))/(2n*BigInt(paid.length))):0,methods,menu:[...menu.values()].sort((a,b)=>(b.sold-b.refunded)-(a.sold-a.refunded)||b.base-a.base||a.name.localeCompare(b.name,'id')),incomplete};
}
export type SalesReport=ReturnType<typeof salesReport>;
export function reportCSV(report:SalesReport,scope:ReportScope){
 const rows:unknown[][]=[['id_kejadian','jenis','waktu','zona','sesi_asal','nomor','metode','nilai_bertanda','dasar_bertanda','pajak_bertanda','layanan_bertanda','cakupan','awal_inklusif','akhir_eksklusif'],...report.events.map(e=>{const sign=e.kind==='Penjualan'?1:-1;return[e.id,e.kind,new Date(e.time).toISOString(),scope.zone,e.order.session,e.order.number,e.method,sign*e.total,sign*e.base,sign*e.tax,sign*e.service,scope.kind==='session'?scope.session:'Tanggal kalender toko',scope.kind==='dates'?scope.from:'',scope.kind==='dates'?scope.to:''];})];
 const escape=(v:unknown)=>{let x=String(v??'');if(/^\s*[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';};
 return '\uFEFF'+rows.map(r=>r.map(escape).join(',')).join('\r\n');
}

/** Calendar rows use the same event clock and components as the selected report. No inferred trading days. */
export function dailyReport(report:SalesReport,zone:string){
 const days=new Map<string,{date:string;sales:number;receipts:number;refunds:number;paidCount:number}>();
 for(const e of report.events){const date=storeDate(e.time,zone),row=days.get(date)??{date,sales:0,receipts:0,refunds:0,paidCount:0};
  if(e.kind==='Penjualan'){row.sales+=e.base;if(e.order.settlement!.source==='Payment'&&e.total>0){row.receipts+=e.total;row.paidCount++;}}
  if(e.kind==='Refund'){row.receipts-=e.total;row.refunds+=e.total;}days.set(date,row);
 }
 return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
