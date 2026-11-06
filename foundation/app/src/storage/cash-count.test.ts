import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {BerrieDatabase} from './database';
import {openCashSession,moveCash,type CashMetadata} from './cash-sessions';
import {changeCashCount,readCashCount} from './cash-count';
import {checkpoint,stageSnapshot} from './recovery';
import type {LockProvider} from './commit';
const locks:LockProvider={request:async(_n,fn)=>fn()};
const id='11111111-1111-4111-8111-111111111111';
const meta=(operationId:string,localSequence:number):CashMetadata=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T16:59:00Z'});
const open={sessionId:id,number:'1',initialCustodian:'actor',openingAmount:100,timeZone:'Asia/Jakarta'};
const data=(expectedSessionRevision:number,expectedCountRevision:number|null)=>({sessionId:id,expectedSessionRevision,expectedCountRevision});
it('revisi, batal, hitung lagi, tutup dan replay tetap berjejak',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 await openCashSession(db,open,meta('open',1),locks);
 const first=await changeCashCount(db,'save',{...data(0,null),amount:0},meta('save',2),locks);
 await expect(moveCash(db,{sessionId:id,expectedRevision:1,kind:'in',amount:1,category:'a',description:'b'},meta('move',3),locks)).rejects.toThrow();
 await changeCashCount(db,'revise',{...data(1,0),amount:110},meta('revise',3),locks);
 await changeCashCount(db,'cancel',data(2,1),meta('cancel',4),locks);
 await moveCash(db,{sessionId:id,expectedRevision:3,kind:'in',amount:10,category:'a',description:'b'},meta('move',5),locks);
 await changeCashCount(db,'save',{...data(4,2),amount:100},meta('save2',6),locks);
 await expect(changeCashCount(db,'close',data(5,3),meta('close',7),locks)).rejects.toThrow();
 await changeCashCount(db,'close',{...data(5,3),reason:'kurang'},meta('close',7),locks);
 expect(await changeCashCount(db,'save',{...data(0,null),amount:0},meta('save',2),locks)).toEqual(first);
 const h=await readCashCount(db,'store',id);expect(h?.events.map(e=>e.action)).toEqual(['save','revise','cancel','save','close']);expect(h?.events.at(-1)).toMatchObject({amount:100,expected:110,difference:-10,reason:'kurang',countOperationId:'save2'});
 const next={...open,sessionId:'22222222-2222-4222-8222-222222222222',number:'2'};const opened=await openCashSession(db,next,meta('open2',8),locks);expect(await openCashSession(db,next,meta('open2',8),locks)).toEqual(opened);
 await expect(moveCash(db,{sessionId:id,expectedRevision:6,kind:'in',amount:1,category:'a',description:'b'},meta('old',9),locks)).rejects.toThrow();
 await expect(openCashSession(db,{...next,sessionId:'33333333-3333-4333-8333-333333333333'},meta('third',9),locks)).rejects.toThrow();
 expect(await readCashCount(db,'store',id)).toEqual(h);
 const snapshot=await checkpoint(db);await stageSnapshot(stage,snapshot);expect(await checkpoint(stage)).toEqual(snapshot);
 }finally{await db.delete();await stage.delete();}});

it.each([{opening:0,physical:0,diff:0,reason:null},{opening:100,physical:150,diff:50,reason:'lebih'},{opening:100,physical:0,diff:-100,reason:'kurang'}])('snapshot $diff tidak membuat ledger penyesuaian',async({opening,physical,diff,reason})=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 await openCashSession(db,{...open,openingAmount:opening},meta('open',1),locks);
 await changeCashCount(db,'save',{...data(0,null),amount:physical},meta('save',2),locks);
 if(diff!==0) await expect(changeCashCount(db,'close',data(1,0),meta('close',3),locks)).rejects.toThrow();
 await changeCashCount(db,'close',{...data(1,0),reason},meta('close',3),locks);
 const snapshot=await checkpoint(db),event=(await readCashCount(db,'store',id))!.events.at(-1)!;expect(event).toMatchObject({amount:physical,expected:opening,difference:diff,reason,blockers:[],incomplete:[]});expect(snapshot.ledger).toHaveLength(1);
 }finally{await db.delete();}});

it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback %s pada save, revise, cancel dan close',async table=>{for(const action of ['save','revise','cancel','close'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{
 await openCashSession(db,open,meta('open',1),locks);if(action!=='save') await changeCashCount(db,'save',{...data(0,null),amount:100},meta('save',2),locks);
 const before=await checkpoint(db),payload=action==='save'?{...data(0,null),amount:100}:action==='revise'?{...data(1,0),amount:100}:data(1,0),m=meta(action==='save'?'save':'next',action==='save'?2:3);
 const hook=()=>{throw new Error('fault')};db[table].hook('creating',hook);db[table].hook('updating',hook);
 await expect(changeCashCount(db,action,payload,m,locks)).rejects.toThrow('fault');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);
 const result=await changeCashCount(db,action,payload,m,locks),after=await checkpoint(db);expect(await changeCashCount(db,action,payload,m,locks)).toEqual(result);expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}}});

