import type { AdditionalBatch } from './order-additions';
import type { CashPayment, NoncashPayment } from './payment';
import type { FirstBatch } from './first-batch';
import type { SettlementSnapshot } from './settlement';

export type PrintKind='kitchen'|'customer';
export type PrintMode='original'|'copy';
export type PaperWidth='58'|'80';
export interface PrintedLine { name:string; quantity:number; choices:string[]; toppings:string[]; note:string; serving:'dine_in'|'takeaway'; cancelledQuantity:number }
export interface PrintableDocument {
 id:string; jobKey:string; orderId:string; kind:PrintKind; batch:number|null; title:'DAPUR'|'TAMBAHAN'|'LUNAS'; orderNumber:string; customer:string; at:string; timeZone:string; lines:PrintedLine[];
 settlement?:{total:number;method:'cash'|'qris'|'transfer'|'ewallet'|'free';received?:number;change?:number};
 mode:PrintMode; copiedAt?:string;
}

const date=(value:string,zone:string)=>new Intl.DateTimeFormat('id-ID',{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const line=(item:{name:string;unitIds:string[];choices:{name:string}[];toppings:{name:string}[];note:string;serving:'dine_in'|'takeaway'},cancelled:Set<string>):PrintedLine=>({name:item.name,quantity:item.unitIds.length,choices:item.choices.map(x=>x.name),toppings:item.toppings.map(x=>x.name),note:item.note,serving:item.serving,cancelledQuantity:item.unitIds.filter(id=>cancelled.has(id)).length});
const customer=(draft:FirstBatch['draft'])=>draft.customer.trim()||'Pelanggan';

export function kitchenDocument(batch:FirstBatch|AdditionalBatch,timeZone:string,cancelledIds:string[]=[],mode:PrintMode='original',copiedAt?:string):PrintableDocument {
 const cancelled=new Set(cancelledIds), addition=batch.number>1;
 return {id:`${addition?'kitchen-addition':'kitchen'}:${batch.draft.orderId}:${batch.number}`,jobKey:`${addition?'kitchen-addition':'kitchen'}:${batch.draft.orderId}:${batch.number}`,orderId:batch.draft.orderId,kind:'kitchen',batch:batch.number,title:addition?'TAMBAHAN':'DAPUR',orderNumber:batch.draft.displayNumber,customer:customer(batch.draft),at:batch.confirmedAt,timeZone,lines:batch.draft.items.map(item=>line(item,cancelled)),mode,...(copiedAt?{copiedAt}: {})};
}

export function customerDocument(batch:FirstBatch|AdditionalBatch|[FirstBatch,AdditionalBatch],payment:CashPayment|NoncashPayment|undefined,settlement:SettlementSnapshot,timeZone:string,mode:PrintMode='original',copiedAt?:string):PrintableDocument {
 const batches=Array.isArray(batch)?batch:[batch], first=batches[0];
 const method=settlement.source==='free'?'free':payment?.method;
 if(!method) throw new Error('Settlement pelanggan tidak sah');
 return {id:`customer:${first.draft.orderId}`,jobKey:`customer:${first.draft.orderId}`,orderId:first.draft.orderId,kind:'customer',batch:null,title:'LUNAS',orderNumber:first.draft.displayNumber,customer:customer(first.draft),at:payment?.paidAt??first.confirmedAt,timeZone,lines:batches.flatMap(current=>current.draft.items.map(item=>line(item,new Set()))),settlement:{total:settlement.totals.total,method,...(payment?.method==='cash'?{received:payment.received,change:payment.change}:{})},mode,...(copiedAt?{copiedAt}: {})};
}

export function formatPrintDocument(document:PrintableDocument,width:PaperWidth):string {
 const cap=width==='58'?32:44, rule='-'.repeat(cap), wrap=(value:string)=>value.match(new RegExp(`.{1,${cap}}(?:\\s|$)|.{1,${cap}}`, 'g'))??[''];
 const rows:string[]=[];const add=(value:string)=>rows.push(...wrap(value));
 if(document.mode==='copy')add('SALINAN');add(document.title);add(`Pesanan ${document.orderNumber}`);add(`Pelanggan ${document.customer}`);add(`Waktu ${date(document.copiedAt??document.at,document.timeZone)}`);if(document.batch)add(`Batch ${document.batch}`);rows.push(rule);
 for(const item of document.lines){rows.push(...wrap(`${item.quantity} × ${item.name}`));if(item.choices.length)rows.push(...wrap(`  Varian: ${item.choices.join(', ')}`));if(item.toppings.length)rows.push(...wrap(`  Topping: ${item.toppings.join(', ')}`));if(item.note)rows.push(...wrap(`  Catatan: ${item.note}`));rows.push(`  ${item.serving==='dine_in'?'Makan di tempat':'Bungkus'}`);if(item.cancelledQuantity)rows.push(`  BATAL ${item.cancelledQuantity} — cek dapur`);}
 if(document.settlement){const s=document.settlement,method={cash:'Tunai',qris:'QRIS',transfer:'Transfer',ewallet:'E-wallet',free:'GRATIS'}[s.method],rupiah=(n:number)=>`Rp${n.toLocaleString('id-ID')}`;rows.push(rule);add(`TOTAL ${rupiah(s.total)}`);add(method);if(s.method==='cash'){add(`Diterima ${rupiah(s.received??0)}`);add(`Kembali ${rupiah(s.change??0)}`);}if(s.method==='free')add('GRATIS');}
 if(document.mode==='copy'){rows.push(rule);add('SALINAN — periksa tiket asal');}return rows.filter(Boolean).join('\n');
}
