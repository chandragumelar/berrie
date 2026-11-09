import { describe,expect,it } from 'vitest';
import { permitBytes,permitExpiry,verifyPermit,type PermitPayload } from './offline-permit';

describe('offline permit signature',()=>{
 it('verifies a signed payload and rejects modified fields, key and identity',async()=>{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const payload:PermitPayload={version:1,algorithm:'ES256',keyId:'test',storeId:'store',deviceId:'device',epoch:1,actorId:'actor',role:'owner',scope:'cashier',sequence:1,verifiedAt:1000,entitlementEnd:2000};
  const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));
  const signature=btoa(String.fromCharCode(...sig)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const signed={payload,signature}, identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
  expect(await verifyPermit(signed,{test:pair.publicKey},identity)).toEqual(signed);
  for(const bad of [{...signed,payload:{...payload,sequence:2}},{...signed,payload:{...payload,version:2}},{...signed,payload:{...payload,algorithm:'bad'}},{...signed,signature:'A'.repeat(86)},{...signed,payload:{...payload,extra:true}},null]) await expect(verifyPermit(bad,{test:pair.publicKey},identity)).rejects.toThrow();
  await expect(verifyPermit(signed,{},identity)).rejects.toThrow();
  await expect(verifyPermit(signed,{test:pair.publicKey},{...identity,deviceId:'other'})).rejects.toThrow();
  expect(permitExpiry(payload)).toBe(1000+604800000);
  expect(permitExpiry({...payload,verifiedAt:3000})).toBe(2000+604800000);
 });
});
