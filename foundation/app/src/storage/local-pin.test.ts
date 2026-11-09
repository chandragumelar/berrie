import 'fake-indexeddb/auto';
import { describe,expect,it } from 'vitest';
import { createPinVerifier,MIN_ITERATIONS } from '../domain/local-pin';
import { LocalPinSecurity } from './local-pin';
import { PinActivity } from './local-pin-activity';
import type { LockProvider } from './commit';
const identity={storeId:'s',deviceId:'d',epoch:1,actorId:'a'};
function serial():LockProvider { let queue:Promise<unknown>=Promise.resolve(); return {request<T>(_name:string,fn:()=>Promise<T>){const next=queue.then(fn,fn); queue=next.catch(()=>{}); return next;}}; }
async function setup() { let time=1_000_000, mono=1_000_000; const name=`security-${crypto.randomUUID()}`,locks=serial(),now=()=>time; const a=new LocalPinSecurity(name,locks,now,()=>mono),b=new LocalPinSecurity(name,locks,now,()=>mono); await a.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS)); return {a,b,name,advance:(n:number)=>{time+=n;mono+=n},set:(n:number)=>{time=n},now}; }
describe('persistent local security',()=>{
 it('persists failures and cooldown over reopening, rejects boundary before expiry and resets on success',async()=>{
  const {a,b,advance}=await setup(); for(let i=0;i<5;i++) expect(await a.unlock(identity,'000000')).toBe('incorrect'); a.close();
  expect(await b.unlock(identity,'123456')).toBe('cooldown'); advance(29999); expect(await b.unlock(identity,'123456')).toBe('cooldown'); advance(1); expect(await b.unlock(identity,'123456')).toBe('unlocked');
  for(let i=0;i<4;i++) expect(await b.unlock(identity,'000000')).toBe('incorrect'); expect(await b.unlock(identity,'123456')).toBe('unlocked'); b.close();
 });
 it('counts simultaneous attempts and prevents sessions crossing identities or tabs',async()=>{
  const {a,b,advance}=await setup(); expect(await Promise.all([a.unlock(identity,'000000'),b.unlock(identity,'000000')])).toEqual(['incorrect','incorrect']);
  for(let i=0;i<3;i++) expect(await a.unlock(identity,'000000')).toBe('incorrect'); expect(await b.unlock(identity,'123456')).toBe('cooldown'); advance(30000);
  expect(await a.unlock(identity,'123456')).toBe('unlocked'); expect(await a.check(true)).toBe(true); expect(await b.check(true)).toBe(false);
  await b.lock(); expect(await a.check(true)).toBe(false); await expect(a.unlock({...identity,actorId:'other'},'123456')).rejects.toThrow(); a.close(); b.close();
 });
 it('escalates each group of failures through the cap and resets after success',async()=>{
  const {a,advance}=await setup(); const durations=[30_000,60_000,120_000,240_000,480_000,900_000,900_000];
  for(const duration of durations) { for(let i=0;i<5;i++) expect(await a.unlock(identity,'000000')).toBe('incorrect'); advance(duration-1); expect(await a.unlock(identity,'123456')).toBe('cooldown'); advance(1); }
  expect(await a.unlock(identity,'123456')).toBe('unlocked'); for(let i=0;i<5;i++) expect(await a.unlock(identity,'000000')).toBe('incorrect'); advance(30_000); expect(await a.unlock(identity,'123456')).toBe('unlocked'); a.close();
 });
 it('rejects verifier reuse for another identity',async()=>{const {a}=await setup(); const verifier=await createPinVerifier('123456',MIN_ITERATIONS); await a.installVerifier(identity,verifier); await expect(a.installVerifier({...identity,actorId:'other'},verifier)).rejects.toThrow('unik'); a.close();});
 it('locks at inactivity boundary and on background, ignoring hidden activity',async()=>{
  const {a,advance,now}=await setup(); const adapter=new PinActivity(a,now); expect(await a.unlock(identity,'123456')).toBe('unlocked'); advance(299999); await adapter.activity(true); advance(299999); expect(await a.check(true)).toBe(true); advance(1); expect(await a.check(true)).toBe(false);
  expect(await a.unlock(identity,'123456')).toBe('unlocked'); await adapter.visibility(false); advance(300001); await adapter.activity(false); await adapter.visibility(true); expect(await a.check(true)).toBe(false); a.close();
 });
 it('holds unlock when the clock goes backwards',async()=>{const {a,advance}=await setup(); expect(await a.unlock(identity,'123456')).toBe('unlocked'); advance(-1); expect(await a.check(true)).toBe(false); expect(await a.unlock(identity,'123456')).toBe('online-required'); a.close();});
 it('requires online verification when the wall clock jumps forward',async()=>{const {a,set}=await setup(); for(let i=0;i<5;i++) expect(await a.unlock(identity,'000000')).toBe('incorrect'); set(10_000_000); expect(await a.unlock(identity,'123456')).toBe('online-required'); a.close();});
 it('waits a full monotonic cooldown after reopening when elapsed time cannot be proven',async()=>{const {a,b,advance}=await setup();for(let i=0;i<5;i++) await a.unlock(identity,'000000');a.close();advance(120_000);expect(await b.unlock(identity,'123456')).toBe('cooldown');advance(29_999);expect(await b.unlock(identity,'123456')).toBe('cooldown');advance(1);expect(await b.unlock(identity,'123456')).toBe('unlocked');b.close();});
 it('cannot shorten cooldown by changing the wall clock while closed',async()=>{const {a,b,set,advance}=await setup();for(let i=0;i<5;i++) await a.unlock(identity,'000000');a.close();set(50_000_000);expect(await b.unlock(identity,'123456')).toBe('cooldown');advance(30_000);expect(await b.unlock(identity,'123456')).toBe('unlocked');b.close();});
 it('fails closed when the security transaction fails',async()=>{const {a}=await setup(); const original=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(){throw new Error('write failure')}; try { await expect(a.unlock(identity,'123456')).rejects.toThrow(); expect(await a.check(true)).toBe(false); } finally { IDBObjectStore.prototype.put=original; a.close(); }});
});
