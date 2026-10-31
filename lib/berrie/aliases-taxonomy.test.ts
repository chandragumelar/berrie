import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,createOrder,makeUnits,reduceAction,type Action} from './domain.ts';
test('type rename and alias commit together without changing SKU identity/code or order snapshot',()=>{
 const s=fixture(),o=createOrder(s);o.units=makeUnits(s,o,s.catalog.find(x=>x.id==='air')!,1,[],'Bungkus','');s.orders.push(o);
 const sku=s.catalog[0],action:Action={kind:'taxonomy',activity:'Pengaturan',data:{kind:'type',operation:'rename',old:'Normal',name:'Biasa',alias:'BI'},reason:'Ubah tipe',amount:0};
 const n=reduceAction(s,action,'rename');assert.equal(n.catalog[0].id,sku.id);assert.equal(n.catalog[0].code,sku.code);assert.equal(n.catalog[0].type,'Biasa');assert.deepEqual(n.orders[0],o);assert.equal(n.settings.typeAliases?.Biasa,'BI');
 assert.throws(()=>reduceAction(s,{...action,data:{...action.data,alias:'P'}},'bad'),/unik/);assert.equal(s.catalog[0].type,'Normal');
});
