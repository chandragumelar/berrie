import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AccessApi, AccessApiError } from './access-api';
const ownerId='11111111-1111-4111-8111-111111111111';
const client={auth:{getSession:async()=>({data:{session:{access_token:'test-access-token'}},error:null})}} as unknown as SupabaseClient;
afterEach(()=>vi.unstubAllGlobals());
describe('access API',()=>{
 it('sends the device credential only in the header and parses bootstrap',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'ok',ownerId,emailVerified:true,store:null,activation:'none'}),{status:200}));
  vi.stubGlobal('fetch',fetcher);
  const api=new AccessApi(client,'http://localhost:54321','public-key',{});
  expect(await api.bootstrap(null,'device-secret')).toMatchObject({ownerId,activation:'none'});
  const [url,options]=fetcher.mock.calls[0] as [string,RequestInit];
  expect(url).toBe('http://localhost:54321/functions/v1/berrie-access/bootstrap');
  expect(options.body).toBe('{"deviceId":null}');
  expect(options.headers).toMatchObject({'X-Berrie-Device-Token':'device-secret'});
 });
 it('distinguishes a network failure from a server authorization rejection',async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(new Response(JSON.stringify({status:'error',code:'forbidden'}),{status:403}));
  vi.stubGlobal('fetch',fetcher);
  const api=new AccessApi(client,'http://localhost:54321','public-key',{});
  await expect(api.bootstrap(null)).rejects.toMatchObject({code:'network_error',status:0});
  await expect(api.bootstrap(null)).rejects.toMatchObject({code:'forbidden',status:403});
 });
 it('rejects malformed bootstrap data',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'ok',ownerId,emailVerified:true,store:null,activation:'this-device'}))));
  await expect(new AccessApi(client,'http://localhost:54321','public-key',{}).bootstrap(null)).rejects.toThrow();
  expect(new AccessApiError('forbidden',403).code).toBe('forbidden');
 });
});
