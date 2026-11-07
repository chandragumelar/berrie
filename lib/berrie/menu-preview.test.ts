import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './domain.ts';
import {catalogDraft} from './workshop.ts';
import {applyOptionPrices} from './option-prices.ts';
import {previewMenu} from './menu-preview.ts';

test('cashier preview calculates choice extras without changing catalog, orders or stock',()=>{
 const s=fixture(),before=structuredClone(s),source=catalogDraft(s).filter(r=>r.name==='Es Teh');
 const input=[{id:'extra',name:'Tambahan',multiple:true,pricing:'free' as const,options:['Keju'],defaults:[],prices:{Keju:2000}}];
 const configured=applyOptionPrices(input,'5000',source,[]);
 assert.equal(previewMenu(s,configured.prices,configured.variables,{extra:['Keju']},'Toko'),7000);
 assert.deepEqual(s,before);
 assert.throws(()=>previewMenu(s,configured.prices,configured.variables,{extra:['Tidak ada']},'Toko'));
});
