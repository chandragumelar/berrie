import 'fake-indexeddb/auto';
import { describe,expect,it } from 'vitest';
import { permitBytes,type PermitPayload } from '../domain/offline-permit';
import { createPinVerifier,MIN_ITERATIONS } from '../domain/local-pin';
import { BerrieDatabase } from './database';
import { checkpoint,stageSnapshot } from './recovery';
import { LocalPinSecurity } from './local-pin';
import { OfflinePermitStorage } from './offline-permit';
import { evaluatePermit,type Capability } from './permit-capability';
import { openCashSession } from './cash-sessions';
import { createDraft,readDraft,updateDraft } from './drafts';
import type { LockProvider } from './commit';

function serial():LockProvider { let queue:Promise<unknown>=Promise.resolve(); return {request<T>(_name:string,fn:()=>Promise<T>){const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;}}; }
async function setup(role:'owner'|'staff'='owner') {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const name=`permit-${crypto.randomUUID()}`,locks=serial(),identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
 let wall=Date.parse('2026-11-01T00:00:00Z'),mono=1_000_000;
 const now=()=>wall,clock=()=>mono,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,locks,now,clock),permit=new OfflinePermitStorage(name,{key:pair.publicKey},locks,now,clock);
 const payload:PermitPayload={version:1,algorithm:'ES256',keyId:'key',...identity,role,scope:'cashier',sequence:1,verifiedAt:wall,entitlementEnd:wall+30*86400000};
 async function sign(p:PermitPayload) { const bytes=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(p))); return {payload:p,signature:btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}; }
 await pin.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS)); await pin.unlock(identity,'123456'); await permit.install(await sign(payload),identity);
 return {name,locks,identity,db,pin,permit,payload,sign,publicKey:pair.publicKey,now,clock,advance:(n:number)=>{wall+=n;mono+=n},setWall:(n:number)=>{wall=n}};
}
describe('offline permit storage and decision',()=>{
 it('persists and rejects stale or racing responses, including after reload',async()=>{
  const s=await setup();const old=await s.sign(s.payload);const next=await s.sign({...s.payload,sequence:2,verifiedAt:s.now()+1});s.advance(1);
  const other=new OfflinePermitStorage(s.name,{key:(await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify'])).publicKey},s.locks,s.now,s.clock);
  await expect(other.read(s.identity)).rejects.toThrow();other.close();
  const results=await Promise.allSettled([s.permit.install(next,s.identity),s.permit.install(old,s.identity)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  await expect(s.permit.install(old,s.identity)).rejects.toThrow();expect((await s.permit.read(s.identity)).permit.payload.sequence).toBe(2);
  s.permit.close();s.pin.close();s.db.close();
 });
 it('shows warnings and expiry exactly and gates owner capabilities on a live PIN session',async()=>{
  const s=await setup();const evaluate=(c:Capability)=>evaluatePermit(s.permit,s.pin,s.identity,s.db,c);
  expect((await evaluate('new-order')).allowed).toBe(true);
  s.advance(5*86400000);await s.pin.unlock(s.identity,'123456');expect((await evaluate('new-order')).warning).toBe('48h');
  s.advance(86400000);await s.pin.unlock(s.identity,'123456');expect((await evaluate('new-order')).warning).toBe('24h');
  s.advance(86400000);await s.pin.unlock(s.identity,'123456');
  for(const c of ['new-order','new-addition','catalog','stock-general','complete-unit','stock-for-unit'] as Capability[]) expect((await evaluate(c)).allowed).toBe(false);
  for(const c of ['cash-support','read','export','backup','restore'] as Capability[]) expect((await evaluate(c)).allowed).toBe(true);
  expect((await evaluate('read')).status).toBe('limited');await s.pin.lock();expect((await evaluate('read')).allowed).toBe(false);
  s.permit.close();s.pin.close();s.db.close();
 });
 it('detects a wall-clock inconsistency and persists it across reload',async()=>{
  const s=await setup();await s.permit.read(s.identity);s.setWall(s.now()+5000);
  expect((await s.permit.read(s.identity)).clockFault).toBe(true);s.permit.close();
  // A new reader cannot clear the persisted fault.
  const reopened=new OfflinePermitStorage(s.name,{key:s.publicKey},s.locks,s.now,s.clock);
  expect((await reopened.read(s.identity)).clockFault).toBe(true);reopened.close();s.pin.close();s.db.close();
 });
 it('does not put credentials into checkpoint or activate staging',async()=>{
  const s=await setup();const snap=await checkpoint(s.db),stage=new BerrieDatabase(`${s.name}-stage`);await stageSnapshot(stage,snap);
  expect(JSON.stringify(snap)).not.toContain('signature');
  await expect(evaluatePermit(s.permit,s.pin,s.identity,stage,'read')).rejects.toThrow();
  stage.close();s.permit.close();s.pin.close();s.db.close();
 });
 it('recognizes only units in stored records before expiry, without changing business data',async()=>{
  const s=await setup();const orderId='00000000-0000-4000-8000-000000000001',sessionId='00000000-0000-4000-8000-000000000003',unitId='00000000-0000-4000-8000-000000000005';
  const metadata={operationId:'cash',storeId:'store',deviceId:'device',deviceEpoch:1,localSequence:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z'};
  await openCashSession(s.db,{sessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},metadata,s.locks);
  const draft={orderId,displayNumber:'261101-E1-0001',cashSessionId:sessionId,customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:metadata.recordedAt,items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:[unitId],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0};
  await createDraft(s.db,draft,{...metadata,operationId:'draft',localSequence:2,storeTimeZone:'Asia/Jakarta'},s.locks,()=>metadata.recordedAt);
  s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');
  const updated=(await readDraft(s.db,orderId))!.draft;updated.items[0].unitIds.push('00000000-0000-4000-8000-000000000009');
  await updateDraft(s.db,updated,{...metadata,operationId:'update',localSequence:3,storeTimeZone:'Asia/Jakarta'},0,s.locks,()=>new Date(s.now()).toISOString());
  const later={...draft,orderId:'00000000-0000-4000-8000-000000000002',items:[{...draft.items[0],id:'00000000-0000-4000-8000-000000000007',unitIds:['00000000-0000-4000-8000-000000000008']}]};
  await createDraft(s.db,later,{...metadata,operationId:'later',localSequence:4,storeTimeZone:'Asia/Jakarta'},s.locks,()=>new Date(s.now()).toISOString());
  const before=await checkpoint(s.db);
  expect((await evaluatePermit(s.permit,s.pin,s.identity,s.db,'complete-unit',{orderId,unitId})).allowed).toBe(true);
  expect((await evaluatePermit(s.permit,s.pin,s.identity,s.db,'complete-unit',{orderId,unitId:'wrong'})).allowed).toBe(false);
  expect((await evaluatePermit(s.permit,s.pin,s.identity,s.db,'complete-unit',{orderId,unitId:'00000000-0000-4000-8000-000000000009'})).allowed).toBe(false);
  expect((await evaluatePermit(s.permit,s.pin,s.identity,s.db,'complete-unit',{orderId:later.orderId,unitId:later.items[0].unitIds[0]})).allowed).toBe(false);
  expect(await checkpoint(s.db)).toEqual(before);
  s.permit.close();s.pin.close();s.db.close();
 });
 it('denies staff in limited mode and rejects a different device',async()=>{
  const s=await setup('staff');s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');
  expect((await evaluatePermit(s.permit,s.pin,s.identity,s.db,'read')).allowed).toBe(false);
  await expect(s.permit.read({...s.identity,deviceId:'other'})).rejects.toThrow();
  s.permit.close();s.pin.close();s.db.close();
 });
 it('rechecks expiry after waiting for the PIN session',async()=>{
  const s=await setup();s.advance(7*86400000-1);await s.pin.unlock(s.identity,'123456');
  const check=s.pin.checkIdentity.bind(s.pin);s.pin.checkIdentity=async identity=>{const valid=await check(identity);s.advance(1);return valid;};
  const result=await evaluatePermit(s.permit,s.pin,s.identity,s.db,'new-order');
  expect(result.status).toBe('limited');expect(result.allowed).toBe(false);expect(result.remainingMs).toBe(0);
  s.permit.close();s.pin.close();s.db.close();
 });
 it('fails closed when the anchor cannot be written and preserves the previous permit',async()=>{
  const s=await setup();const replacement=await s.sign({...s.payload,sequence:2});
  const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new Error('write failure')};
  try {await expect(s.permit.install(replacement,s.identity)).rejects.toThrow();await expect(s.permit.read(s.identity)).rejects.toThrow();}
  finally {IDBObjectStore.prototype.put=original;}
  expect((await s.permit.read(s.identity)).permit.payload.sequence).toBe(1);
  const broken=new OfflinePermitStorage(s.name,{key:s.publicKey},null as unknown as LockProvider,s.now,s.clock);
  // Explicitly missing Web Locks fails closed rather than executing without exclusion.
  await expect(broken.read(s.identity)).rejects.toThrow();
  broken.close();s.permit.close();s.pin.close();s.db.close();
 });
});

describe('policy permit v2',()=>{
 it('binds a canonical policy, blocks downgrade, mismatch, replay and preserves the old pair',async()=>{
  const {defaults,policyHash}=await import('../domain/permission-policy');
  const s=await setup('staff');
  const policy={version:1,storeId:'store',actors:[{id:'actor',role:'staff' as const,active:true}],matrix:{...defaults},discountLimit:{rupiah:null,basisPoints:null}};
  const payload:PermitPayload={...s.payload,version:2,sequence:2,policyVersion:1,policyHash:await policyHash(policy)};
  const signed=await s.sign(payload);
  await expect(s.permit.install(signed,s.identity,{...policy,storeId:'other'})).rejects.toThrow();
  await s.permit.install(signed,s.identity,policy);
  await expect(s.permit.install(signed,s.identity,policy)).rejects.toThrow();
  await expect(s.permit.install(await s.sign({...s.payload,sequence:3}),s.identity)).rejects.toThrow();
  await expect(s.permit.install(await s.sign({...payload,sequence:3,policyHash:'0'.repeat(64)}),s.identity,policy)).rejects.toThrow();
  expect((await s.permit.read(s.identity)).policy).toEqual(policy);
  s.permit.close();s.pin.close();s.db.close();
 });
 it('evaluates every configurable mode for staff and owner and keeps free settlement separate',async()=>{
  const {defaults,policyHash,configurableActivities}=await import('../domain/permission-policy');
  const {evaluateActivity}=await import('./activity-permission');
  for(const role of ['owner','staff'] as const) {
   const s=await setup(role);let seq=1;
   for(const mode of ['allow','approval','owner-only'] as const) {
    const matrix={...defaults};for(const activity of configurableActivities) matrix[activity]=mode;
    const policy={version:++seq,storeId:'store',actors:[{id:'actor',role,active:true}],matrix,discountLimit:{rupiah:100,basisPoints:1000}};
    await s.permit.install(await s.sign({...s.payload,version:2,sequence:seq,policyVersion:seq,policyHash:await policyHash(policy)}),s.identity,policy);
    for(const activity of configurableActivities) {
     const result=await evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity,deviceScope:'cashier',discount:{subtotal:1000,amount:100,revision:1}});
     expect(result.result,`${role}/${mode}/${activity}`).toBe(role==='owner'?'allow':mode==='allow'?'allow':mode==='approval'?'approval-required':'deny');
    }
   }
   expect((await evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity:'unknown',deviceScope:'cashier'})).result).toBe('deny');
   expect((await evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity:'sale',deviceScope:'phone'})).result).toBe('deny');
   s.permit.close();s.pin.close();s.db.close();
  }
 });
});

