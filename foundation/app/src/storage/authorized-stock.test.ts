import 'fake-indexeddb/auto';
import { expect,it } from 'vitest';
import { createPinVerifier, MIN_ITERATIONS } from '../domain/local-pin';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash, type PermissionMode } from '../domain/permission-policy';
import { BerrieDatabase } from './database';
import { LocalPinSecurity } from './local-pin';
import { OfflinePermitStorage } from './offline-permit';
import { AuthorizedStock } from './authorized-stock';
import { checkpoint } from './recovery';
import { type LockProvider } from './commit';
function locks():LockProvider {
 const queues=new Map<string,Promise<unknown>>();
 return {request<T>(name:string,fn:()=>Promise<T>){const old=queues.get(name) ?? Promise.resolve(),next=old.then(fn,fn);queues.set(name,next.catch(()=>{}));return next;}};
}
async function setup(role:'owner'|'staff'='owner',mode:PermissionMode='allow',active=true,version:1|2=2) {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const name=`cash-auth-${crypto.randomUUID()}`,lock=locks(),identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
 let wall=Date.parse('2026-11-01T00:00:00Z'),mono=1000000;
 const now=()=>wall,clock=()=>mono,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,lock,now,clock),permit=new OfflinePermitStorage(name,{key:pair.publicKey},lock,now,clock),gateway=new AuthorizedStock(db,pin,permit,lock);
 const policy={version:1,storeId:'store',actors:[{id:'actor',role,active}],matrix:{...defaults,'stock-correction':mode},discountLimit:{rupiah:null,basisPoints:null}};
 const p:PermitPayload={version,algorithm:'ES256',keyId:'key',...identity,role,scope:'cashier',sequence:1,verifiedAt:wall,entitlementEnd:wall+30*86400000,...(version===2?{policyVersion:1,policyHash:await policyHash(policy)}:{})};
 const sign=async(payload:PermitPayload)=>{const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));return {payload,signature:btoa(String.fromCharCode(...signature)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};};
 await pin.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(identity,'123456');await permit.install(await sign(p),identity,version===2?policy:undefined);
 return {db,pin,permit,gateway,identity,lock,policy,p,sign,now,advance:(n:number)=>{wall+=n;mono+=n},wall:(n:number)=>{wall=n},close:()=>{pin.close();permit.close();db.close();}};
}

