import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction,createOrder,makeUnits,unitFinal,type Action} from './domain.ts';
import {catalogDraft} from './workshop.ts';
import {optionPriceDraft,applyOptionPrices} from './option-prices.ts';
import {stockBaseline,changeStock} from './shared-stock.ts';
const action=(kind:string,data:Action['data'],activity:Action['activity']='Koreksi stok'):Action=>({kind,data,activity,reason:'Pemeriksaan stok fisik',amount:0});

test('legacy option increments preserve SKU price, code, promo and stock on menu save',()=>{
 const s=fixture(),all=catalogDraft(s),old=all.filter(r=>r.name==='Es Kopi Susu');
 const draft=optionPriceDraft(old[0].variables!,old);assert.equal(draft.error,'');assert.equal(draft.base,'15000');
 const result=applyOptionPrices(draft.variables,draft.base,old,[]);
 assert.deepEqual(result.prices.map(r=>r.price),['15000','20000']);
 assert.ok(result.variables.every(v=>v.defaults[0]===v.options[0]));
 const n=reduceAction(s,action('menuGrid',{rows:[...all.filter(r=>r.group!==old[0].group),...result.prices]},'Harga / impor'),'options');
 for(const r of old){const before=s.catalog.find(x=>x.id===r.sku)!,after=n.catalog.find(x=>x.id===r.sku)!;assert.equal(after.price,before.price);assert.equal(after.code,before.code);assert.deepEqual(after.promos,before.promos);assert.equal(after.stock,before.stock);}
 assert.equal(n.stockLedger.length,0);
});

test('zero options do not split prices; paid single options split rows; paid multi sums safely',()=>{
 const s=fixture(),old=catalogDraft(s).filter(r=>r.name==='Es Teh');
 const v={id:'size',name:'Ukuran',multiple:false,pricing:'free' as const,options:['Kecil','Besar'],defaults:[],prices:{Kecil:0,Besar:5000}};
 const free=applyOptionPrices([{...v,prices:{Kecil:0,Besar:0}}],'5000',old,[]);assert.equal(free.prices.length,1);assert.equal(free.variables[0].pricing,'free');
 const next=applyOptionPrices([v],'5000',old,[]);assert.deepEqual(next.prices.map(r=>r.price),['5000','10000']);
 const multi=applyOptionPrices([{...v,multiple:true}],'5000',old,[]);assert.equal(multi.prices.length,1);assert.equal(multi.variables[0].pricing,'extra');
 const sku={...s.catalog.find(x=>x.id==='teh')!,variables:multi.variables,variableValues:{}};
 s.catalog[s.catalog.findIndex(x=>x.id===sku.id)]=sku;
 const unit=makeUnits(s,createOrder(s),sku,1,[],'Bungkus','',undefined,{}, {size:['Kecil','Besar']})[0];assert.equal(unitFinal(unit),10000);
 assert.throws(()=>applyOptionPrices([{...v,prices:{Kecil:0,Besar:-1}}],'5000',old,[]));
 assert.throws(()=>applyOptionPrices([{...v,prices:{Kecil:0,Besar:NaN}}],'5000',old,[]));
 assert.throws(()=>applyOptionPrices([{...v,prices:{Kecil:0,Besar:1.5}}],'5000',old,[]));
});

test('non-additive legacy prices and variant limits are not silently converted',()=>{
 const old=catalogDraft(fixture()).filter(r=>r.name==='Es Teh');
 const vars=[{id:'a',name:'A',multiple:false,pricing:'combination' as const,options:['x','y'],defaults:[]},{id:'b',name:'B',multiple:false,pricing:'combination' as const,options:['x','y'],defaults:[]}];
 const legacy=[['x','x',5000],['x','y',6000],['y','x',7000],['y','y',10000]].map(([a,b,p])=>({...old[0],variableValues:{a:[String(a)],b:[String(b)]},price:String(p)}));
 assert.match(optionPriceDraft(vars,legacy).error,/Harga lama/);
 const many=vars.map(v=>({...v,options:Array.from({length:6},(_,i)=>String(i)),prices:Object.fromEntries(Array.from({length:6},(_,i)=>[String(i),i]))}));
 assert.throws(()=>applyOptionPrices(many,'5000',old,[]),/30/);
});

