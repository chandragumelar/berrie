import {test} from 'node:test';
import assert from 'node:assert/strict';
import {counts,active,completed,expected,makeUnits,reduceAction,totals,unpaidBalance,type Action,type State} from './domain.ts';
import {partitionOrders,queryOrders,initialOrderQuery,switchOrderGroup,servingProgress,confirmationTime,waitingLabel,orderQueue,orderSummary,orderAmounts,resumeDraft,retainedSelection} from './orders-workspace.ts';
import {ordersReviewFixture} from './orders-review.ts';
const now=1700000000000;
const action=(s:State,kind:string,index:number,data:Record<string,unknown>={}):Action=>({kind,activity:'Rutin',order:s.orders[index].id,revision:s.orders[index].revision,data,reason:'',amount:0});
test('active and stored partition without overlap, confirmed additions and pending refund stay active',()=>{
 const s=ordersReviewFixture(now),g=partitionOrders(s.orders);
 assert.equal(g.Tersimpan.length,2);assert.equal(g.Aktif.length,20);
 assert.equal(new Set([...g.Aktif,...g.Tersimpan].map(o=>o.id)).size,s.orders.filter(active).length);
 assert.ok(g.Aktif.includes(s.orders[3]));assert.ok(g.Aktif.includes(s.orders[4]));assert.ok(!completed(s.orders[4]));
 assert.deepEqual(partitionOrders(s.orders).Tersimpan.map(o=>counts(o).draft),[5,5]);
});
test('work and payment filters combine AND, draft and cancelled units do not imply served',()=>{
 const s=ordersReviewFixture(now),q=initialOrderQuery();assert.equal(queryOrders(s.orders,q).length,20);
 assert.deepEqual(queryOrders(s.orders,{...q,work:'Sudah disajikan'}).map(o=>o.id),[s.orders[1].id]);
 assert.deepEqual(queryOrders(s.orders,{...q,work:'Belum disajikan',payment:'Lunas'}).map(o=>o.id),[s.orders[0].id]);
 assert.equal(queryOrders(s.orders,{...q,work:'Sudah disajikan',payment:'Lunas'}).length,0);
 assert.ok(queryOrders(s.orders,{...q,payment:'Lunas'}).includes(s.orders[4]));
 assert.equal(queryOrders(s.orders,{...q,work:'Sudah disajikan',payment:'Belum bayar'}).length,1);
 assert.equal(queryOrders(s.orders,{...switchOrderGroup('Tersimpan'),work:'Belum disajikan',payment:'Lunas'}).length,2);
});
test('search uses order number, identity and external ID only within group; group switch resets filters',()=>{
 const s=ordersReviewFixture(now);s.orders[0].externalId='PLATFORM-ABC';
 for(const search of [s.orders[0].number,'rani','platform-abc'])assert.equal(queryOrders(s.orders,{...initialOrderQuery(),search}).length,1);
 assert.equal(queryOrders(s.orders,{...switchOrderGroup('Tersimpan'),search:'rani'}).length,0);
 assert.deepEqual(switchOrderGroup('Tersimpan'),{group:'Tersimpan',search:'',work:'Semua',payment:'Semua'});
});
test('queue follows oldest pending batch, then first confirmation, stable ID tie; missing time last in own group',()=>{
 const s=ordersReviewFixture(now),a=structuredClone(s.orders[3]);
 // All first batch served: wait starts at the second batch, never draft creation/payment.
 a.units.filter(u=>u.batch===1).forEach(u=>u.state='served');a.created=now-100000000;
 assert.equal(confirmationTime(a,true),now-120000);assert.equal(waitingLabel(a,now),'2 menit menunggu');
 assert.equal(waitingLabel(a,now+60000),'3 menit menunggu');
 const b=structuredClone(a);b.id='a';a.id='z';assert.deepEqual(orderQueue([a,b],'Aktif').map(o=>o.id),['a','z']);
 const missing=s.orders[21];assert.equal(waitingLabel(missing,now),'Waktu tidak tersedia');
 const queue=queryOrders(s.orders,initialOrderQuery());assert.equal(queue[0].id,s.orders[0].id);
 assert.ok(queue.indexOf(missing)<queue.indexOf(s.orders[1]));assert.ok(queue.indexOf(missing)>queue.indexOf(s.orders[20]));
 a.batches[1].time=undefined as unknown as number;assert.equal(confirmationTime(a,true),undefined);
 assert.equal(waitingLabel(a,now),'Waktu tidak tersedia');assert.equal(confirmationTime({...a,batches:[]}),undefined);
});
test('stored sorting uses last saved time and missing timestamp last, never created time',()=>{
 const s=ordersReviewFixture(now),a=s.orders[5],b=s.orders[6],old=structuredClone(a);old.id='old';delete old.savedAt;old.created=now+10000;
 assert.deepEqual(orderQueue([old,b,a],'Tersimpan').map(o=>o.id),[a.id,b.id,old.id]);
});
test('progress counts confirmed noncancelled units only; summary counts grouped rows not units',()=>{
 const s=ordersReviewFixture(now),o=s.orders[3];assert.deepEqual(servingProgress(o),{served:2,total:7,pending:5});assert.equal(o.units.length,8);
 o.units.find(u=>u.state==='requested')!.state='cancelled';assert.deepEqual(servingProgress(o),{served:2,total:6,pending:4});
 const summary=orderSummary(s.orders[0]);assert.equal(summary.length,2);assert.ok(summary[0].startsWith('3×'));assert.deepEqual(servingProgress(s.orders[4]),{served:0,total:0,pending:0});
});
test('unpaid balance delegates to domain bill and settlement, pending refund is a separate obligation',()=>{
 const s=ordersReviewFixture(now),unpaid=s.orders[3],paid=s.orders[0],refund=s.orders[4];unpaid.tax=1100;unpaid.service=500;unpaid.discount=1000;
 assert.equal(orderAmounts(unpaid).unpaid,totals(unpaid).total);assert.equal(unpaidBalance(paid),0);assert.equal(orderAmounts(refund).unpaid,0);assert.ok(orderAmounts(refund).refundDue>0);
 // Paid cancellation retains the frozen discount even when remaining subtotal is zero.
 refund.discount=1000;assert.throws(()=>totals(refund),/Diskon melebihi/);assert.equal(orderAmounts(refund).unpaid,0);assert.equal(orderAmounts(refund).draft,refund.settlement!.total);
});
test('payment and serving remain independent, no second stock debit, final completion clears selection only',()=>{
 let s=ordersReviewFixture(now);const q={...initialOrderQuery(),payment:'Belum bayar'},id=s.orders[1].id;
 assert.equal(retainedSelection(id,s.orders,q),id);
 const prior=structuredClone(s),pay=action(s,'settle',1,{source:'Payment',method:'Tunai',received:'1000000'});
 s=reduceAction(s,pay,'pay-queue');assert.equal(completed(s.orders[1]),true);assert.equal(retainedSelection(id,s.orders,q),'');assert.deepEqual(s.stockLedger,prior.stockLedger);assert.deepEqual(counts(s.orders[1]),counts(prior.orders[1]));
 const requested=s.orders[2].units.filter(u=>u.state==='requested').map(u=>u.id),cash=expected(s),ledger=structuredClone(s.stockLedger);
 s=reduceAction(s,action(s,'serve',2,{units:requested}),'serve-queue');assert.equal(s.orders[2].settlement,undefined);assert.equal(expected(s),cash);assert.deepEqual(s.stockLedger,ledger);
 assert.equal(retainedSelection(s.orders[2].id,s.orders,{...q,work:'Belum disajikan'}),'');assert.equal(retainedSelection(s.orders[2].id,s.orders,q),s.orders[2].id);
 assert.deepEqual(reduceAction(s,action(prior,'settle',1,pay.data),'pay-queue'),s);
});
test('resume preserves ID number identity; save updates saved time once, failure preserves draft and retry receipt',()=>{
 let s=ordersReviewFixture(now);const original=structuredClone(s.orders[5]),draft=resumeDraft(original);assert.deepEqual(draft,original);draft.note='Catatan baru';assert.equal(original.note,'');
 assert.throws(()=>resumeDraft(s.orders[3]),/Hanya draft/);
 const a=action(s,'save',5,{draft:{identity:draft.identity,note:draft.note,units:draft.units}});const ledger=structuredClone(s.stockLedger);
 s=reduceAction(s,a,'save-draft');assert.equal(s.orders[5].id,original.id);assert.equal(s.orders[5].number,original.number);assert.equal(s.orders[5].identity,original.identity);assert.ok(s.orders[5].savedAt!>original.savedAt!);assert.deepEqual(s.stockLedger,ledger);assert.equal(s.orders.length,22);
 assert.deepEqual(reduceAction(s,a,'save-draft'),s);
 const before=structuredClone(s),bad=action(s,'settle',5,{source:'Payment',method:'Tunai',received:'0'});
 assert.throws(()=>reduceAction(s,bad,'failed-pay'),/Uang kurang/);assert.deepEqual(s,before);
 const added=makeUnits(s,draft,s.catalog.find(x=>x.id==='air')!,1,[],'Bungkus','');assert.equal(added[0].debited,false);
});
