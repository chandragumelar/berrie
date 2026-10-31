import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,createOrder,groupUnits,makeUnits,reduceAction,totals,type Action,type Order} from './domain.ts';
import {simpleMenu,addSimple,undoAdd,cashierRows,initialMenuTab,moveFavorite} from './cashier.ts';
import {stockKey} from './shared-stock.ts';
const a=(kind:string,o:Order|null,data:Record<string,unknown>={}):Action=>({kind,activity:kind==='settings'?'Pengaturan':'Rutin',data,reason:'',amount:0,...o?{order:o.id,revision:o.revision}:{}});
function setup(){const s=reduceAction(fixture(),a('open',null,{amount:'100000'}),'open');return {s,o:createOrder(s),sku:s.catalog.find(x=>x.id==='air')!};}
test('simple one SKU including fixed size adds one draft; real choices always need editor',()=>{
 const {s,o,sku}=setup(),before=structuredClone(s);
 assert.equal(simpleMenu(s,sku),true);assert.equal(simpleMenu(s,s.catalog.find(x=>x.id==='kopi-b')!),false);
 const added=addSimple(s,o,sku);assert.equal(added.units.length,1);assert.equal(added.units[0].serving,'Bungkus');assert.equal(added.units[0].state,'draft');assert.equal(added.units[0].debited,false);assert.deepEqual(s,before);
 assert.throws(()=>addSimple(s,o,s.catalog.find(x=>x.id==='kopi-b')!));
});
test('repeated taps group identical draft; default only affects future additions and new order resets Bungkus',()=>{
 const {s,o,sku}=setup();o.units=addSimple(s,o,sku).units;o.units=addSimple(s,o,sku).units;assert.deepEqual(groupUnits(o).map(x=>x.length),[2]);
 o.serving='Makan di tempat';assert.deepEqual(o.units.map(x=>x.serving),['Bungkus','Bungkus']);
 o.units=addSimple(s,o,sku).units;assert.deepEqual(groupUnits(o).map(x=>[x.length,x[0].serving]),[[2,'Bungkus'],[1,'Makan di tempat']]);
 assert.equal(createOrder(s,o).serving,'Bungkus');
 // A per-item edit only affects that line, never the order default or another line.
 const old=o.units[0];const changed=makeUnits(s,o,sku,1,[],'Makan di tempat','tanpa es',old,{},old.variableValues)[0];o.units=[changed,...o.units.slice(1)];
 assert.equal(o.units[1].serving,'Bungkus');assert.equal(o.serving,'Makan di tempat');assert.equal(groupUnits(o).length,3);
});
test('different price/promo/channel/notes never merge and confirmed units remain unchanged',()=>{
 const {s,o,sku}=setup();o.units=addSimple(s,o,sku).units;const old=structuredClone(o.units[0]);
 for(const change of [{note:'khusus'},{price:old.price+1},{promoName:'baru'},{promoRevision:2},{priceChannel:'GoFood' as const},{state:'requested' as const,batch:1,debited:true}]){
  const units=[old,{...old,id:'other',...change}];assert.equal(groupUnits({...o,units}).length,2);
 }
 o.units=[{...old,state:'requested',debited:true,batch:1}];const confirmed=structuredClone(o.units[0]);o.units=addSimple(s,o,sku).units;assert.equal(groupUnits(o).length,2);assert.deepEqual(o.units[0],confirmed);
});
test('undo removes only represented last addition, once; wrong order or confirmed/paid cannot be undone',()=>{
 const {s,o,sku}=setup();const first=addSimple(s,o,sku);o.units=first.units;const last=addSimple(s,o,sku);o.units=last.units;
 o.units=undoAdd(o,last.receipt);assert.equal(o.units.length,1);assert.equal(o.units[0].id,first.receipt.unit);assert.equal(undoAdd(o,last.receipt),o.units);
 assert.equal(undoAdd({...o,id:'other'},first.receipt),o.units);
 o.units[0].state='requested';o.units[0].debited=true;assert.equal(undoAdd(o,first.receipt),o.units);
});
test('favorites stable across exhaustion/search/inactive menus; group choices have one card; owner boundary and replay',()=>{
 const {s,sku}=setup(),coffee=s.catalog.find(x=>x.id==='kopi-b')!,keys=[stockKey(sku),stockKey(coffee)];
 assert.equal(initialMenuTab(s),'Semua');const action=a('settings',null,{favorites:keys});const n=reduceAction(s,action,'favorites');
 assert.deepEqual(reduceAction(n,action,'favorites'),n);assert.equal(initialMenuTab(n),'Favorit');
 assert.deepEqual(cashierRows(n,'Toko','','Favorit').map(x=>x.key),keys);
 n.catalog.filter(x=>stockKey(x)===stockKey(sku)).forEach(x=>x.stock=0);const rows=cashierRows(n,'Toko','','Favorit');assert.deepEqual(rows.map(x=>x.key),keys);assert.equal(rows[0].unavailable,true);
 assert.equal(cashierRows(n,'Toko','kopi','Favorit').length,1);assert.equal(cashierRows(n,'Toko','','Favorit').filter(x=>x.key===stockKey(coffee)).length,1);
 n.catalog.filter(x=>stockKey(x)===stockKey(sku)).forEach(x=>x.available=false);assert.deepEqual(cashierRows(n,'Toko','','Favorit').map(x=>x.key),keys.slice(1));assert.deepEqual(n.settings.favorites,keys);
 assert.deepEqual(moveFavorite(keys,keys[1],-1),[keys[1],keys[0]]);assert.deepEqual(moveFavorite(keys,keys[0],-1),keys);
 assert.throws(()=>reduceAction({...s,actor:'a'},action,'staff'),/owner/);assert.throws(()=>reduceAction(s,a('settings',null,{favorites:[keys[0],keys[0]]}),'dup'),/favorit/);
});
test('draft/undo/default never debit; successful commit debits once, replay and settlement cannot undo',()=>{
 const {s,o,sku}=setup(),stock=sku.stock;o.identity='12';const first=addSimple(s,o,sku);o.units=first.units;
 const discarded=addSimple(s,o,sku);o.units=undoAdd({...o,units:discarded.units},discarded.receipt);o.serving='Makan di tempat';o.units=addSimple(s,o,sku).units;
 assert.equal(sku.stock,stock);assert.equal(s.stockLedger.length,0);s.orders.push(o);
 const settle=a('settle',o,{source:'Payment',method:'Tunai',received:String(totals(o).total)});const n=reduceAction(s,settle,'pay');
 assert.equal(n.catalog.find(x=>x.id===sku.id)!.stock,stock-2);assert.equal(n.stockLedger.length,2);assert.deepEqual(reduceAction(n,settle,'pay'),n);
 assert.equal(undoAdd(n.orders[0],first.receipt),n.orders[0].units);
 assert.deepEqual(n.orders[0].units.map(x=>x.serving),['Bungkus','Makan di tempat']);assert.equal(sku.stock,stock);
});
test('direct addition uses channel promo snapshot; undo rebalances BOGO without mutating confirmed',()=>{
 const {s,o,sku}=setup();s.settings.enabledChannels=['GoFood'];s.settings.channelAccounts={GoFood:'outlet'};o.channel='GoFood';
 sku.channelPrices.GoFood=9000;sku.promos={GoFood:{active:true,mode:'bogo',value:0,buy:1,free:1,name:'Dua',revision:1}};
 const first=addSimple(s,o,sku);o.units=first.units;const second=addSimple(s,o,sku);o.units=second.units;
 assert.equal(totals(o).total,9000);assert.equal(o.units[0].priceChannel,'GoFood');assert.equal(o.units[0].promoName,'Dua');
 o.units=undoAdd(o,second.receipt);assert.equal(totals(o).total,9000);assert.equal(o.units[0].promoDiscount,0);
 sku.promos.GoFood!.revision=2;sku.promos.GoFood!.name='Baru';o.units=addSimple(s,o,sku).units;assert.equal(groupUnits(o).length,2);assert.equal(o.units[0].promoName,'Dua');
});
test('process consumes direct draft once, blocks undo, and settlement of confirmed batch does not debit again',()=>{
 const {s,o,sku}=setup();o.identity='Rani';const added=addSimple(s,o,sku);o.units=added.units;s.orders.push(o);const stock=sku.stock;
 const process=a('process',o);const n=reduceAction(s,process,'process');assert.equal(n.catalog.find(x=>x.id===sku.id)!.stock,stock-1);assert.deepEqual(reduceAction(n,process,'process'),n);
 assert.equal(undoAdd(n.orders[0],added.receipt),n.orders[0].units);
 const paid=reduceAction(n,a('settle',n.orders[0],{source:'Payment',method:'Tunai',received:'10000'}),'paid');assert.equal(paid.catalog.find(x=>x.id===sku.id)!.stock,stock-1);assert.equal(paid.stockLedger.length,1);
});
test('group card quotes sellable channel prices and promotions across its SKUs, not an empty first price',()=>{
 const {s}=setup(),milk=s.catalog.filter(x=>x.name==='Milkshake');assert.ok(milk.length>1);
 milk[0].channelPrices.Toko=0;milk[1].promos={Toko:{active:true,mode:'bogo',value:0,buy:2,free:1,name:'Paket',revision:1}};
 const card=cashierRows(s,'Toko','Milkshake','Semua')[0];assert.equal(card.unavailable,false);assert.ok(card.price);assert.equal(card.promoLabel,'Beli 2 gratis 1');assert.equal(card.skus.length,milk.length);
 s.settings.favorites=[stockKey(milk[0])];milk.forEach(x=>x.available=false);assert.equal(initialMenuTab(s),'Semua');assert.deepEqual(cashierRows(s,'Toko','','Favorit'),[]);
});
