import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,createOrder,makeUnits,reduceAction} from './domain.ts';
import {catalogRows} from './catalog.ts';
import {menuTabs,validateMenuCategories} from './menu-filters.ts';

test('fixed filters isolate empty stock; promo is one independent selection',()=>{
 const s=fixture();s.catalog.find(x=>x.id==='kentang')!.promos={Toko:{active:true,mode:'amount',value:1000,name:'Promo',revision:1}};
 assert.deepEqual(menuTabs([]),['Semua','Habis','Promo']);
 const all=catalogRows(s.catalog,'Toko'),out=catalogRows(s.catalog,'Toko','','Habis'),promo=catalogRows(s.catalog,'Toko','','Promo'),snacks=catalogRows(s.catalog,'Toko','','Camilan');
 assert.deepEqual(out.map(x=>x.key),['kentang']);
 assert.equal(all.some(x=>x.key==='kentang'),false);
 assert.equal(snacks.some(x=>x.key==='kentang'),false);
 assert.deepEqual(promo.map(x=>x.key),['kopi-b']);
 assert.equal(snacks.some(x=>x.key==='pisang'),true);
 s.catalog.find(x=>x.id==='teh')!.available=false;
 assert.equal(catalogRows(s.catalog,'Toko','','Habis').some(x=>x.key==='teh'),false);

});
test('category settings validate at mutation boundary without altering SKU or historical data',()=>{
 assert.throws(()=>validateMenuCategories(['Promo']),/tab tetap/);
 assert.throws(()=>validateMenuCategories(['Kopi',' kopi ']),/unik/);
 assert.throws(()=>validateMenuCategories(['x'.repeat(41)]),/40/);
 const s=fixture(),n=reduceAction(s,{kind:'settings',activity:'Pengaturan',data:{menuCategories:[' Kopi ','Teh']},reason:'',amount:0},'categories');
 assert.deepEqual(n.settings.menuCategories,['Kopi','Teh']);assert.deepEqual(n.catalog,s.catalog);
 assert.deepEqual(menuTabs(n.settings.menuCategories!),['Semua','Kopi','Teh','Habis','Promo']);
 const cleared=reduceAction(n,{kind:'settings',activity:'Pengaturan',data:{menuCategories:[]},reason:'',amount:0},'clear');
 assert.deepEqual(menuTabs(cleared.settings.menuCategories!),['Semua','Habis','Promo']);
});
test('generic variant is omitted while actual variants and snapshots stay distinguishable',()=>{
 const s=fixture(),o=createOrder(s),banana=s.catalog.find(x=>x.id==='pisang')!,coffee=s.catalog.find(x=>x.id==='kopi-b')!;
 const unit=makeUnits(s,o,banana,1,[],'Makan di tempat','tanpa madu')[0];
 assert.equal(unit.name,'Pisang Goreng');assert.equal(unit.note,'tanpa madu');
 assert.equal(makeUnits(s,o,coffee,1,[],'Bungkus','')[0].name,'Es Kopi Susu · Besar');
 banana.name='Nama baru';assert.equal(makeUnits(s,o,banana,1,[],'Bungkus','',unit)[0].name,'Pisang Goreng');
 s.catalog.push({...banana,id:'banana-small',variant:'Kecil'});
 assert.equal(makeUnits(s,o,banana,1,[],'Bungkus','')[0].name,'Nama baru · Reguler');
});
