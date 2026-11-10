import {describe,it,expect} from 'vitest';
import {defaults,discountWithinLimit,parsePolicy,policyBytes} from './permission-policy';

describe('policy contract',()=>{
 it('enforces both integer limits using half-up rounding',()=>{
  const limits={rupiah:100,basisPoints:1000};
  expect(discountWithinLimit(1000,100,limits)).toBe(true);
  expect(discountWithinLimit(1000,101,limits)).toBe(false);
  expect(discountWithinLimit(999,100,limits)).toBe(true);
  expect(discountWithinLimit(994,100,limits)).toBe(false);
  expect(discountWithinLimit(2000,101,limits)).toBe(false);
 });
 it('requires a complete matrix, unique actors and a limit for allowed discounts',()=>{
  const policy={version:1,storeId:'store',actors:[{id:'a',role:'staff',active:true}],matrix:{...defaults},discountLimit:{rupiah:null,basisPoints:null}};
  expect(parsePolicy(policy).matrix).toEqual(defaults);
  expect(()=>parsePolicy({...policy,actors:[...policy.actors,...policy.actors]})).toThrow();
  expect(()=>parsePolicy({...policy,matrix:{...defaults,discount:'allow'}})).toThrow();
  expect(policyBytes(policy)).toEqual(policyBytes({...policy,actors:[...policy.actors]}));
 });
});
