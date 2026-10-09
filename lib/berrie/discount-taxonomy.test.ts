import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction,createOrder,makeUnits,totals,unitFinal,quoteSKU,freezeAllocation,type Action,type State} from './domain.ts';
import {assignDiscount,rebalanceQuantityPromos} from './discounts.ts';
import {catalogDraft} from './workshop.ts';
import {catalogRows} from './catalog.ts';
const action=(kind:string,data:Action['data'],activity:Action['activity']='Pengaturan'):Action=>({kind,activity,data,reason:'Uji aturan baru',amount:0});
const define=(s:State,mode='bogo',buy=1,free=1,value=0)=>reduceAction(s,action('discountDefinition',{name:'Diskon uji',mode,buy,free,value}),'define');
const promoState=(buy=1,free=1,price=10000)=>{const s=define(fixture(),'bogo',buy,free),sku=s.catalog.find(x=>x.id==='teh')!;sku.price=price;sku.channelPrices.Toko=price;assignDiscount(s,sku,'Toko',s.discounts!.at(-1)!.id);return {s,sku};};

test('quantity promos generalize buy/free counts, remainder, odd rupiah, toppings and stock without float',()=>{
 for(const [buy,free] of [[1,1],[2,3],[2,1],[3,2]])for(let qty=1;qty<=16;qty++){
  const {s,sku}=promoState(buy,free,10001);sku.toppings=['shot'];const o=createOrder(s),units=makeUnits(s,o,sku,qty,['shot'],'Bungkus','');o.units=units;
  const paidMenu=(qty-Math.floor(qty/(buy+free))*free)*10001;
  assert.equal(totals(o).total,paidMenu+qty*5000);assert.equal(units.reduce((n,u)=>n+unitFinal(u),0),paidMenu+qty*5000);
  assert.ok(units.every(u=>Number.isSafeInteger(unitFinal(u))&&unitFinal(u)>=5000));assert.equal(sku.stock,1000);
  const before=structuredClone(units);freezeAllocation(o);assert.equal(o.units.reduce((n,u)=>n+u.allocation!.total,0),totals(o).total);assert.deepEqual(rebalanceQuantityPromos(before),before);
 }
});

test('separate additions combine only identical drafts; confirmed units never reprice',()=>{
 const {s,sku}=promoState(),o=createOrder(s),first=makeUnits(s,o,sku,1,[],'Bungkus',''),second=makeUnits(s,o,sku,1,[],'Bungkus','');
 const paired=rebalanceQuantityPromos([...first,...second]);assert.deepEqual(paired.map(u=>u.promoDiscount),[5000,5000]);
 assert.equal(rebalanceQuantityPromos([...first,...makeUnits(s,o,sku,1,[],'Makan di tempat','')]).reduce((n,u)=>n+(u.promoDiscount??0),0),0);
 const frozen=paired.map(u=>({...u,state:'requested' as const})),later=rebalanceQuantityPromos([...frozen,...makeUnits(s,o,sku,1,[],'Bungkus','')]);assert.deepEqual(later.slice(0,2),frozen);assert.equal(later[2].promoDiscount,0);
 const single=rebalanceQuantityPromos(paired.slice(0,1));assert.equal(single[0].promoDiscount,0);
});

test('quantity promo confirmation debits full quantity once and unit refund uses allocated value',()=>{
 const initial=promoState(2,3),sku=initial.sku;let s=initial.s;s=reduceAction(s,action('open',{amount:100000},'Rutin'),'open');
 const o=createOrder(s);o.identity='Promo';o.units=makeUnits(s,o,sku,5,[],'Bungkus','');s.orders.push(o);
 const settle={...action('settle',{source:'Payment',method:'Tunai',received:20000},'Rutin'),order:o.id,revision:o.revision};
 const paid=reduceAction(s,settle,'pay');assert.equal(paid.catalog.find(x=>x.id==='teh')!.stock,995);assert.equal(paid.orders[0].settlement!.total,20000);assert.deepEqual(reduceAction(paid,settle,'pay'),paid);
 const unit=paid.orders[0].units[0];assert.equal(unit.allocation!.total,4000);
 const refund={...action('refund',{units:[unit.id],method:'Tunai',kitchen:true,money:true},'Refund uang'),order:o.id,revision:paid.orders[0].revision};
 const refunded=reduceAction(paid,refund,'refund');assert.equal(refunded.orders[0].refund,4000);assert.equal(refunded.catalog.find(x=>x.id==='teh')!.stock,995);assert.deepEqual(reduceAction(refunded,refund,'refund'),refunded);
});

