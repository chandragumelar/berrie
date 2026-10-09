import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,quoteSKU,makeUnits,createOrder,reduceAction,type Action} from './domain.ts';
import {assignDiscount,validateDiscount} from './discounts.ts';
import {catalogRows} from './catalog.ts';
import {dateInputValue,dateInputTimestamp} from './local-date.ts';
const startsAt=Date.UTC(2026,9,10,1),endsAt=startsAt+60000;
const a=(data:Record<string,unknown>):Action=>({kind:'discountDefinition',activity:'Pengaturan',amount:0,reason:'Jadwal',data});
test('store date input is minute-precise and independent of browser zone',()=>{
 assert.equal(dateInputValue(startsAt,'Asia/Jakarta'),'2026-10-10T08:00');
 for(const zone of ['Asia/Jakarta','Asia/Makassar','Asia/Jayapura','America/New_York'])assert.equal(dateInputTimestamp(dateInputValue(startsAt,zone),zone),startsAt);
 for(const invalid of ['2026-02-30T08:00','2026-10-10T24:00','T08:00','2026-10-10T','2026-10-10T08:00:01'])assert.throws(()=>dateInputTimestamp(invalid,'Asia/Jakarta'));
});
test('invalid and partial schedules reject the entire definition mutation',()=>{
 const s=fixture(),before=structuredClone(s);
 for(const window of [{startsAt},{endsAt},{startsAt,endsAt:startsAt},{startsAt,endsAt:startsAt-60000},{startsAt:startsAt+1,endsAt},{startsAt:NaN,endsAt},{startsAt:'bad',endsAt}])assert.throws(()=>reduceAction(s,a({name:'Test',mode:'amount',value:1000,...window}),'bad'));
 assert.deepEqual(s,before);assert.equal(validateDiscount({name:'Anytime',mode:'amount',value:1000}).startsAt,undefined);
});
test('percent, amount and quantity discounts start inclusive and end exclusive; assignments stay channel-specific',()=>{
 for(const mode of ['percent','amount','bogo'] as const){
  const s=reduceAction(fixture(),a({name:'Jadwal',mode,value:1000,buy:1,free:1,startsAt,endsAt}),'define'),sku=s.catalog.find(x=>x.id==='teh')!;
  assignDiscount(s,sku,'Toko',s.discounts!.at(-1)!.id);
  for(const [at,active] of [[startsAt-1,false],[startsAt,true],[endsAt-1,true],[endsAt,false]] as const){assert.equal(quoteSKU(sku,'Toko',at).promoMode,active?mode:'none');assert.equal(quoteSKU(sku,'GoFood',at).promoMode,'none');}
 }
});
test('time transitions update Promo filter and names, preserving selected unit snapshots and explicit refresh rules',t=>{
 t.mock.method(Date,'now',()=>startsAt);
 let s=reduceAction(fixture(),a({name:'BOGO',mode:'bogo',buy:1,free:1,startsAt,endsAt}),'define');const sku=s.catalog.find(x=>x.id==='teh')!;assignDiscount(s,sku,'Toko',s.discounts!.at(-1)!.id);
 s=reduceAction(s,{kind:'open',activity:'Rutin',data:{amount:100000},reason:'',amount:0},'open');
 const o=createOrder(s);o.units=makeUnits(s,o,sku,2,[],'Bungkus','');s.orders.push(o);const snapshot=structuredClone(o.units);
 assert.match(catalogRows(s.catalog,'Toko','','Promo').find(x=>x.key===sku.id)!.name,/Beli 1 gratis 1/);
 t.mock.method(Date,'now',()=>endsAt);
 assert.equal(catalogRows(s.catalog,'Toko','','Promo').some(x=>x.key===sku.id),false);assert.doesNotMatch(catalogRows(s.catalog,'Toko','','Semua').find(x=>x.key===sku.id)!.name,/gratis/);
 assert.equal(makeUnits(s,createOrder(s),sku,2,[],'Bungkus','')[0].promoMode,'none');assert.deepEqual(o.units,snapshot);
 const refreshed=reduceAction(s,{kind:'refresh',activity:'Rutin',order:o.id,revision:o.revision,data:{},reason:'Pakai harga terbaru',amount:0},'refresh');assert.equal(refreshed.orders[0].units[0].promoMode,'none');
 s=reduceAction(s,a({id:s.discounts!.at(-1)!.id,name:'BOGO',mode:'bogo',buy:1,free:1}),'remove-window');assert.equal(quoteSKU(s.catalog.find(x=>x.id===sku.id)!,'Toko').promoMode,'bogo');assert.deepEqual(s.orders[0].units,snapshot);
});
