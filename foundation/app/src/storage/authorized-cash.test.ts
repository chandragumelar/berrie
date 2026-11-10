import 'fake-indexeddb/auto';
import { expect,it } from 'vitest';
import { createPinVerifier, MIN_ITERATIONS } from '../domain/local-pin';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash, type PermissionMode } from '../domain/permission-policy';
import { BerrieDatabase } from './database';
import { LocalPinSecurity } from './local-pin';
import { OfflinePermitStorage } from './offline-permit';
import { AuthorizedCash } from './authorized-cash';
import { checkpoint, stageSnapshot } from './recovery';
import type { LockProvider } from './commit';

function locks():LockProvider {
 const queues=new Map<string,Promise<unknown>>();
 return {request<T>(name:string,fn:()=>Promise<T>){const old=queues.get(name) ?? Promise.resolve(),next=old.then(fn,fn);queues.set(name,next.catch(()=>{}));return next;}};
}
const sessionId='11111111-1111-4111-8111-111111111111';
const opening={sessionId,number:'1',initialCustodian:'actor',openingAmount:1200,timeZone:'Asia/Jakarta'};
const move={sessionId,expectedRevision:0,kind:'in' as const,amount:300,category:'modal',description:'tambah'};
const op=(operationId:string,localSequence:number)=>({operationId,localSequence,recordedAt:'2026-11-01T00:00:00Z'});
async function setup(role:'owner'|'staff'='owner',mode:PermissionMode='allow',active=true,version:1|2=2) {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const name=`cash-auth-${crypto.randomUUID()}`,lock=locks(),identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
 let wall=Date.parse('2026-11-01T00:00:00Z'),mono=1000000;
 const now=()=>wall,clock=()=>mono,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,lock,now,clock),permit=new OfflinePermitStorage(name,{key:pair.publicKey},lock,now,clock),gateway=new AuthorizedCash(db,pin,permit,lock);
 const policy={version:1,storeId:'store',actors:[{id:'actor',role,active}],matrix:{...defaults,'cash-adjustment':mode},discountLimit:{rupiah:null,basisPoints:null}};
 const p:PermitPayload={version,algorithm:'ES256',keyId:'key',...identity,role,scope:'cashier',sequence:1,verifiedAt:wall,entitlementEnd:wall+30*86400000,...(version===2?{policyVersion:1,policyHash:await policyHash(policy)}:{})};
 const sign=async(payload:PermitPayload)=>{const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));return {payload,signature:btoa(String.fromCharCode(...signature)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};};
 await pin.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(identity,'123456');await permit.install(await sign(p),identity,version===2?policy:undefined);
 return {db,pin,permit,gateway,identity,lock,policy,p,sign,now,advance:(n:number)=>{wall+=n;mono+=n},wall:(n:number)=>{wall=n},close:()=>{pin.close();permit.close();db.close();}};
}