test('definitions and assignments preserve channel isolation and historical unit snapshots',()=>{
 const {s,sku}=promoState(),old=makeUnits(s,createOrder(s),sku,2,[],'Bungkus',''),d=s.discounts!.at(-1)!;
 assert.equal(quoteSKU(sku,'GoFood').promoMode,'none');assert.ok(catalogRows(s.catalog,'Toko','','Promo').some(x=>x.key===sku.id));
 const n=reduceAction(s,action('discountDefinition',{id:d.id,name:'Baru',mode:'percent',value:2500}),'edit');assert.equal(quoteSKU(n.catalog.find(x=>x.id===sku.id)!,'Toko').discount,2500);assert.equal(old[0].promoMode,'bogo');assert.equal(old[0].promoDiscount,5000);
 const rows=catalogDraft(n);rows.find(r=>r.sku===sku.id)!.price='12000';const edited=reduceAction(n,action('menuGrid',{rows},'Harga / impor'),'grid');assert.equal(edited.catalog.find(x=>x.id===sku.id)!.discountAssignments?.Toko,d.id);
 const cleared=catalogDraft(edited);cleared.find(r=>r.sku===sku.id)!.discountAssignments={Toko:''};const off=reduceAction(edited,action('menuGrid',{rows:cleared},'Harga / impor'),'off');assert.equal(quoteSKU(off.catalog.find(x=>x.id===sku.id)!,'Toko').discount,0);
});

test('invalid definitions, potongan greater than a linked price and forbidden actors roll back',()=>{
 const s=fixture();for(const data of [{mode:'bogo',buy:0,free:1},{mode:'bogo',buy:1,free:1.5},{mode:'percent',value:10001},{mode:'amount',value:0}])assert.throws(()=>reduceAction(s,action('discountDefinition',{name:'Test',...data}),'invalid'));
 const p=define(s,'amount',1,1,1000),sku=p.catalog.find(x=>x.id==='teh')!,d=p.discounts!.at(-1)!;assignDiscount(p,sku,'Toko',d.id);const before=structuredClone(p);
 assert.throws(()=>reduceAction(p,action('discountDefinition',{id:d.id,name:d.name,mode:'amount',value:6000}),'too-large'),/melebihi/);assert.deepEqual(p,before);
 assert.throws(()=>reduceAction(p,action('discountDefinition',{id:d.id,operation:'delete'}),'delete-used'),/masih dipakai/);
 assert.throws(()=>reduceAction({...s,actor:'a'},action('discountDefinition',{name:'Test',mode:'bogo',buy:1,free:1}),'staff'),/owner/);
 assert.throws(()=>reduceAction(s,action('taxonomy',{kind:'category',operation:'add',name:'Test'},'Rutin'),'bypass'),/izin/);
});

test('quantity promotions and order discounts conflict even before qualifying count',()=>{
 const {s,sku}=promoState(),o=createOrder(s);o.units=makeUnits(s,o,sku,1,[],'Bungkus','');o.discount=100;assert.throws(()=>totals(o),/tidak dapat digabung/);assert.throws(()=>makeUnits(s,o,sku,2,[],'Bungkus',''),/tidak dapat digabung/);
});

test('mandatory category, inline creation, rename with history, and delete in-use protection',()=>{
 let s=fixture();const o=createOrder(s);o.units=makeUnits(s,o,s.catalog.find(x=>x.id==='teh')!,1,[],'Bungkus','');s.orders.push(o);const snapshot=structuredClone(o);
 const rows=catalogDraft(s);rows[0].category='';assert.throws(()=>reduceAction(s,action('menuGrid',{rows},'Harga / impor'),'blank-category'),/Perbaiki/);
 s=reduceAction(s,action('taxonomy',{kind:'category',operation:'add',name:'Kopi'}),'add-category');
 s=reduceAction(s,action('taxonomy',{kind:'category',operation:'rename',old:'Minuman',name:'Minuman segar'}),'rename-category');assert.ok(s.catalog.filter(x=>x.category==='Minuman segar').length);assert.deepEqual(s.orders[0],snapshot);
 assert.throws(()=>reduceAction(s,action('taxonomy',{kind:'category',operation:'delete',old:'Minuman segar',name:'Minuman segar'}),'used-category'),/Masih dipakai/);
 s=reduceAction(s,action('taxonomy',{kind:'category',operation:'delete',old:'Kopi',name:'Kopi'}),'delete-category');assert.equal(s.settings.menuCategories!.includes('Kopi'),false);
 s=reduceAction(s,action('taxonomy',{kind:'type',operation:'rename',old:'Normal',name:'Reguler'}),'rename-type');assert.ok(s.catalog.every(x=>x.type==='Reguler'));assert.equal(s.settings.typeAliases!.Reguler,'N');assert.deepEqual(s.orders[0],snapshot);
});

