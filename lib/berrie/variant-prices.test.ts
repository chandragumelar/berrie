import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction} from './domain.ts';
import {catalogDraft} from './workshop.ts';
import {suggestPriceRows} from './variant-prices.ts';
import {type MenuVariable,combinationKey} from './menu-variables.ts';

test('new price choices require explicit prices; existing SKU, price and stock stay intact',()=>{
 const s=fixture(),existing=catalogDraft(s).filter(r=>r.name==='Es Kopi Susu');
 const vars=structuredClone(existing[0].variables!);vars.find(v=>v.name==='Ukuran')!.options.push('Jumbo');
 const next=suggestPriceRows(vars,existing);
 for(const old of existing){const row=next.find(r=>r.sku===old.sku)!;assert.equal(row.price,old.price);assert.equal(row.stock,old.stock);}
 const added=next.find(r=>!r.sku)!;assert.equal(added.price,'');assert.equal(added.group,existing[0].group);
 const rows=catalogDraft(s).filter(r=>r.group!==existing[0].group).concat(next);
 assert.throws(()=>reduceAction(s,{kind:'menuGrid',activity:'Harga / impor',data:{rows},reason:'Harga varian baru',amount:0},'variant-invalid'),/Perbaiki/);
 added.price='25000';const n=reduceAction(s,{kind:'menuGrid',activity:'Harga / impor',data:{rows},reason:'Harga varian baru',amount:0},'variant-valid');
 for(const old of existing){const sku=n.catalog.find(x=>x.id===old.sku)!;assert.equal(sku.price,Number(old.price));assert.equal(sku.stock,Number(old.stock));}
 assert.equal(n.stockLedger.length,s.stockLedger.length);assert.deepEqual(n.orders,s.orders);
});

test('multi-select preserves priced pairs without generating every subset',()=>{
 const base=catalogDraft(fixture()).find(r=>r.name==='Es Teh')!;
 const v:MenuVariable={id:'top',name:'Topping',multiple:true,pricing:'combination',options:['Susu','Cokelat'],defaults:[]};
 const single={...v,multiple:false};const fresh=suggestPriceRows([single],[{...base,sku:undefined,variables:[],variableValues:{}}]);assert.equal(fresh.length,2);assert.ok(fresh.every(r=>r.price===''));
 const paired={...base,variables:[v],variableValues:{top:['Cokelat','Susu']},price:'9000'};
 const result=suggestPriceRows([v],[paired]);assert.equal(result.length,4);assert.equal(result.find(r=>r.sku===base.sku)!.price,'9000');
 assert.equal(new Set(result.map(r=>combinationKey([v],r.variableValues!))).size,4);
 v.options=Array.from({length:30},(_,i)=>`Topping ${i}`);const large=suggestPriceRows([v],[{...base,variableValues:{top:[]}}]);assert.equal(large.length,1);
});