it('re-evaluates discount inputs, denies inactive staff and does not turn approval into execution',async()=>{
 const {defaults,policyHash}=await import('../domain/permission-policy');const {evaluateActivity}=await import('./activity-permission');const s=await setup('staff');
 const policy={version:1,storeId:'store',actors:[{id:'actor',role:'staff' as const,active:true}],matrix:{...defaults,discount:'allow' as const},discountLimit:{rupiah:100,basisPoints:1000}};
 const payload:PermitPayload={...s.payload,version:2,sequence:2,policyVersion:1,policyHash:await policyHash(policy)};
 await s.permit.install(await s.sign(payload),s.identity,policy);const before=await checkpoint(s.db);
 const evalDiscount=(subtotal:number,amount:number,revision:number)=>evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity:'discount',deviceScope:'cashier',discount:{subtotal,amount,revision}});
 expect((await evalDiscount(1000,100,1)).result).toBe('allow');expect((await evalDiscount(1000,101,2)).result).toBe('approval-required');expect((await evalDiscount(900,100,3)).result).toBe('approval-required');expect((await evalDiscount(1000,100,0)).result).toBe('deny');
 expect((await evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity:'free-settlement',deviceScope:'cashier'})).result).toBe('approval-required');
 expect((await evaluateActivity(s.permit,s.pin,s.identity,s.db,{activity:'settings',deviceScope:'cashier'})).result).toBe('deny');expect(await checkpoint(s.db)).toEqual(before);
 const inactive={...policy,version:2,actors:[{...policy.actors[0],active:false}]};
 await s.permit.install(await s.sign({...payload,sequence:3,policyVersion:2,policyHash:await policyHash(inactive)}),s.identity,inactive);
 expect((await evalDiscount(1000,100,4)).result).toBe('deny');s.permit.close();s.pin.close();s.db.close();
});

