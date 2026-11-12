import 'fake-indexeddb/auto';
import { expect,it } from 'vitest';
import { createPinVerifier, MIN_ITERATIONS } from '../domain/local-pin';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash, type PermissionMode } from '../domain/permission-policy';
import { BerrieDatabase } from './database';
import { LocalPinSecurity } from './local-pin';
import { OfflinePermitStorage } from './offline-permit';
import { AuthorizedServing } from './authorized-serving';
import { openCashSession } from './cash-sessions';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { createDraft, updateDraft } from './drafts';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { type LockProvider } from './commit';
function locks():LockProvider {
 const queues=new Map<string,Promise<unknown>>();
 return {request<T>(name:string,fn:()=>Promise<T>){const old=queues.get(name) ?? Promise.resolve(),next=old.then(fn,fn);queues.set(name,next.catch(()=>{}));return next;}};
}
async function setup(role:'owner'|'staff'='owner',mode:PermissionMode='allow',active=true,version:1|2=2) {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const name=`cash-auth-${crypto.randomUUID()}`,lock=locks(),identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
 let wall=Date.parse('2026-11-01T00:00:00Z'),mono=1000000;
 const now=()=>wall,clock=()=>mono,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,lock,now,clock),permit=new OfflinePermitStorage(name,{key:pair.publicKey},lock,now,clock),gateway=new AuthorizedServing(db,pin,permit,lock);
 const policy={version:1,storeId:'store',actors:[{id:'actor',role,active}],matrix:{...defaults,'stock-correction':mode,'stock-in':mode},discountLimit:{rupiah:null,basisPoints:null}};
 const p:PermitPayload={version,algorithm:'ES256',keyId:'key',...identity,role,scope:'cashier',sequence:1,verifiedAt:wall,entitlementEnd:wall+30*86400000,...(version===2?{policyVersion:1,policyHash:await policyHash(policy)}:{})};
 const sign=async(payload:PermitPayload)=>{const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));return {payload,signature:btoa(String.fromCharCode(...signature)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};};
 await pin.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(identity,'123456');await permit.install(await sign(p),identity,version===2?policy:undefined);
 return {db,pin,permit,gateway,identity,lock,policy,p,sign,now,advance:(n:number)=>{wall+=n;mono+=n},wall:(n:number)=>{wall=n},close:()=>{pin.close();permit.close();db.close();}};
}


const direct:LockProvider={request:async(_name,fn)=>fn()};
const at='2026-11-01T00:00:00Z';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:at,storeTimeZone:'Asia/Jakarta'});
const draft=()=>({orderId:id(1),displayNumber:'261101-E1-0001',cashSessionId:id(2),customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:at,items:[{id:id(3),unitIds:[id(4),id(5),id(6)],skuId:id(7),name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
const opening={sessionId:id(2),number:'1',initialCustodian:'actor',openingAmount:100,timeZone:'Asia/Jakarta'};
const cashMeta={...meta('cash',1),deviceId:'cash-device'};
const now=()=>at;
async function setupOrder(db:BerrieDatabase) {
 const d=draft();await openCashSession(db,opening,cashMeta,direct);await createStockGroup(db,{groupId:'g',balance:10},meta('stock',1),direct,now);await registerSkuStockMapping(db,{skuId:id(7),groupId:'g'},meta('map',2),direct,now);
 await createDraft(db,d,meta('draft',3),direct,now);d.customer='B';await updateDraft(db,d,meta('edit',4),0,direct,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);const input={orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups};
 await confirmFirstBatch(db,input,meta('batch',5),direct,now);return {d,input};
}

it.each(['owner','staff'] as const)('%s reads and partially serves once without stock or financial changes',async role=>{const s=await setup(role);try{
 await setupOrder(s.db);const before=await checkpoint(s.db),input={orderId:id(1),expectedRevision:null,unitIds:[id(4)]},op={operationId:'serve',localSequence:6,recordedAt:at};
 expect((await s.gateway.readServing(s.identity,{id:id(1)})).status).toBe('ok');expect((await s.gateway.readOrderOperationalStatus(s.identity,{id:id(1)})).status).toBe('ok');
 expect(await s.gateway.serveUnits(s.identity,input,op)).toEqual({status:'ok',value:{orderId:id(1),revision:0}});const after=await checkpoint(s.db);
 expect(after.ledger).toEqual(before.ledger);expect(after.state.filter(x=>!x.key.startsWith('serving:'))).toEqual(before.state);
 expect(await s.gateway.serveUnits(s.identity,input,op)).toEqual({status:'ok',value:{orderId:id(1),revision:0}});
 expect(await s.gateway.serveUnits(s.identity,{...input,unitIds:[id(5)]},op)).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(after);
 }finally{s.close();}});
it('denies bad identity and selections without mutations',async()=>{const s=await setup();try{await setupOrder(s.db);const before=await checkpoint(s.db),op={operationId:'serve',localSequence:6,recordedAt:at};
 for(const i of [{...s.identity,storeId:'other'},{...s.identity,deviceId:'other'},{...s.identity,epoch:2},{...s.identity,actorId:'other'}]) expect(await s.gateway.readServing(i,{id:id(1)})).toEqual({status:'denied'});
 for(const unitIds of [[],[id(4),id(4)],[id(99)]]) expect(await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds},op)).toEqual({status:'denied'});
 expect(await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:0,unitIds:[id(4)]},op)).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['owner','staff'] as const)('expired %s follows limited permissions',async role=>{const s=await setup(role);try{await setupOrder(s.db);s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');
 expect((await s.gateway.readServing(s.identity,{id:id(1)})).status).toBe(role==='owner'?'ok':'denied');
 expect((await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at})).status).toBe(role==='owner'?'ok':'denied');
 }finally{s.close();}});
