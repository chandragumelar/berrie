import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './domain.ts';
import {stockGroups,stockKey} from './shared-stock.ts';
import {fillUnchecked,recapReady,recapValue} from './recap-draft.ts';

test('empty is unchecked, zero is explicit and invalid or excessive values block review',()=>{
 assert.equal(recapValue('',10),null);assert.equal(recapValue(undefined,10),null);assert.equal(recapValue('0',10),0);assert.equal(recapValue('-1',10),null);assert.equal(recapValue('11',10),null);
 const groups=stockGroups(fixture().catalog).slice(0,2),a=stockKey(groups[0]),b=stockKey(groups[1]);assert.equal(recapReady(groups,{[a]:'0',[b]:''}),false);assert.equal(recapReady(groups,{[a]:'0',[b]:'x'}),false);assert.equal(recapReady(groups,{[a]:'0',[b]:'0'}),true);
});
test('fill remaining checks hidden groups without replacing positive or invalid inputs',()=>{
 const groups=stockGroups(fixture().catalog).slice(0,4),[a,b,c,d]=groups.map(stockKey),values={[a]:'2',[b]:'invalid',[c]:''};const filled=fillUnchecked(groups,values);assert.deepEqual(filled,{[a]:'2',[b]:'invalid',[c]:'0',[d]:'0'});assert.deepEqual(values,{[a]:'2',[b]:'invalid',[c]:''});assert.equal(recapReady(groups,filled),false);
});

test('legacy recap without corrections keeps original rows readable',async()=>{
 const {currentRecapRows}=await import('./workshop.ts');
 const old={id:'old',from:1,until:2,time:3,actor:'',rows:[{group:'a',name:'Menu lama',quantity:0},{group:'b',name:'Menu lain',quantity:2}]};
 assert.deepEqual(currentRecapRows(old),old.rows);assert.equal('corrections' in old,false);
});