it('menolak revisi stale, nilai tidak aman, konflik intent dan input yang berubah saat lock',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 await openCashSession(db,open,meta('open',1),locks);const before=await checkpoint(db);
 for(const amount of [-1,1.5,Number.MAX_SAFE_INTEGER+1]) await expect(Promise.resolve().then(()=>changeCashCount(db,'save',{...data(0,null),amount},meta('bad',2),locks))).rejects.toThrow();
 await expect(changeCashCount(db,'save',{...data(1,null),amount:0},meta('bad',2),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const input={...data(0,null),amount:0},m=meta('save',2),pending=changeCashCount(db,'save',input,m,blocked);await ready;input.amount=50;m.actorId='lain';release();await pending;
 expect((await readCashCount(db,'store',id))!.events[0]).toMatchObject({amount:0,actorId:'actor'});
 await expect(changeCashCount(db,'save',{...data(0,null),amount:1},meta('save',2),locks)).rejects.toThrow('Konflik');
 await expect(changeCashCount(db,'revise',{...data(1,null),amount:1},meta('revise',3),locks)).rejects.toThrow();
 }finally{await db.delete();}});

it('commitChange tidak melewati penahanan dan staging menolak snapshot yang dimanipulasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {makeCashChange}=await import('./cash-sessions'),{commitChange,canonical}=await import('./commit');await openCashSession(db,open,meta('open',1),locks);await changeCashCount(db,'save',{...data(0,null),amount:100},meta('save',2),locks);
 const frozen=await checkpoint(db),session=(frozen.state.find(r=>r.key===`cash-session:${id}`)!.value as {session:import('../domain/cash-session').CashSession}).session;
 const move={sessionId:id,expectedRevision:1,kind:'in' as const,amount:1,category:'modal',description:'masuk'};
 await expect(commitChange(db,makeCashChange(session,move,meta('forged',3),1,100),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(frozen);
 await changeCashCount(db,'close',data(1,0),meta('close',3),locks);const original=await checkpoint(db);
 for(const field of ['amount','expected','boundary'] as const) {
  const bad=structuredClone(original),receipt=bad.receipts.find(r=>r.id==='close')!,change=JSON.parse(receipt.payload),count=change.state.find((r:{key:string})=>r.key===`cash-count:${id}`).value.history,event=count.events.at(-1);
  if(field==='boundary') event.boundary=[];else {event[field]++;event.difference=event.amount-event.expected;event.reason='dipalsukan';}
  change.audit[0].value.event=event;change.result.event=event;receipt.payload=canonical(change);receipt.result=change.result;
  bad.state.find(r=>r.key===`cash-count:${id}`)!.value=change.state.find((r:{key:string})=>r.key===`cash-count:${id}`).value;bad.audit.find(r=>r.operationId==='close')!.value=change.audit[0].value;
  await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(original);
 }
 }finally{await db.delete();await stage.delete();}});

it('record generik lama dengan nama kind serupa tidak diubah menjadi hitungan',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {commitChange}=await import('./commit');const op='legacy';await commitChange(db,{...meta(op,1),kind:'cash-count.save',targetId:'legacy',payload:{legacy:true},state:[{key:'legacy',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'legacy-audit',operationId:op,value:{}}],outbox:{id:'legacy-outbox',operationId:op,value:{}},result:{}},locks);const snapshot=await checkpoint(db);await stageSnapshot(stage,snapshot);expect(await checkpoint(stage)).toEqual(snapshot);
 }finally{await db.delete();await stage.delete();}});

it('kind generik mirip close tidak dapat menjadi sumber pembukaan kedua',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {commitChange}=await import('./commit'),{makeCashChange}=await import('./cash-sessions');await openCashSession(db,open,meta('open',1),locks);
 await commitChange(db,{...meta('legacy-close',2),kind:'cash-count.close',targetId:id,payload:{legacy:true},state:[{key:'legacy',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'legacy-audit',operationId:'legacy-close',value:{}}],outbox:{id:'legacy-outbox',operationId:'legacy-close',value:{}},result:{}},locks);
 const next={...open,sessionId:'22222222-2222-4222-8222-222222222222',number:'2'},m=meta('open2',3),session={id:next.sessionId,storeId:'store',number:'2',openedBy:'actor',initialCustodian:'actor',openedAt:m.recordedAt,timeZone:next.timeZone,businessDate:'2026-11-01',openingAmount:100},before=await checkpoint(db);
 await expect(commitChange(db,makeCashChange(session,next,m,null,0,'legacy-close'),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('checkpoint menolak record generik yang disisipkan selama hitungan aktif',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {canonical,commitChange}=await import('./commit');await openCashSession(db,open,meta('open',1),locks);await changeCashCount(db,'save',{...data(0,null),amount:100},meta('save',2),locks);const before=await checkpoint(db);
 const change={...meta('legacy-write',1),deviceId:'legacy-device',kind:'legacy',targetId:'unknown',payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'legacy-audit',operationId:'legacy-write',value:{}}],outbox:{id:'legacy-outbox',operationId:'legacy-write',value:{}},result:{}};
 await expect(commitChange(db,change,locks)).rejects.toThrow();const bad=structuredClone(before);bad.state.push({key:'order:unknown',revision:0,value:{old:true}});bad.audit.push(change.audit[0]);bad.outbox.push(change.outbox);bad.receipts.push({id:change.operationId,payload:canonical(change),result:{}});bad.sequences.push({key:JSON.stringify(['store','legacy-device',1]),sequence:1});await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();await stage.delete();}});