it.each(['owner','staff'] as const)('hasil %s minimal, replay aman dan laporan hanya owner',async role=>{
 const s=await setup(role);try {
  expect(await s.gateway.open(s.identity,opening,op('open',1))).toEqual({status:'ok',sessionId,revision:0});
  expect(await s.gateway.move(s.identity,move,op('move',2))).toEqual({status:'ok',sessionId,revision:1});
  const snapshot=await checkpoint(s.db);
  const stage=new BerrieDatabase(`${s.db.name}-stage`);try {await stageSnapshot(stage,snapshot);expect(await checkpoint(stage)).toEqual(snapshot);expect(JSON.stringify(snapshot)).not.toMatch(/signature|policyHash|verifier|123456/);} finally {await stage.delete();}
  expect(await s.gateway.move(s.identity,move,op('move',2))).toEqual({status:'ok',sessionId,revision:1});
  expect(await s.gateway.move(s.identity,{...move,amount:301},op('move',2))).toEqual({status:'denied'});
  expect(await checkpoint(s.db)).toEqual(snapshot);
  const balance=await s.gateway.balance(s.identity,sessionId),report=await s.gateway.report(s.identity,sessionId),csv=await s.gateway.csv(s.identity,sessionId);
  if(role==='owner') {expect(balance).toEqual({status:'ok',value:1500});expect(report.status).toBe('ok');expect(csv.status).toBe('ok');if(report.status==='ok') {expect(report.value.report.summary).toMatchObject({opening:1200,cashIn:300,expected:1500});expect(report.value.report.ledger.map(x=>x.movement.kind)).toEqual(['opening','in']);}if(csv.status==='ok') {expect(csv.value.summary).toContain('"expected",1500');expect(csv.value.ledger).toContain('move');}}
  else {expect([balance,report,csv]).toEqual([{status:'denied'},{status:'denied'},{status:'denied'}]);expect(JSON.stringify([balance,report,csv])).not.toMatch(/1500|1200|balance|before|after|receipt/);}
 }finally{s.close();}
});
it.each(['approval','owner-only'] as const)('staf %s menahan pergerakan tanpa perubahan',async mode=>{const s=await setup('staff',mode);try{await s.gateway.open(s.identity,opening,op('open',1));const before=await checkpoint(s.db);for(const kind of ['in','out'] as const) expect(await s.gateway.move(s.identity,{...move,kind},op('move',2))).toEqual({status:mode==='approval'?'approval-required':'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it('permit lama, actor nonaktif, identitas lain dan PIN terkunci ditolak',async()=>{
 for(const [version,active] of [[1,true],[2,false]] as const){const s=await setup('staff','allow',active,version);try{const before=await checkpoint(s.db);expect(await s.gateway.open(s.identity,opening,op('open',1))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}}
 const s=await setup();try{for(const id of [{...s.identity,storeId:'x'},{...s.identity,deviceId:'x'},{...s.identity,epoch:2},{...s.identity,actorId:'x'}]) expect(await s.gateway.open(id,opening,op('open',1))).toEqual({status:'denied'});await s.pin.lock();expect(await s.gateway.open(s.identity,opening,op('open',1))).toEqual({status:'denied'});expect((await checkpoint(s.db)).receipts).toHaveLength(0);}finally{s.close();}
});
it('expiry menolak mutasi dan tetap mengizinkan baca owner; clock fault menolak semua',async()=>{const s=await setup();try{await s.gateway.open(s.identity,opening,op('open',1));s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');expect(await s.gateway.move(s.identity,move,op('move',2))).toEqual({status:'denied'});expect(await s.gateway.balance(s.identity,sessionId)).toEqual({status:'ok',value:1200});expect((await s.gateway.report(s.identity,sessionId)).status).toBe('ok');expect((await s.gateway.csv(s.identity,sessionId)).status).toBe('ok');s.wall(s.now()+5000);expect(await s.gateway.balance(s.identity,sessionId)).toEqual({status:'denied'});}finally{s.close();}});
it('writer tertahan: input disalin, perubahan PIN membatalkan, revisi basi dan dua mutasi',async()=>{
 const s=await setup();try{
  let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);
  const blocker=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await held;});await ready;
  const data={...opening},pending=s.gateway.open(s.identity,data,op('open',1));data.openingAmount=99;release();await blocker;
  expect(await pending).toEqual({status:'ok',sessionId,revision:0});expect(await s.gateway.balance(s.identity,sessionId)).toEqual({status:'ok',value:1200});
  const results=await Promise.all([s.gateway.move(s.identity,move,op('a',2)),s.gateway.move(s.identity,move,op('b',2))]);expect(results.filter(x=>x.status==='ok')).toHaveLength(1);expect(results.filter(x=>x.status==='denied')).toHaveLength(1);
  const before=await checkpoint(s.db);expect(await s.gateway.move(s.identity,move,op('stale',3))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}
});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('rollback gateway pada kegagalan %s',async table=>{const s=await setup('staff');try{const before=await checkpoint(s.db),hook=()=>{throw new Error('write failed')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);expect(await s.gateway.open(s.identity,opening,op('open',1))).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);expect((await s.gateway.open(s.identity,opening,op('open',1))).status).toBe('ok');}finally{s.close();}});
it('pergantian sesi PIN atau permit saat antre membatalkan intent lama',async()=>{
 for(const change of ['pin','permit'] as const) {const s=await setup();try{
  let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),read=s.permit.read.bind(s.permit);
  s.permit.read=async identity=>{const result=await read(identity);entered();await gate;return result;};
  const pending=s.gateway.open(s.identity,opening,op('open',1));await ready;
  if(change==='pin') await s.pin.lock();else {
   const policy={...s.policy,version:2};const payload={...s.p,sequence:2,policyVersion:2,policyHash:await policyHash(policy)};
   await s.permit.install(await s.sign(payload),s.identity,policy);
  }
  release();expect(await pending).toEqual({status:'denied'});expect((await checkpoint(s.db)).receipts).toHaveLength(0);
 }finally{s.close();}}
});
it('expiry ketika transaksi menulis menggulung semua efek',async()=>{const s=await setup();try{
 s.advance(7*86400000-1);await s.pin.unlock(s.identity,'123456');const before=await checkpoint(s.db),hook=()=>{s.advance(1);};s.db.receipts.hook('creating',hook);
 expect(await s.gateway.open(s.identity,opening,op('open',1))).toEqual({status:'denied'});s.db.receipts.hook('creating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);
}finally{s.close();}});
it('penanggung jawab awal, data tambahan dan identitas operator tidak sah ditolak',async()=>{const s=await setup();try{
 expect(await s.gateway.open(s.identity,{...opening,initialCustodian:'someone'},op('bad',1))).toEqual({status:'denied'});
 const extra={...op('bad',1),pin:'123456'};expect(await s.gateway.open(s.identity,opening,extra)).toEqual({status:'denied'});
 expect((await checkpoint(s.db)).receipts).toHaveLength(0);
}finally{s.close();}});
it('permit hilang atau signature tidak dapat diverifikasi tidak mengubah bisnis',async()=>{const s=await setup();try{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);const bad=new OfflinePermitStorage(s.db.name,{key:pair.publicKey},s.lock,s.now,()=>1000000),gateway=new AuthorizedCash(s.db,s.pin,bad,s.lock);
 expect(await gateway.open(s.identity,opening,op('bad',1))).toEqual({status:'denied'});bad.close();
 const other=new BerrieDatabase(`empty-${crypto.randomUUID()}`),pin=new LocalPinSecurity(other.name,s.lock,s.now,()=>1000000),permit=new OfflinePermitStorage(other.name,{key:pair.publicKey},s.lock,s.now,()=>1000000);await pin.installVerifier(s.identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(s.identity,'123456');
 expect(await new AuthorizedCash(other,pin,permit,s.lock).open(s.identity,opening,op('missing',1))).toEqual({status:'denied'});expect((await checkpoint(other)).receipts).toHaveLength(0);pin.close();permit.close();other.close();expect((await checkpoint(s.db)).receipts).toHaveLength(0);
}finally{s.close();}});
it('hitungan aktif dan handover tidak dapat dilewati oleh operator lama',async()=>{const s=await setup('staff');try{
 const {changeCashCount}=await import('./cash-count');await s.gateway.open(s.identity,opening,op('open',1));
 const meta=(operationId:string,localSequence:number,actorId='actor')=>({...op(operationId,localSequence),storeId:'store',deviceId:'device',deviceEpoch:1,actorId,policyVersion:1});
 await changeCashCount(s.db,'save',{sessionId,expectedSessionRevision:0,expectedCountRevision:null,purpose:'handover',amount:1200},meta('count',2),s.lock);
 const held=await checkpoint(s.db);expect(await s.gateway.move(s.identity,{...move,expectedRevision:1},op('held',3))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(held);
 await changeCashCount(s.db,'handover',{sessionId,expectedSessionRevision:1,expectedCountRevision:0,purpose:'handover',incoming:'other',received:1200},meta('handover',3,'other'),s.lock);
 const transferred=await checkpoint(s.db);expect(await s.gateway.move(s.identity,{...move,expectedRevision:2},op('old-actor',4))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(transferred);
}finally{s.close();}});
it.each(['allow','approval','owner-only'] as const)('owner dapat mencatat kas pada mode %s',async mode=>{const s=await setup('owner',mode);try{expect((await s.gateway.open(s.identity,opening,op('open',1))).status).toBe('ok');expect((await s.gateway.move(s.identity,move,op('move',2))).status).toBe('ok');}finally{s.close();}});
it('staf tidak dapat baca atau mutasi setelah expiry',async()=>{const s=await setup('staff');try{await s.gateway.open(s.identity,opening,op('open',1));s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');const before=await checkpoint(s.db);expect(await s.gateway.move(s.identity,move,op('move',2))).toEqual({status:'denied'});expect(await s.gateway.balance(s.identity,sessionId)).toEqual({status:'denied'});expect(await s.gateway.report(s.identity,sessionId)).toEqual({status:'denied'});expect(await s.gateway.csv(s.identity,sessionId)).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});

it.each(['owner','staff'] as const)('hitung akhir berizin dan buta untuk %s',async role=>{const s=await setup(role);try {
 await s.gateway.open(s.identity,opening,op('open',1));
 const base={sessionId,expectedSessionRevision:0,expectedCountRevision:null};
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'ok',value:{sessionId,sessionRevision:0,countRevision:null,active:null}});
 expect((await s.gateway.saveCount(s.identity,{...base,amount:0},op('count',2))).status).toBe('ok');
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'ok',value:{sessionId,sessionRevision:1,countRevision:0,active:{amount:0,expected:1200,difference:-1200,segmentExpected:1200,segmentDifference:-1200}}});
 expect(await s.gateway.move(s.identity,{...move,expectedRevision:1},op('blocked',3))).toEqual({status:'denied'});
 expect((await s.gateway.reviseCount(s.identity,{sessionId,expectedSessionRevision:1,expectedCountRevision:0,amount:1000},op('revise',3))).status).toBe('ok');
 expect((await s.gateway.cancelCount(s.identity,{sessionId,expectedSessionRevision:2,expectedCountRevision:1},op('cancel',4))).status).toBe('ok');
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'ok',value:{sessionId,sessionRevision:3,countRevision:2,active:null}});
 const save={sessionId,expectedSessionRevision:3,expectedCountRevision:2,amount:0},saved=await s.gateway.saveCount(s.identity,save,op('save-again',5));
 expect(await s.gateway.saveCount(s.identity,save,op('save-again',5))).toEqual(saved);
 expect(await s.gateway.saveCount(s.identity,{...save,amount:1},op('save-again',5))).toEqual({status:'denied'});
 const close={sessionId,expectedSessionRevision:4,expectedCountRevision:3};
 expect(await s.gateway.close(s.identity,close,op('close',6))).toEqual({status:'denied'});
 const done=await s.gateway.close(s.identity,{...close,reason:'selisih'},op('close',6));expect(done.status).toBe('ok');
 expect(await s.gateway.close(s.identity,{...close,reason:'selisih'},op('close',6))).toEqual(done);
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'denied'});
 const snapshot=await checkpoint(s.db),stage=new BerrieDatabase(`${s.db.name}-count-stage`);try{await stageSnapshot(stage,snapshot);expect(await checkpoint(stage)).toEqual(snapshot);}finally{await stage.delete();}
 }finally{s.close();}});
it('owner boleh menyelesaikan sesi existing saat expired, staf dan clock fault ditolak',async()=>{for(const role of ['owner','staff'] as const){const s=await setup(role);try{
 await s.gateway.open(s.identity,opening,op('open',1));s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');
 const input={sessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:1200};
 expect((await s.gateway.saveCount(s.identity,input,op('count',2))).status).toBe(role==='owner'?'ok':'denied');
 if(role==='owner') expect((await s.gateway.close(s.identity,{sessionId,expectedSessionRevision:1,expectedCountRevision:0},op('close',3))).status).toBe('ok');
 }finally{s.close();}}});
it('hitungan handover dan field tambahan tidak diterima gateway',async()=>{const s=await setup('staff');try{await s.gateway.open(s.identity,opening,op('open',1));const base={sessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:1200};
 expect(await s.gateway.saveCount(s.identity,{...base,purpose:'handover'} as typeof base,op('bad',2))).toEqual({status:'denied'});
 const {changeCashCount}=await import('./cash-count');await changeCashCount(s.db,'save',{...base,purpose:'handover'},{...op('handover',2),storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1},s.lock);
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'denied'});expect(await s.gateway.close(s.identity,{sessionId,expectedSessionRevision:1,expectedCountRevision:0},op('close',3))).toEqual({status:'denied'});
 }finally{s.close();}});
