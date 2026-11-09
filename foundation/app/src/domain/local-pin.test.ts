import { describe,expect,it } from 'vitest';
import { comparePin,cooldownDuration,createPinVerifier,MAX_ITERATIONS,MIN_ITERATIONS,validPin,validateVerifier } from './local-pin';
describe('local PIN primitives',()=>{
 it('validates format and KDF limits',async()=>{
  expect(validPin('123456')).toBe(true); for(const pin of ['12345','1234567','１２３４５６','12 456']) expect(validPin(pin)).toBe(false);
  await expect(createPinVerifier('123456',MIN_ITERATIONS-1)).rejects.toThrow(); await expect(createPinVerifier('123456',MAX_ITERATIONS+1)).rejects.toThrow();
 });
 it('uses unique salt and verifies, rejecting corrupted parameters',async()=>{
  const a=await createPinVerifier('123456',MIN_ITERATIONS), b=await createPinVerifier('123456',MIN_ITERATIONS);
  expect(a.salt).not.toBe(b.salt); expect(await comparePin('123456',a)).toBe(true); expect(await comparePin('654321',a)).toBe(false);
  expect(()=>validateVerifier({...a,hash:'bad'})).toThrow(); expect(()=>validateVerifier({...a,salt:'bad'})).toThrow(); expect(()=>validateVerifier({...a,version:2})).toThrow(); expect(()=>validateVerifier({...a,iterations:1})).toThrow(); expect(()=>validateVerifier({...a,iterations:MAX_ITERATIONS})).not.toThrow(); expect(()=>validateVerifier({...a,iterations:MAX_ITERATIONS+1})).toThrow();
 });
 it('escalates each five failures and caps at fifteen minutes',()=>{
  expect([0,4,5,10,15,20,25,30,100].map(cooldownDuration)).toEqual([0,0,30000,60000,120000,240000,480000,900000,900000]);
 });
});