it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback %s and retry',async table=>{const s=await setup();try{await setupOrder(s.db);const before=await checkpoint(s.db),hook=()=>{throw new Error('fault')};s.db[table].hook('creating',hook);s.db[table].hook('updating',hook);const run=()=>s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at});expect(await run()).toEqual({status:'denied'});s.db[table].hook('creating').unsubscribe(hook);s.db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(s.db)).toEqual(before);expect((await run()).status).toBe('ok');}finally{s.close();}});
it.each(['commit','replay'] as const)('guard failure on %s leaves checkpoint unchanged',async phase=>{const s=await setup();try{await setupOrder(s.db);const run=()=>s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at});if(phase==='replay')await run();const before=await checkpoint(s.db),original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>fn(async identity=>{const current=await read(identity);let count=0;return {...current,assertTime:()=>{if(++count===3)throw new Error('fault');return current.assertTime();}};}));expect(await run()).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it.each(['pin','policy','actor'] as const)('changed %s while queued is denied',async change=>{const s=await setup();try{await setupOrder(s.db);const before=await checkpoint(s.db);let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),read=s.permit.read.bind(s.permit);s.permit.read=async i=>{const result=await read(i);entered();await gate;return result;};const pending=s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at});await ready;if(change==='pin')await s.pin.lock();else {const policy={...s.policy,version:2,actors:change==='actor'?[{...s.policy.actors[0],active:false}]:s.policy.actors},payload={...s.p,sequence:2,policyVersion:2,policyHash:await policyHash(policy)};await s.permit.install(await s.sign(payload),s.identity,policy);}release();expect(await pending).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it('copies selection while queued and validates checkpoint staging',async()=>{const s=await setup(),stage=new BerrieDatabase(crypto.randomUUID());try{await setupOrder(s.db);let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),held=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await gate});await ready;const input={orderId:id(1),expectedRevision:null,unitIds:[id(4)]},op={operationId:'serve',localSequence:6,recordedAt:at},pending=s.gateway.serveUnits(s.identity,input,op);input.unitIds[0]=id(5);op.operationId='changed';release();await held;expect((await pending).status).toBe('ok');const read=await s.gateway.readServing(s.identity,{id:id(1)});expect(read).toMatchObject({status:'ok',value:{serving:{units:[{id:id(4),status:'served'},{id:id(5),status:'processed'},{id:id(6),status:'processed'}]}}});const snap=await checkpoint(s.db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);}finally{s.close();await stage.delete();}});
it('clock fault and missing policy deny all operations',async()=>{for(const version of [1,2] as const){const s=await setup('owner','allow',true,version);try{await setupOrder(s.db);const before=await checkpoint(s.db);if(version===2)s.wall(s.now()+5000);expect(await s.gateway.readServing(s.identity,{id:id(1)})).toEqual({status:'denied'});expect(await s.gateway.readOrderOperationalStatus(s.identity,{id:id(1)})).toEqual({status:'denied'});expect(await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at})).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}}});
it('owner expired rejects a mixed old and new selection atomically',async()=>{const s=await setup();try{
 const d=draft();d.items[0].unitIds=[id(4)];await openCashSession(s.db,opening,cashMeta,direct);await createStockGroup(s.db,{groupId:'g',balance:10},meta('stock',1),direct,now);await registerSkuStockMapping(s.db,{skuId:id(7),groupId:'g'},meta('map',2),direct,now);await createDraft(s.db,d,meta('draft',3),direct,now);
 d.items[0].unitIds.push(id(5));const later='2026-11-09T00:00:00Z';await updateDraft(s.db,d,meta('edit',4),0,direct,()=>later);const {sources}=await planStoredDraftStock(s.db,'store',d.orderId);await confirmFirstBatch(s.db,{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups},meta('batch',5),direct,()=>later);
 s.advance(8*86400000);await s.pin.unlock(s.identity,'123456');const before=await checkpoint(s.db),operation={operationId:'serve',localSequence:6,recordedAt:at};expect(await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4),id(5)]},operation)).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);expect((await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},operation)).status).toBe('ok');
 }finally{s.close();}});
