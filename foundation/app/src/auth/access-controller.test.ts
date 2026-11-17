import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash } from '../domain/permission-policy';
import { OfflinePermitStorage } from '../storage/offline-permit';
import { LocalPinSecurity } from '../storage/local-pin';
import { AccessController } from './access-controller';
import { EnrollmentStore, type AccessIntent } from './enrollment-store';
import { AccessApiError, type AccessApi } from './access-api';
import type { AccessGrant } from './contracts';
const owner='11111111-1111-4111-8111-111111111111';
const b64=(bytes:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
async function setup(){
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:()=>Promise<unknown>)=>fn()}});
 const store=crypto.randomUUID();
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const client={auth:{getSession:async()=>({data:{session:{user:{id:owner}}}})}} as unknown as SupabaseClient;
 const enrollmentName=`controller-${crypto.randomUUID()}`,enrollments=new EnrollmentStore(enrollmentName);let cached:AccessGrant|undefined;
 const grant=vi.fn(async(intent:AccessIntent):Promise<AccessGrant>=>{
  if(cached) return cached;
  const start=Date.now()-5000,end=start+60*86400000,policy={version:1,storeId:store,actors:[{id:owner,role:'owner' as const,active:true}],matrix:defaults,discountLimit:{rupiah:null,basisPoints:null}};
  const payload:PermitPayload={version:2,algorithm:'ES256',keyId:'key',storeId:store,deviceId:intent.deviceId,epoch:1,actorId:owner,role:'owner',scope:'cashier',sequence:1,verifiedAt:Date.now()-1000,entitlementEnd:end,policyVersion:1,policyHash:await policyHash(policy)};
  cached={status:'ok',grantId:crypto.randomUUID(),store:{id:store,name:'Toko',timeZone:'Asia/Jakarta',trialStartedAt:new Date(start).toISOString(),entitlementEnd:new Date(end).toISOString()},identity:{storeId:store,deviceId:intent.deviceId,epoch:1,actorId:owner},permit:{payload,signature:b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)))},policy};return cached;
 });
 const api={bootstrap:vi.fn(async()=>({status:'ok',ownerId:owner,emailVerified:true,store:null,activation:'none'})),grant} as unknown as AccessApi;
 const controller=new AccessController(client,api,{key:pair.publicKey},enrollments,()=>{});
 await controller.start();return {controller,enrollments,grant,api,store,client,pair,enrollmentName};
}
describe('controller enrollment failures',()=>{
 it('does not unlock just because an Auth session exists',async()=>{const {controller}=await setup();expect(controller.state.screen).toBe('store-setup');expect(controller.state.grant).toBeNull();controller.dispose();});
 it('retains the same intent after a grant storage failure',async()=>{
  const {controller,enrollments,grant}=await setup(),save=vi.spyOn(enrollments,'saveGrant').mockRejectedValueOnce(new Error('write failed'));
  await controller.activate('Toko','Asia/Jakarta');expect(controller.state.screen).toBe('activating');expect(controller.state.grant).toBeNull();
  const first=grant.mock.calls[0]![0];expect((await enrollments.get(owner))?.pending).toEqual(first);
  await controller.activate('Toko','Asia/Jakarta');expect(grant.mock.calls[1]![0]).toEqual(first);expect(save).toHaveBeenCalledTimes(2);expect(controller.state.screen).toBe('pin-setup');controller.dispose();
 });
 it('does not report completion when permit storage fails and resumes the same grant',async()=>{
  const {controller,enrollments,grant}=await setup(),install=vi.spyOn(OfflinePermitStorage.prototype,'install').mockRejectedValueOnce(new Error('write failed'));
  await controller.activate('Toko','Asia/Jakarta');expect(controller.state.screen).toBe('activating');expect((await enrollments.get(owner))?.stage).toBe('grant-received');
  const first=grant.mock.calls[0]![0];await controller.activate('Toko','Asia/Jakarta');expect(grant).toHaveBeenCalledTimes(1);expect((await enrollments.get(owner))?.pending).toEqual(first);expect(install).toHaveBeenCalledTimes(2);expect(controller.state.error).toBeNull();expect(controller.state.screen).toBe('pin-setup');controller.dispose();
 });
 it('keeps enrollment incomplete if PIN storage fails',async()=>{
  const {controller,enrollments}=await setup();await controller.activate('Toko','Asia/Jakarta');
  vi.spyOn(LocalPinSecurity.prototype,'installVerifier').mockRejectedValueOnce(new Error('write failed'));
  await controller.setupPin('483027','483027');
  expect(controller.state.screen).toBe('pin-setup');expect((await enrollments.get(owner))?.stage).toBe('grant-received');controller.dispose();
 });

 it('persists an explicit device rejection instead of falling back offline',async()=>{
  const {controller,enrollments,grant}=await setup();grant.mockRejectedValueOnce(new AccessApiError('forbidden',403));
  await controller.activate('Toko','Asia/Jakarta');expect(controller.state.screen).toBe('blocked');expect((await enrollments.get(owner))?.blockedReason).toBe('forbidden');controller.dispose();
 });

 it('requests a new refresh only after an expired grant and device verification',async()=>{
  const {controller,enrollments,grant,api,store}=await setup();grant.mockRejectedValueOnce(new AccessApiError('grant_expired',409));
  await controller.activate('Toko','Asia/Jakarta');expect(controller.state.canRenew).toBe(true);const old=(await enrollments.get(owner))!.pending!;
  vi.mocked(api.bootstrap).mockResolvedValueOnce({status:'ok',ownerId:owner,emailVerified:true,activation:'this-device',store:{id:store,name:'Toko',timeZone:'Asia/Jakarta',trialStartedAt:new Date(Date.now()-1000).toISOString(),entitlementEnd:new Date(Date.now()-1000+60*86400000).toISOString()}});
  await controller.renewExpired();const next=grant.mock.calls[1]![0];expect(next.action).toBe('refresh');expect(next.operationId).not.toBe(old.operationId);expect(controller.state.screen).toBe('pin-setup');controller.dispose();
 });

 it('resumes a persisted grant after reload without a new API request',async()=>{
  const {controller,grant,api,client,pair,enrollmentName}=await setup();
  vi.spyOn(OfflinePermitStorage.prototype,'install').mockRejectedValueOnce(new Error('write failed')).mockRejectedValueOnce(new Error('write failed after reload'));
  await controller.activate('Toko','Asia/Jakarta');expect(controller.state.screen).toBe('activating');controller.dispose();
  const reloaded=new AccessController(client,api,{key:pair.publicKey},new EnrollmentStore(enrollmentName),()=>{});await reloaded.start();
  expect(reloaded.state.screen).toBe('activating');await reloaded.activate('Toko','Asia/Jakarta');
  expect(reloaded.state.screen).toBe('pin-setup');expect(grant).toHaveBeenCalledTimes(1);reloaded.dispose();
 });

 it('persists an explicit bootstrap rejection for an existing enrollment',async()=>{
  const {controller,enrollments,api}=await setup();
  vi.mocked(api.bootstrap).mockRejectedValueOnce(new AccessApiError('forbidden',403));await controller.onlineBootstrap();
  expect(controller.state.screen).toBe('blocked');expect((await enrollments.get(owner))?.blockedReason).toBe('forbidden');controller.dispose();
 });

});
