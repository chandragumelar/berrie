import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { EnrollmentStore, type AccessIntent } from './enrollment-store';

const owner='11111111-1111-4111-8111-111111111111';
describe('access enrollment persistence',()=>{
 it('reuses device credentials and pending operation across reloads and competing instances',async()=>{
  const name=`test-access-${crypto.randomUUID()}`, a=new EnrollmentStore(name), b=new EnrollmentStore(name);
  const [first,second]=await Promise.all([a.getOrCreate(owner),b.getOrCreate(owner)]);
  expect(first).toEqual(second);
  expect(first.bindingSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const intent:AccessIntent={action:'activate',operationId:crypto.randomUUID(),deviceId:first.deviceId,storeName:'Toko',timeZone:'Asia/Jakarta'};
  expect(await a.begin(owner,intent)).toEqual(intent);
  await expect(b.begin(owner,{...intent,operationId:crypto.randomUUID()})).rejects.toThrow();
  a.close(); b.close();
  const reloaded=new EnrollmentStore(name);
  expect((await reloaded.get(owner))?.pending).toEqual(intent);
  expect(await reloaded.begin(owner,intent)).toEqual(intent);
  reloaded.close();
 });
 it('retains signed-out and blocked state and refuses unverified operation changes',async()=>{
  const store=new EnrollmentStore(`test-access-${crypto.randomUUID()}`), enrollment=await store.getOrCreate(owner);
  await store.setAccessState(owner,{explicitSignedOut:true,blockedReason:'forbidden'});
  expect(await store.get(owner)).toMatchObject({explicitSignedOut:true,blockedReason:'forbidden'});
  await expect(store.begin(owner,{action:'refresh',operationId:crypto.randomUUID(),deviceId:crypto.randomUUID(),storeId:crypto.randomUUID()})).rejects.toThrow();
  expect((await store.get(owner))?.deviceId).toBe(enrollment.deviceId);
  store.close();
 });
});