it('inactive actor and wrong database are denied without disclosing data',async()=>{const s=await setup('owner','allow',false);try{await setupOrder(s.db);expect(await s.gateway.readServing(s.identity,{id:id(1)})).toEqual({status:'denied'});const other=new BerrieDatabase(`${s.db.name}-other`);try{expect(await new AuthorizedServing(other,s.pin,s.permit,s.lock).readServing(s.identity,{id:id(1)})).toEqual({status:'denied'});}finally{await other.delete();}}finally{s.close();}});
it('expiry at transaction guard denies staff without mutation',async()=>{const s=await setup('staff');try{await setupOrder(s.db);const before=await checkpoint(s.db),original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>fn(async identity=>{const current=await read(identity);let count=0;return {...current,assertTime:()=>++count===3?Date.parse(at)+7*86400000:current.assertTime()};}));expect(await s.gateway.serveUnits(s.identity,{orderId:id(1),expectedRevision:null,unitIds:[id(4)]},{operationId:'serve',localSequence:6,recordedAt:at})).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it('lunas tetap memiliki pekerjaan dan replay ditolak setelah sesi ditutup',async()=>{const s=await setup();try{await setupOrder(s.db);const {payConfirmedFirstBatchCash}=await import('./confirmed-cash-payment'),{changeCashCount}=await import('./cash-count');await payConfirmedFirstBatchCash(s.db,{orderId:id(1),expectedBatchRevision:0,expectedSessionRevision:0,received:30000},meta('pay',6),direct);const status=await s.gateway.readOrderOperationalStatus(s.identity,{id:id(1)});expect(status).toMatchObject({status:'ok',value:{status:{settlement:'paid',classification:'active',counts:{processed:3,served:0}}}});const before=await checkpoint(s.db),input={orderId:id(1),expectedRevision:null,unitIds:[id(4),id(5),id(6)]},op={operationId:'serve',localSequence:7,recordedAt:at};expect((await s.gateway.serveUnits(s.identity,input,op)).status).toBe('ok');expect((await checkpoint(s.db)).ledger).toEqual(before.ledger);await changeCashCount(s.db,'save',{sessionId:id(2),expectedSessionRevision:1,expectedCountRevision:null,amount:30100},meta('count',8),direct);await changeCashCount(s.db,'close',{sessionId:id(2),expectedSessionRevision:2,expectedCountRevision:0},meta('close',9),direct);const closed=await checkpoint(s.db);expect(await s.gateway.serveUnits(s.identity,input,op)).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(closed);}finally{s.close();}});
