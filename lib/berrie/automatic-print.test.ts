import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, createOrder, makeUnits, reduceAction, expected, type Action, type Order, type State } from './domain.ts';
import { recordAutomaticPrints } from './automatic-print.ts';
const action = (kind: string, order: Order | null, data: Record<string, unknown> = {}): Action => ({kind, activity:'Rutin', order:order?.id, revision:order?.revision, data, reason:'', amount:0});
function setup() {
    let state = fixture(); state = reduceAction(state, action('open',null,{amount:'0'}),'open');
    const order = createOrder(state); order.identity='12 / Rani'; order.units=makeUnits(state,order,state.catalog.find(x=>x.id==='air')!,1,[],'Bungkus',''); state.orders.push(order);
    return state;
}
const pay = (state: State) => action('settle',state.orders[0],{source:'Payment',method:'Tunai',received:'100000'});
function commit(state: State, a: Action, key: string) { const committed=reduceAction(state,a,key);const printed=recordAutomaticPrints(state,committed,a,key); assert.equal(printed.error,undefined);return printed.state; }
test('pay first prints kitchen then customer after commit without a second stock or cash movement',()=>{
 const state=setup(),a=pay(state),committed=reduceAction(state,a,'paid');const next=recordAutomaticPrints(state,committed,a,'paid').state;
 assert.equal(next.orders[0].batches[0].attempts,1);assert.equal(next.orders[0].customerPrint?.attempts,1);
 assert.deepEqual(Object.values(next.operations).map(x=>JSON.parse(x.hash) as Action).filter(x=>x.kind==='print').map(x=>x.data.target),['Dapur saja','Pelanggan saja']);
 assert.equal(expected(next),expected(committed));assert.deepEqual(next.stockLedger,committed.stockLedger);assert.deepEqual(next.cash,committed.cash);assert.equal(next.orders[0].units[0].state,'requested');
 assert.deepEqual(recordAutomaticPrints(state,next,a,'paid').state,next);
});
test('pay later prints kitchen only; settlement prints customer only without repeating old kitchen',()=>{
 const state=setup(),processed=commit(state,action('process',state.orders[0]),'process');assert.equal(processed.orders[0].batches[0].attempts,1);assert.equal(processed.orders[0].customerPrint,undefined);
 const paid=commit(processed,pay(processed),'pay');assert.equal(paid.orders[0].batches[0].attempts,1);assert.equal(paid.orders[0].customerPrint?.attempts,1);assert.deepEqual(paid.stockLedger,processed.stockLedger);
});
test('new draft addition prints only its new kitchen batch, then customer',()=>{
 let state=setup();state=commit(state,action('process',state.orders[0]),'process');state.orders[0].units.push(...makeUnits(state,state.orders[0],state.catalog.find(x=>x.id==='teh')!,1,[],'Makan di tempat',''));
 const paid=commit(state,pay(state),'pay');assert.deepEqual(paid.orders[0].batches.map(x=>x.attempts),[1,1]);assert.equal(paid.orders[0].customerPrint?.attempts,1);
});
test('save and resume edits keep identity and order ID, with no print, batch, stock debit or cash',()=>{
 const initial=setup(),saved=commit(initial,action('save',initial.orders[0]),'save');const order=saved.orders[0];
 const units=makeUnits(saved,order,saved.catalog.find(x=>x.id==='teh')!,2,[],'Makan di tempat','Tanpa es');
 const edited=commit(saved,action('save',order,{draft:{identity:'13 / Rani',note:'Kembali nanti',units}}),'edit');
 assert.equal(edited.orders.length,1);assert.equal(edited.orders[0].id,order.id);assert.equal(edited.orders[0].identity,'13 / Rani');assert.equal(edited.orders[0].units.length,2);assert.equal(edited.orders[0].units[0].note,'Tanpa es');assert.equal(edited.orders[0].batches.length,0);assert.equal(edited.orders[0].customerPrint,undefined);assert.deepEqual(edited.stockLedger,saved.stockLedger);assert.equal(expected(edited),0);assert.equal(saved.orders[0].identity,'12 / Rani');
});
test('failed resumed settlement preserves both old saved draft and editable input',()=>{
 const initial=setup(),saved=commit(initial,action('save',initial.orders[0]),'save'),before=structuredClone(saved);const draft={identity:'13',note:'',units:makeUnits(saved,saved.orders[0],saved.catalog.find(x=>x.id==='air')!,19,[],'Bungkus','')};const input=structuredClone(draft);
 assert.throws(()=>reduceAction(saved,action('settle',saved.orders[0],{...pay(saved).data,draft}),'pay'),/tersisa/);assert.deepEqual(saved,before);assert.deepEqual(draft,input);
});
test('resumed edits cannot replace confirmed units or inject confirmed/debited units',()=>{
 const initial=setup(),saved=commit(initial,action('save',initial.orders[0]),'save');
 const draft={identity:'Rani',note:'',units:structuredClone(saved.orders[0].units)};draft.units[0].state='requested';draft.units[0].debited=true;
 assert.throws(()=>reduceAction(saved,action('save',saved.orders[0],{draft}),'inject'),/tidak sah/);
 const processed=commit(saved,action('process',saved.orders[0]),'process');
 assert.throws(()=>reduceAction(processed,action('save',processed.orders[0],{draft:{...draft,units:saved.orders[0].units}}),'replace'),/belum diproses/);
});

test('print failure leaves the successful business commit intact and does not claim physical success',()=>{
 const before=setup(),a=pay(before),committed=reduceAction(before,a,'pay');committed.writer=false;
 const result=recordAutomaticPrints(before,committed,a,'pay');assert.match(result.error!,/hanya membaca/);assert.deepEqual(result.state,committed);assert.equal(result.state.orders[0].settlement?.total,5000);assert.equal(result.state.orders[0].batches[0].attempts,0);
});
test('unknown result waits for operation resolution; replay of payment does not print twice',()=>{
 const before=setup(),a=pay(before),unknown=reduceAction(before,a,'pay');assert.equal(unknown.orders[0].batches[0].attempts,0);
 const resolved=recordAutomaticPrints(before,unknown,a,'pay').state;
 const replay=reduceAction(resolved,a,'pay');assert.deepEqual(recordAutomaticPrints(resolved,replay,a,'pay').state,resolved);
});