const op=(operationId:string,localSequence:number)=>({operationId,localSequence,recordedAt:'2026-11-01T00:00:00Z'});
const open={groupId:'g',balance:0};
const correction={groupId:'g',value:8,reason:'hitung',expectedRevision:0,expectedBalance:0};
const minimum={groupId:'g',value:3,expectedRevision:1,expectedBalance:8};
it('owner opening nol, koreksi, minimum, replay, konflik dan staging',async()=>{const s=await setup();try{
 expect(await s.gateway.createStockGroup(s.identity,open,op('open',1))).toEqual({status:'ok',groupId:'g',revision:0});
 expect(await s.gateway.correctStockBaseline(s.identity,correction,op('correct',2))).toEqual({status:'ok',groupId:'g',revision:1});
 const beforeMin=await checkpoint(s.db);expect(await s.gateway.setStockMinimum(s.identity,minimum,op('min',3))).toEqual({status:'ok',groupId:'g',revision:2});
 const after=await checkpoint(s.db);expect(after.ledger).toEqual(beforeMin.ledger);expect(await s.gateway.setStockMinimum(s.identity,minimum,op('min',3))).toEqual({status:'ok',groupId:'g',revision:2});expect(await s.gateway.setStockMinimum(s.identity,{...minimum,value:4},op('min',3))).toEqual({status:'denied'});
 expect(await s.gateway.correctStockBaseline(s.identity,correction,op('stale',4))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(after);
 const {stageSnapshot}=await import('./recovery'),stage=new BerrieDatabase(crypto.randomUUID());try{await stageSnapshot(stage,after);expect(await checkpoint(stage)).toEqual(after);}finally{await stage.delete();}
 }finally{s.close();}});
it.each(['allow','approval','owner-only'] as const)('staf hanya koreksi sesuai matriks %s',async mode=>{const s=await setup('staff',mode);try{
 const {createStockGroup}=await import('./stock-groups');await createStockGroup(s.db,open,{...op('open',1),storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1},s.lock);
 const before=await checkpoint(s.db);expect(await s.gateway.createStockGroup(s.identity,{groupId:'other',balance:0},op('x',2))).toEqual({status:'denied'});expect(await s.gateway.setStockMinimum(s.identity,{...minimum,expectedRevision:0,expectedBalance:0},op('x',2))).toEqual({status:'denied'});
 expect(await s.gateway.correctStockBaseline(s.identity,correction,op('c',2))).toEqual(mode==='allow'?{status:'ok',groupId:'g',revision:1}:{status:mode==='approval'?'approval-required':'denied'});if(mode!=='allow')expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('identitas, database, actor, PIN, permit dan policy salah ditolak',async()=>{
 for(const [active,version] of [[false,2],[true,1]] as const){const s=await setup('owner','allow',active,version);try{expect(await s.gateway.createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});}finally{s.close();}}
 const s=await setup();try{const before=await checkpoint(s.db);for(const i of [{...s.identity,storeId:'other'},{...s.identity,deviceId:'other'},{...s.identity,epoch:2},{...s.identity,actorId:'other'},{...s.identity,role:'owner'}]) expect(await s.gateway.createStockGroup(i,open,op('x',1))).toEqual({status:'denied'});
 const other=new BerrieDatabase(`${s.db.name}-other`);expect(await new AuthorizedStock(other,s.pin,s.permit,s.lock).createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});other.close();
 const Dexie=(await import('dexie')).default,security=new Dexie(`${s.db.name}-offline-permit-security`);security.version(1).stores({permits:'&key'});const table=security.table('permits'),row=await table.get('permit');await table.put({...row,policy:{...row.policy,version:2}});security.close();expect(await s.gateway.createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});await s.pin.lock();expect(await s.gateway.createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('expiry dan clock fault menolak mutasi',async()=>{for(const kind of ['expiry','clock'] as const){const s=await setup();try{const before=await checkpoint(s.db);if(kind==='expiry'){s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');}else s.wall(s.now()+5000);expect(await s.gateway.createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}}});
it('input disalin sebelum antre; bentuk dan nilai tidak sah ditolak',async()=>{const s=await setup();try{
 let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),held=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await gate;});await ready;
 const data={...open},operation=op('open',1),identity={...s.identity},pending=s.gateway.createStockGroup(identity,data,operation);data.balance=22;operation.operationId='changed';identity.actorId='other';release();await held;expect(await pending).toEqual({status:'ok',groupId:'g',revision:0});
 const before=await checkpoint(s.db);for(const bad of [{...open,extra:true},{...open,balance:-1},{...open,balance:1.2},{...open,balance:Number.MAX_SAFE_INTEGER+1}])expect(await s.gateway.createStockGroup(s.identity,bad,op('bad',2))).toEqual({status:'denied'});
 for(const bad of [{...correction,reason:' '},{...correction,expectedBalance:1},{...correction,expectedRevision:1},{...correction,extra:1}])expect(await s.gateway.correctStockBaseline(s.identity,bad,op('bad',2))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('rollback gateway pada kegagalan %s',async table=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));const before=await checkpoint(s.db),hook=()=>{throw new Error('failed')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);
 expect(await s.gateway.correctStockBaseline(s.identity,correction,op('c',2))).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);expect(await s.gateway.correctStockBaseline(s.identity,correction,op('c',2))).toEqual({status:'ok',groupId:'g',revision:1});
 }finally{s.close();}});
it.each(['commit','replay'] as const)('penjaga gagal pada %s menggulung transaksi',async phase=>{const s=await setup();try{
 if(phase==='replay')await s.gateway.createStockGroup(s.identity,open,op('open',1));const before=await checkpoint(s.db);
 const original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>fn(async identity=>{const current=await read(identity);let count=0;return {...current,assertTime:()=>{if(++count===2)throw new Error('fault');return current.assertTime();}};}));
 expect(await s.gateway.createStockGroup(s.identity,open,op('open',1))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['pin','policy','actor'] as const)('perubahan %s saat antre menolak operasi',async change=>{const s=await setup();try{
 const before=await checkpoint(s.db);let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),read=s.permit.read.bind(s.permit);s.permit.read=async identity=>{const result=await read(identity);entered();await gate;return result;};
 const pending=s.gateway.createStockGroup(s.identity,open,op('open',1));await ready;if(change==='pin')await s.pin.lock();else {const policy={...s.policy,version:2,actors:change==='actor'?[{...s.policy.actors[0],active:false}]:s.policy.actors};const payload={...s.p,sequence:2,policyVersion:2,policyHash:await policyHash(policy)};await s.permit.install(await s.sign(payload),s.identity,policy);}release();expect(await pending).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['allow','approval','owner-only'] as const)('owner diizinkan pada semua mode %s',async mode=>{const s=await setup('owner',mode);try{
 expect((await s.gateway.createStockGroup(s.identity,open,op('open',1))).status).toBe('ok');expect((await s.gateway.correctStockBaseline(s.identity,correction,op('correct',2))).status).toBe('ok');expect((await s.gateway.setStockMinimum(s.identity,minimum,op('min',3))).status).toBe('ok');
 }finally{s.close();}});
it.each(['expiry','clock'] as const)('%s menolak ketiga mutasi dan replay tanpa perubahan checkpoint',async failure=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));const before=await checkpoint(s.db);if(failure==='expiry'){s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');}else s.wall(s.now()+5000);
 expect(await s.gateway.createStockGroup(s.identity,open,op('open',1))).toEqual({status:'denied'});expect(await s.gateway.createStockGroup(s.identity,{groupId:'new',balance:0},op('new',2))).toEqual({status:'denied'});expect(await s.gateway.correctStockBaseline(s.identity,correction,op('c',2))).toEqual({status:'denied'});expect(await s.gateway.setStockMinimum(s.identity,{...minimum,expectedRevision:0,expectedBalance:0},op('m',2))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('permit hilang atau kunci verifikasi salah menolak tanpa efek',async()=>{const s=await setup();try{
 const before=await checkpoint(s.db),pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),bad=new OfflinePermitStorage(s.db.name,{key:pair.publicKey},s.lock,s.now,()=>1000000);expect(await new AuthorizedStock(s.db,s.pin,bad,s.lock).createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});bad.close();
 const name=`missing-${crypto.randomUUID()}`,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,s.lock,s.now,()=>1000000),permit=new OfflinePermitStorage(name,{key:pair.publicKey},s.lock,s.now,()=>1000000);await pin.installVerifier(s.identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(s.identity,'123456');expect(await new AuthorizedStock(db,pin,permit,s.lock).createStockGroup(s.identity,open,op('x',1))).toEqual({status:'denied'});pin.close();permit.close();await db.delete();expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback minimum pada kegagalan %s',async table=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));const before=await checkpoint(s.db),hook=()=>{throw new Error('failed')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);expect(await s.gateway.setStockMinimum(s.identity,{...minimum,expectedRevision:0,expectedBalance:0},op('m',2))).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('pemetaan owner create-only, replay dan pembacaan tidak mengubah checkpoint',async()=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,{groupId:'g',balance:2},op('open',1));
 const mapping={skuId:'sku',groupId:'g'};
 expect(await s.gateway.registerSkuStockMapping(s.identity,mapping,op('map',2))).toEqual({status:'ok',groupId:'g',revision:0});
 const before=await checkpoint(s.db);
 expect(await s.gateway.registerSkuStockMapping(s.identity,mapping,op('map',2))).toEqual({status:'ok',groupId:'g',revision:0});
 expect(await s.gateway.registerSkuStockMapping(s.identity,{...mapping,groupId:'other'},op('map',2))).toEqual({status:'denied'});
 expect(await s.gateway.registerSkuStockMapping(s.identity,mapping,op('duplicate',3))).toEqual({status:'denied'});
 expect(await s.gateway.readSkuStockMapping(s.identity,{id:'sku'})).toMatchObject({status:'ok',value:{mapping:{skuId:'sku',groupId:'g'},revision:0}});
 expect(await s.gateway.readSkuStockMapping(s.identity,{id:'sku',extra:true} as {id:string})).toEqual({status:'denied'});
 expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['allow','approval','owner-only'] as const)('pemetaan tetap owner-only pada mode %s',async mode=>{const s=await setup('staff',mode);try{
 const before=await checkpoint(s.db);expect(await s.gateway.registerSkuStockMapping(s.identity,{skuId:'sku',groupId:'g'},op('map',1))).toEqual({status:'denied'});expect(await s.gateway.readSkuStockMapping(s.identity,{id:'sku'})).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback registrasi pemetaan pada %s',async table=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,{groupId:'g',balance:1},op('open',1));const before=await checkpoint(s.db),hook=()=>{throw new Error('failed')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);
 expect(await s.gateway.registerSkuStockMapping(s.identity,{skuId:'sku',groupId:'g'},op('map',2))).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['owner','staff'] as const)('%s mendapat rencana draft tanpa mutasi atau receipt',async role=>{const s=await setup(role);try{
 const {createStockGroup}=await import('./stock-groups'),{registerSkuStockMapping}=await import('./sku-stock-mappings'),{openCashSession}=await import('./cash-sessions'),{createDraft}=await import('./drafts');
 const metadata=(operationId:string,localSequence:number)=>({...op(operationId,localSequence),storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1});
 const orderId='00000000-0000-4000-8000-000000000001',sessionId='00000000-0000-4000-8000-000000000003',skuId='00000000-0000-4000-8000-000000000006';
 const draft={orderId,displayNumber:'261101-E1-0001',cashSessionId:sessionId,customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-11-01T00:00:00Z',items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005'],skuId,name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0};
 await openCashSession(s.db,{sessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...metadata('cash',1),deviceId:'cash-device'},s.lock);
 await createStockGroup(s.db,{groupId:'g',balance:2},metadata('open',1),s.lock);await registerSkuStockMapping(s.db,{skuId,groupId:'g'},metadata('map',2),s.lock);await createDraft(s.db,draft,{...metadata('draft',3),storeTimeZone:'Asia/Jakarta'},s.lock,()=>draft.savedAt);
 const before=await checkpoint(s.db),result=await s.gateway.planStoredDraftStock(s.identity,{id:orderId});expect(result).toMatchObject({status:'ok',value:{plan:{ok:true,debits:[{required:1,after:1}]},sources:{draftRevision:0,groups:[{balance:2,revision:0}]}}});expect(JSON.stringify(result)).not.toContain('receipt');expect(await checkpoint(s.db)).toEqual(before);
 s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');expect(await s.gateway.planStoredDraftStock(s.identity,{id:orderId})).toEqual({status:'denied'});if(role==='owner')expect((await s.gateway.readSkuStockMapping(s.identity,{id:skuId})).status).toBe('ok');expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('registrasi menyalin input sebelum antre dan menolak field tambahan',async()=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),held=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await gate;});await ready;
 const input={skuId:'sku',groupId:'g'},operation=op('map',2),identity={...s.identity},pending=s.gateway.registerSkuStockMapping(identity,input,operation);input.skuId='changed';operation.operationId='changed';identity.actorId='changed';release();await held;expect(await pending).toEqual({status:'ok',groupId:'g',revision:0});const before=await checkpoint(s.db);expect(await s.gateway.registerSkuStockMapping(s.identity,{skuId:'x',groupId:'g',extra:true} as {skuId:string;groupId:string},op('x',3))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['expiry','clock'] as const)('registrasi dan rencana menolak %s; baca owner hanya menerima expiry',async failure=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));await s.gateway.registerSkuStockMapping(s.identity,{skuId:'sku',groupId:'g'},op('map',2));const before=await checkpoint(s.db);if(failure==='expiry'){s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');}else s.wall(s.now()+5000);
 expect(await s.gateway.registerSkuStockMapping(s.identity,{skuId:'sku',groupId:'g'},op('map',2))).toEqual({status:'denied'});expect(await s.gateway.planStoredDraftStock(s.identity,{id:'missing'})).toEqual({status:'denied'});expect((await s.gateway.readSkuStockMapping(s.identity,{id:'sku'})).status).toBe(failure==='expiry'?'ok':'denied');expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['commit','replay'] as const)('penjaga pemetaan pada %s menggulung transaksi',async phase=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));const input={skuId:'sku',groupId:'g'};if(phase==='replay')await s.gateway.registerSkuStockMapping(s.identity,input,op('map',2));const before=await checkpoint(s.db);
 const original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>fn(async identity=>{const current=await read(identity);let count=0;return {...current,assertTime:()=>{if(++count===2)throw new Error('fault');return current.assertTime();}};}));expect(await s.gateway.registerSkuStockMapping(s.identity,input,op('map',2))).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['pin','policy','actor'] as const)('perubahan %s saat antre menolak registrasi pemetaan',async change=>{const s=await setup();try{
 await s.gateway.createStockGroup(s.identity,open,op('open',1));const before=await checkpoint(s.db);let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),read=s.permit.read.bind(s.permit);s.permit.read=async identity=>{const result=await read(identity);entered();await gate;return result;};
 const pending=s.gateway.registerSkuStockMapping(s.identity,{skuId:'sku',groupId:'g'},op('map',2));await ready;if(change==='pin')await s.pin.lock();else {const policy={...s.policy,version:2,actors:change==='actor'?[{...s.policy.actors[0],active:false}]:s.policy.actors};const payload={...s.p,sequence:2,policyVersion:2,policyHash:await policyHash(policy)};await s.permit.install(await s.sign(payload),s.identity,policy);}release();expect(await pending).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
