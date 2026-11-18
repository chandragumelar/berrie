import { describe, expect, it } from 'vitest';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash } from '../domain/permission-policy';
import { importPermitKeys, parseAccessGrant } from './contracts';

const ownerId='11111111-1111-4111-8111-111111111111', deviceId='22222222-2222-4222-8222-222222222222', storeId='33333333-3333-4333-8333-333333333333', grantId='44444444-4444-4444-8444-444444444444';
const base64url=(bytes:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function fixture() {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey), privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
 const policy={version:1,storeId,actors:[{id:ownerId,role:'owner',active:true}],matrix:defaults,discountLimit:{rupiah:null,basisPoints:null}};
 const start=Date.parse('2026-01-01T00:00:00.000Z'), end=start+60*86400000;
 const payload:PermitPayload={version:2,algorithm:'ES256',keyId:'test',storeId,deviceId,epoch:1,actorId:ownerId,role:'owner',scope:'cashier',sequence:1,verifiedAt:start,entitlementEnd:end,policyVersion:1,policyHash:await policyHash(policy)};
 const signature=base64url(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));
 return {jwk,privateJwk,grant:{status:'ok',grantId,store:{id:storeId,name:'Toko',timeZone:'Asia/Jakarta',trialStartedAt:new Date(start).toISOString(),entitlementEnd:new Date(end).toISOString()},identity:{storeId,deviceId,epoch:1,actorId:ownerId},permit:{payload,signature},policy}};
}
describe('access grant boundary',()=>{
 it('accepts a signed owner grant pinned to the expected device',async()=>{
  const {grant,jwk}=await fixture(), keys=await importPermitKeys(JSON.stringify({test:jwk}));
  expect(await parseAccessGrant(grant,{ownerId,deviceId},keys)).toEqual(grant);
 });
 it('rejects private configuration and unknown keys',async()=>{
  const {grant,privateJwk}=await fixture();
  await expect(importPermitKeys(JSON.stringify({test:privateJwk}))).rejects.toThrow();
  await expect(parseAccessGrant(grant,{ownerId,deviceId},{})).rejects.toThrow();
 });
 it('rejects tampering, mismatched identity and unexpected fields',async()=>{
  const {grant,jwk}=await fixture(), keys=await importPermitKeys(JSON.stringify({test:jwk}));
  for(const bad of [ {...grant,extra:true}, {...grant,identity:{...grant.identity,deviceId:ownerId}}, {...grant,policy:{...grant.policy,version:2}}, {...grant,permit:{...grant.permit,signature:'A'.repeat(86)}}, {...grant,store:{...grant.store,entitlementEnd:'2026-02-01T00:00:00.000Z'}} ]) await expect(parseAccessGrant(bad,{ownerId,deviceId},keys)).rejects.toThrow();
 });
});
