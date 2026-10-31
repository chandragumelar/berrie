import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction,permission,createOrder,type Action,type State} from './domain.ts';
import {staffList,actorName} from './staff.ts';
const staff=(operation:string,data:Record<string,unknown>={}):Action=>({kind:'staff',activity:'Pengaturan',data:{operation,...data},reason:'Ubah akses demo',amount:0});
const run=(s:State,a:Action,key='operation')=>reduceAction(s,a,key);
test('staff create and replay keep a stable identity; rename/deactivation preserve orders and audits',()=>{
 let s=fixture();const a=staff('add',{id:'new',name:'Dewi'});s=run(s,a);assert.equal(run(s,a),s);assert.equal(staffList(s).filter(x=>x.id==='new').length,1);
 const o=createOrder(s);o.actor='new';s.orders.push(o);const previousAudit=s.audits[0];
 s=run(s,staff('rename',{id:'new',name:'Dewi Sore'}),'rename');s=run(s,staff('status',{id:'new',active:false,confirmed:true}),'off');
 assert.equal(s.orders[0].actor,'new');assert.deepEqual(s.audits[0],previousAudit);assert.equal(actorName(s,'new'),'Dewi Sore · Kasir');assert.equal(staffList(s).find(x=>x.id==='new')!.active,false);
 assert.throws(()=>permission({...s,actor:'new'},{kind:'open',activity:'Rutin',data:{},reason:'',amount:0}),/nonaktif/);
 s=run(s,staff('status',{id:'new',active:true,confirmed:true}),'on');assert.equal(staffList(s).find(x=>x.id==='new')!.id,'new');
});
test('staff administration rejects offline, staff, reader, invalid identity and owner deletion without mutating source',()=>{
 const s=fixture(),a=staff('add',{id:'new',name:'Dewi'});
 for(const blocked of [{...s,online:false},{...s,actor:'a'},{...s,writer:false}])assert.throws(()=>run(blocked,a));
 assert.throws(()=>run(s,staff('add',{id:'owner',name:'Other'})));
 assert.throws(()=>run(s,staff('rename',{id:'a',name:'Budi'})),/sudah dipakai/);
 assert.throws(()=>run(s,staff('status',{id:'owner',active:false,confirmed:true})),/Owner/);
 assert.equal(s.audits.length,0);assert.equal(staffList(s).length,2);
});
test('owner HP administration waits for cashier ACK and cannot mutate business ledger',()=>{
 const s={...fixture(),surface:'HP owner' as const},next=run(s,staff('status',{id:'a',active:false,confirmed:true}));
 assert.equal(next.policyVersion,s.policyVersion+1);assert.equal(next.policyReceived,s.policyReceived);const ack=run({...next,surface:'Kasir'},{kind:'accessAck',activity:'Pengaturan',data:{},reason:'Terima akses',amount:0},'ack');assert.equal(ack.policyReceived,next.policyVersion);assert.equal(ack.policyVersion,next.policyVersion);assert.deepEqual(next.cash,s.cash);assert.deepEqual(next.stockLedger,s.stockLedger);
 assert.throws(()=>run(next,{kind:'open',activity:'Rutin',data:{amount:0},reason:'',amount:0},'cash'),/HP owner/);
});
test('cash holder must hand over before deactivation; reset PIN only records demo revision',()=>{
 const s=fixture();s.cash.open=true;s.cash.segments=[{actor:'a',baseline:0,startExpected:0,counts:[]}];
 assert.throws(()=>run(s,staff('status',{id:'a',active:false,confirmed:true})),/serah-terima/);
 const next=run(s,staff('resetPin',{id:'a',confirmed:true}));assert.equal(staffList(next)[0].pinRevision,2);assert.equal(staffList(s)[0].pinRevision,1);
 assert.ok(!JSON.stringify(next.staff).includes('123456'));
});
test('shared policy validates activity/permission/bounds and enforces immutable operation payload',()=>{
 const s=fixture(),a:Action={kind:'policy',activity:'Pengaturan',data:{rules:{'Refund uang':'Hanya owner'},limitAmount:5000,limitBp:1000},reason:'Izin staf',amount:0};
 const n=run(s,a);assert.equal(n.policy['Refund uang'],'Hanya owner');assert.equal(n.policyReceived,n.policyVersion);
 assert.throws(()=>run(n,{...a,data:{rules:{}}}),/input berbeda/);
 for(const data of [{rules:{'Role admin':'Boleh kasir'}},{rules:{'Refund uang':'Selalu'}},{rules:{},limitAmount:-1},{rules:{},limitAmount:''},{rules:{},limitAmount:'1e3'},{rules:{},limitAmount:1000000000},{rules:{},limitBp:10001}])assert.throws(()=>run(s,{...a,data}));
 assert.equal(s.policyVersion,1);
});