test('deletion audit identifies menu, date/time and actor; cash opening records setup identity',()=>{
 const s=fixture(),n=reduceAction(s,action('deleteMenu',{group:'Es Teh',confirmed:true},'Arsip menu'),'delete');const log=n.audits.at(-1)!;assert.equal(log.object,'Es Teh');assert.equal(log.actor,'owner');assert.ok(log.time>0);assert.equal(log.action,'deleteMenu');
 const opened=reduceAction(s,action('open',{amount:20000},'Rutin'),'open');assert.equal(opened.cash.openedBy,'owner');assert.ok(opened.cash.openedAt!>0);assert.equal(opened.cash.opening,20000);
});

test('stale grid cannot overwrite taxonomy, prices or assigned discounts changed elsewhere',()=>{
 const s=fixture(),rows=catalogDraft(s),version=JSON.stringify(s.catalog),n=reduceAction(s,action('taxonomy',{kind:'category',operation:'rename',old:'Minuman',name:'Minuman baru'}),'rename');
 assert.throws(()=>reduceAction(n,action('menuGrid',{rows,catalogVersion:version},'Harga / impor'),'stale'),/berubah selama/);assert.equal(n.catalog.find(x=>x.id==='teh')!.category,'Minuman baru');
});

test('lowering price below assigned nominal discount rejects all rows atomically',()=>{
 const s=define(fixture(),'amount',1,1,4000),sku=s.catalog.find(x=>x.id==='teh')!,d=s.discounts!.at(-1)!;assignDiscount(s,sku,'Toko',d.id);const rows=catalogDraft(s);rows.find(r=>r.sku==='teh')!.price='3000';rows[0].name='Changed';rows[1].name='Changed';
 assert.throws(()=>reduceAction(s,action('menuGrid',{rows},'Harga / impor'),'lower'),/Perbaiki|melebihi harga/);assert.equal(s.catalog.find(x=>x.id==='teh')!.price,5000);assert.equal(s.catalog[0].name,'Es Kopi Susu');
});

test('cancelling a draft unit recomputes only draft bundle and preserves stock',()=>{
 const initial=promoState(),sku=initial.sku;let s=initial.s;s=reduceAction(s,action('open',{amount:100000},'Rutin'),'open');const o=createOrder(s);o.identity='Draft';o.units=makeUnits(s,o,sku,2,[],'Bungkus','');s.orders.push(o);
 const a={...action('cancel',{units:[o.units[0].id]},'Batal setelah dibuat'),order:o.id,revision:o.revision};const n=reduceAction(s,a,'cancel');assert.equal(n.orders[0].units.find(u=>u.state==='draft')!.promoDiscount,0);assert.equal(totals(n.orders[0]).total,10000);assert.equal(n.catalog.find(x=>x.id==='teh')!.stock,1000);
});

test('archived historical types stay deleted after subsequent grid save',()=>{
 let s=fixture();s.catalog.find(x=>x.id==='teh')!.type='Lama';s.settings.menuTypes!.push('Lama');s=reduceAction(s,action('deleteMenu',{group:'Es Teh',confirmed:true},'Arsip menu'),'archive-tea');s=reduceAction(s,action('taxonomy',{kind:'type',operation:'delete',old:'Lama',name:'Lama'}),'delete-type');
 const n=reduceAction(s,action('menuGrid',{rows:catalogDraft(s)},'Harga / impor'),'grid-again');assert.equal(n.settings.menuTypes!.includes('Lama'),false);assert.equal(n.catalog.find(x=>x.id==='teh')!.type,'Lama');
});
