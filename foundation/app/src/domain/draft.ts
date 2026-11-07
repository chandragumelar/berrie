import { integer } from './money';
import { freezeSettlement, type Discount, type Promo, type SaleLine } from './settlement';

export interface DraftChoice { id:string; name:string }
export interface DraftTopping { id:string; name:string; price:number }
export interface DraftItem { id:string; unitIds:string[]; skuId:string; name:string; skuPrice:number; toppingPrice:number; promo:Promo; choices:DraftChoice[]; toppings:DraftTopping[]; serving:'dine_in'|'takeaway'; note:string }
export interface OrderDraft { orderId:string; displayNumber:string; cashSessionId:string; customer:string; channel:'store'|'gofood'|'grabfood'|'shopeefood'; channelAccountId:string; externalOrderId:string; serving:'dine_in'|'takeaway'; note:string; savedAt:string; sourceOrderId?:string; items:DraftItem[]; discount:Discount; taxBp:number; serviceBp:number }
function obj(v:unknown): asserts v is Record<string,unknown> { if(!v || typeof v!=='object' || Array.isArray(v) || Object.getPrototypeOf(v)!==Object.prototype) throw new Error('Draft tidak sah'); }
function str(v:unknown,max:number,required=false): asserts v is string { if(typeof v!=='string' || v.length>max || (required && !v.trim())) throw new Error('Teks draft tidak sah'); }
function uuid(v:unknown): asserts v is string { if(typeof v!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) throw new Error('UUID tidak sah'); }
function ids(v:unknown): asserts v is string[] { if(!Array.isArray(v)) throw new Error('Unit tidak sah'); for(const x of v) uuid(x); if(new Set(v).size!==v.length) throw new Error('Unit duplikat'); }
function serving(v:unknown): asserts v is 'dine_in'|'takeaway' { if(v!=='dine_in' && v!=='takeaway') throw new Error('Penyajian tidak sah'); }
function validateDiscount(v:unknown): asserts v is Discount { obj(v);if(v.kind==='none')return;if(v.kind==='amount'){integer(v.value);return;}if(v.kind==='percent'){integer(v.value,0,10000);return;}throw new Error('Diskon tidak sah'); }
function validatePromo(v:unknown): asserts v is Promo {obj(v);integer(v.revision,0,Number.MAX_SAFE_INTEGER);if(v.kind==='none')return;if(v.kind==='amount'){integer(v.value);return;}if(v.kind==='percent'){integer(v.value,0,10000);return;}if(v.kind==='buyXGetY'){integer(v.buy,1,99);integer(v.free,1,99);str(v.promotionId,200,true);return;}throw new Error('Promo tidak sah');}
function selections(v:unknown, topping:boolean):{ids:string[]; price:number} {
 if(!Array.isArray(v)) throw new Error('Pilihan tidak sah');const seen=new Set<string>();let total=0;
 for(const entry of v) {obj(entry);uuid(entry.id);str(entry.name,80,true);if(seen.has(entry.id)) throw new Error('Pilihan duplikat');seen.add(entry.id);if(topping){total+=integer(entry.price);integer(total);}}
 return {ids:[...seen],price:total};
}
/** Validates persisted draft data and calculates a quote without creating a settlement. */
export function validateDraft(v:unknown): asserts v is OrderDraft {
 obj(v);uuid(v.orderId);str(v.displayNumber,200,true);uuid(v.cashSessionId);
 if(!/^\d{6}-E[1-9]\d*-\d{4,}$/.test(v.displayNumber)) throw new Error('Nomor pesanan tidak sah');
 str(v.customer,80,true);str(v.note,500);str(v.channelAccountId,200);str(v.externalOrderId,200);str(v.savedAt,40,true);
 if(v.sourceOrderId!==undefined)uuid(v.sourceOrderId);
 if(Number.isNaN(Date.parse(v.savedAt))) throw new Error('Waktu draft tidak sah');
 if(v.channel!=='store' && v.channel!=='gofood' && v.channel!=='grabfood' && v.channel!=='shopeefood') throw new Error('Channel tidak sah');
 if(v.channel!=='store') {uuid(v.channelAccountId);if(!v.externalOrderId.trim() || v.externalOrderId!==v.externalOrderId.trim()) throw new Error('Identitas platform wajib');}
 serving(v.serving);validateDiscount(v.discount);const taxBp=integer(v.taxBp,0,10000),serviceBp=integer(v.serviceBp,0,10000);
 if(!Array.isArray(v.items) || !v.items.length) throw new Error('Item wajib');
 const lines:SaleLine[]=[],itemIds=new Set<string>(),units=new Set<string>();
 for(const item of v.items) {
  obj(item);uuid(item.id);uuid(item.skuId);str(item.name,80,true);str(item.note,200);const skuPrice=integer(item.skuPrice),toppingPrice=integer(item.toppingPrice);validatePromo(item.promo);const choices=selections(item.choices,false),toppings=selections(item.toppings,true);if(toppingPrice!==toppings.price)throw new Error('Harga topping tidak sesuai');serving(item.serving);ids(item.unitIds);integer(item.unitIds.length,1,999);
  if(itemIds.has(item.id))throw new Error('Item duplikat');itemIds.add(item.id);for(const id of item.unitIds){if(units.has(id))throw new Error('Unit duplikat');units.add(id);}
  lines.push({unitIds:item.unitIds,skuId:item.skuId,skuPrice,toppingPrice,promo:item.promo,identity:{choices:choices.ids,toppings:toppings.ids,serving:item.serving,note:item.note}});
 }
 quote(v.orderId,lines,v.discount,taxBp,serviceBp);
}
function quote(orderId:string,lines:SaleLine[],discount:Discount,taxBp:number,serviceBp:number) {
 try{return freezeSettlement(orderId,lines,discount,taxBp,serviceBp,'free').totals;}
 catch{return freezeSettlement(orderId,lines,discount,taxBp,serviceBp,'platform').totals;}
}
export function calculateDraft(draft:OrderDraft) {
 validateDraft(draft);
 return quote(draft.orderId,draft.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo,identity:{choices:i.choices.map(c=>c.id),toppings:i.toppings.map(t=>t.id),serving:i.serving,note:i.note}})),draft.discount,draft.taxBp,draft.serviceBp);
}

export function draftDateCode(time:string,zone:string):string {
 if(typeof time!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(time) || Number.isNaN(Date.parse(time))) throw new Error('Waktu pencatatan tidak sah');
 const normalized=time.includes('.')?time:time.replace('Z','.000Z');if(new Date(time).toISOString()!==normalized) throw new Error('Waktu pencatatan tidak sah');
 if(typeof zone!=='string' || !zone) throw new Error('Zona toko wajib');
 let parts:Intl.DateTimeFormatPart[];try {parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'2-digit',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));}catch {throw new Error('Zona toko tidak sah');}
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value ?? '').join('');
}