it('retains the v2 pair after failed writes and rejects corrupted storage',async()=>{
 const {defaults,policyHash}=await import('../domain/permission-policy');const s=await setup();
 const policy={version:1,storeId:'store',actors:[{id:'actor',role:'owner' as const,active:true}],matrix:{...defaults},discountLimit:{rupiah:null,basisPoints:null}};
 const p:PermitPayload={...s.payload,version:2,sequence:2,policyVersion:1,policyHash:await policyHash(policy)};await s.permit.install(await s.sign(p),s.identity,policy);
 const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new Error('write failure')};
 try {await expect(s.permit.install(await s.sign({...p,sequence:3}),s.identity,policy)).rejects.toThrow();} finally {IDBObjectStore.prototype.put=original;}
 expect((await s.permit.read(s.identity)).permit.payload.sequence).toBe(2);
 const Dexie=(await import('dexie')).default;const raw=new Dexie(`${s.name}-offline-permit-security`);raw.version(1).stores({permits:'&key'});const row=await raw.table('permits').get('permit');row.policy.actors[0].active=false;await raw.table('permits').put(row);
 await expect(s.permit.read(s.identity)).rejects.toThrow();await expect(s.permit.install(await s.sign({...p,sequence:3}),s.identity,policy)).rejects.toThrow();
 raw.close();s.permit.close();s.pin.close();s.db.close();
});