test('stock baseline remains after sale, count resets once and log includes actor/time/before/after',()=>{
 const s=fixture(),sku=s.catalog.find(x=>x.id==='teh')!;changeStock(s,sku,-2,'Diminta dibuat','order');assert.equal(stockBaseline(s,sku),1000);assert.equal(sku.stock,998);
 const a=action('stockGrid',{rows:[{group:'Es Teh',mode:'count',amount:'1010',expected:998,reason:'Produksi pagi'}]});
 const n=reduceAction(s,a,'reset-stock'),after=n.catalog.find(x=>x.id==='teh')!;assert.equal(after.stock,1010);assert.equal(stockBaseline(n,after),1010);
 const log=n.stockLedger.at(-1)!;assert.equal(log.actor,'owner');assert.equal(log.before,998);assert.equal(log.after,1010);assert.equal(log.delta,12);assert.ok(log.time);assert.equal(log.reason,'Produksi pagi');
 assert.deepEqual(reduceAction(n,a,'reset-stock'),n);
 assert.throws(()=>reduceAction(n,a,'stale-stock'),/sudah berubah/);assert.equal(n.catalog.find(x=>x.id==='teh')!.stock,1010);
 const minimal=reduceAction(n,action('stockThreshold',{rows:[{group:'Es Teh',threshold:'7'}]},'Pengaturan'),'minimal');assert.equal(minimal.catalog.find(x=>x.id==='teh')!.stock,1010);assert.deepEqual(minimal.stockLedger,n.stockLedger);
});

test('delete menu needs confirmation and permission, hides all variants while retaining ledger/history',()=>{
 const s=fixture(),a=action('deleteMenu',{group:'Es Kopi Susu',confirmed:true},'Arsip menu');
 assert.throws(()=>reduceAction(s,{...a,data:{...a.data,confirmed:false}},'unconfirmed'),/Konfirmasi/);
 assert.throws(()=>reduceAction(s,{...a,activity:'Rutin'},'bypass'),/izin/);
 const n=reduceAction(s,a,'delete');assert.ok(n.catalog.filter(x=>x.name==='Es Kopi Susu').every(x=>x.archived&&!x.available));assert.equal(n.catalog.length,s.catalog.length);assert.deepEqual(n.stockLedger,s.stockLedger);assert.deepEqual(n.orders,s.orders);assert.deepEqual(reduceAction(n,a,'delete'),n);
 assert.throws(()=>reduceAction(n,action('menuGrid',{rows:catalogDraft(s)},'Harga / impor'),'stale-menu'),/sudah dihapus/);
 const staff={...s,actor:'Rani'};assert.throws(()=>reduceAction(staff,a,'staff-delete'),/Persetujuan/);
 const open={...s,orders:[{...createOrder(s),units:makeUnits(s,createOrder(s),s.catalog.find(x=>x.id==='kopi-b')!,1,[],'Bungkus','')} ]};assert.throws(()=>reduceAction(open,a,'draft-delete'),/draft/);
});

test('collapsing variants with different sale states or promotions is blocked',()=>{
 const s=fixture(),old=catalogDraft(s).filter(r=>r.name==='Es Kopi Susu'),draft=optionPriceDraft(old[0].variables!,old);
 const zero=draft.variables.map(v=>({...v,prices:Object.fromEntries(v.options.map(x=>[x,0]))}));
 assert.throws(()=>applyOptionPrices(zero,draft.base,old,[]),/status/);
 const sameStatus=old.map(r=>({...r,available:true}));assert.throws(()=>applyOptionPrices(zero,draft.base,sameStatus,[]),/diskon/);
 const aligned=sameStatus.map(r=>({...r,promos:{}}));assert.equal(applyOptionPrices(zero,draft.base,aligned,[]).prices.length,1);
});