it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback hitung gateway saat %s gagal',async table=>{const s=await setup('staff');try{
 await s.gateway.open(s.identity,opening,op('open',1));const before=await checkpoint(s.db),hook=()=>{throw new Error('write failed')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);
 const input={sessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:1200};expect(await s.gateway.saveCount(s.identity,input,op('count',2))).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);expect((await s.gateway.saveCount(s.identity,input,op('count',2))).status).toBe('ok');
 }finally{s.close();}});
it('expiry dan clock fault sebelum commit menggulung hitungan',async()=>{for(const fault of ['expiry','clock'] as const){const s=await setup('staff');try{
 await s.gateway.open(s.identity,opening,op('open',1));if(fault==='expiry'){s.advance(7*86400000-1);await s.pin.unlock(s.identity,'123456');}const before=await checkpoint(s.db),hook=()=>{if(fault==='expiry')s.advance(1);else s.wall(s.now()+5000);};s.db.receipts.hook('creating',hook);
 expect(await s.gateway.saveCount(s.identity,{sessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:1200},op('count',2))).toEqual({status:'denied'});s.db.receipts.hook('creating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}}});
it('pemegang lain dan hitungan aktif actor lain tidak dapat dibaca atau diubah',async()=>{const s=await setup('staff');try{const {openCashSession}=await import('./cash-sessions'),{changeCashCount}=await import('./cash-count');const meta=(id:string,n:number,actorId:string)=>({...op(id,n),storeId:'store',deviceId:'device',deviceEpoch:1,actorId,policyVersion:1});
 await openCashSession(s.db,{...opening,initialCustodian:'other'},meta('open',1,'other'),s.lock);const base={sessionId,expectedSessionRevision:0,expectedCountRevision:null};
 expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'denied'});expect(await s.gateway.saveCount(s.identity,{...base,amount:1200},op('bad',2))).toEqual({status:'denied'});
 await changeCashCount(s.db,'save',{...base,amount:1200},meta('count',2,'other'),s.lock);expect(await s.gateway.count(s.identity,sessionId)).toEqual({status:'denied'});
 }finally{s.close();}});
it('input hitungan disalin sebelum antre dan revisi basi ditolak',async()=>{const s=await setup('staff');try{
 await s.gateway.open(s.identity,opening,op('open',1));let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),held=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await gate;});await ready;
 const input={sessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:0},pending=s.gateway.saveCount(s.identity,input,op('count',2));input.amount=1200;release();await held;expect((await pending).status).toBe('ok');const read=await s.gateway.count(s.identity,sessionId);expect(read.status==='ok' && read.value.active?.amount).toBe(0);
 expect(await s.gateway.reviseCount(s.identity,{sessionId,expectedSessionRevision:1,expectedCountRevision:null,amount:1},op('stale',3))).toEqual({status:'denied'});
 }finally{s.close();}});
it('pemegang baru menutup sesi dengan histori handover tanpa mengambil alih',async()=>{const s=await setup('staff');try{const {openCashSession}=await import('./cash-sessions'),{changeCashCount}=await import('./cash-count');const meta=(id:string,n:number,actorId:string)=>({...op(id,n),storeId:'store',deviceId:'device',deviceEpoch:1,actorId,policyVersion:1});
 await openCashSession(s.db,{...opening,initialCustodian:'other'},meta('open',1,'other'),s.lock);await changeCashCount(s.db,'save',{sessionId,expectedSessionRevision:0,expectedCountRevision:null,purpose:'handover',amount:1200},meta('handover-count',2,'other'),s.lock);await changeCashCount(s.db,'handover',{sessionId,expectedSessionRevision:1,expectedCountRevision:0,purpose:'handover',incoming:'actor',received:1200},meta('handover',3,'actor'),s.lock);
 expect((await s.gateway.saveCount(s.identity,{sessionId,expectedSessionRevision:2,expectedCountRevision:1,amount:1200},op('count',4))).status).toBe('ok');expect((await s.gateway.close(s.identity,{sessionId,expectedSessionRevision:3,expectedCountRevision:2},op('close',5))).status).toBe('ok');
 }finally{s.close();}});
