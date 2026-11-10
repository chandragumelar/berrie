import { expect,test } from '@playwright/test';

test('signed permits serialize competing tabs and survive reload without entering checkpoints',async({browser})=>{
 const context=await browser.newContext(),a=await context.newPage(),b=await context.newPage();await Promise.all([a.goto('/'),b.goto('/')]);
 const data=await a.evaluate(async()=>{
  const {permitBytes}=await import('/src/domain/offline-permit.ts');
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const now=Date.now(),payload={version:1 as const,algorithm:'ES256' as const,keyId:'key',storeId:'s',deviceId:'d',epoch:1,actorId:'a',role:'owner' as const,scope:'cashier' as const,sequence:1,verifiedAt:now,entitlementEnd:now+86400000};
  const sign=async(p:typeof payload)=>{const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(p)));return {payload:p,signature:btoa(String.fromCharCode(...sig)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}};
  return {jwk:await crypto.subtle.exportKey('jwk',pair.publicKey),first:await sign(payload),second:await sign({...payload,sequence:2}),third:await sign({...payload,sequence:3})};
 });
 const name=`permit-${crypto.randomUUID()}`,identity={storeId:'s',deviceId:'d',epoch:1,actorId:'a'};
 for(const page of [a,b]) await page.evaluate(async({name,jwk})=>{const {OfflinePermitStorage}=await import('/src/storage/offline-permit.ts');const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);(window as unknown as {permit:InstanceType<typeof OfflinePermitStorage>}).permit=new OfflinePermitStorage(name,{key});},{name,jwk:data.jwk});
 await a.evaluate(async({value,id})=>{const {permit}=window as unknown as {permit:import('/src/storage/offline-permit.ts').OfflinePermitStorage};await permit.install(value,id)},{value:data.first,id:identity});
 const install=(page:typeof a,value:typeof data.second)=>page.evaluate(async({value,id})=>{try{await (window as unknown as {permit:import('/src/storage/offline-permit.ts').OfflinePermitStorage}).permit.install(value,id);return true}catch{return false}},{value,id:identity});
 const results=await Promise.all([install(a,data.second),install(b,data.third)]);expect(results[1]).toBe(true);
 expect(await a.evaluate(async(id)=>(await (window as unknown as {permit:import('/src/storage/offline-permit.ts').OfflinePermitStorage}).permit.read(id)).permit.payload.sequence,identity)).toBe(3);
 await a.reload();const after=await a.evaluate(async({name,jwk,id})=>{const {OfflinePermitStorage}=await import('/src/storage/offline-permit.ts');const {BerrieDatabase}=await import('/src/storage/database.ts');const {checkpoint}=await import('/src/storage/recovery.ts');const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const permit=new OfflinePermitStorage(name,{key}),db=new BerrieDatabase(name);const sequence=(await permit.read(id)).permit.payload.sequence,snapshot=await checkpoint(db);permit.close();await db.delete();return {sequence,snapshot};},{name,jwk:data.jwk,id:identity});
 expect(after.sequence).toBe(3);expect(JSON.stringify(after.snapshot)).not.toContain('signature');await context.close();
});

test('policy pairs survive reload and competing tabs without entering checkpoint or staging',async({browser})=>{
 const context=await browser.newContext(),a=await context.newPage(),b=await context.newPage();await Promise.all([a.goto('/'),b.goto('/')]);
 const data=await a.evaluate(async()=>{
  const {permitBytes}=await import('/src/domain/offline-permit.ts');const {defaults,policyHash}=await import('/src/domain/permission-policy.ts');
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const now=Date.now();
  const policy={version:1,storeId:'s',actors:[{id:'a',role:'owner' as const,active:true}],matrix:defaults,discountLimit:{rupiah:null,basisPoints:null}};
  const p={version:2 as const,algorithm:'ES256' as const,keyId:'key',storeId:'s',deviceId:'d',epoch:1,actorId:'a',role:'owner' as const,scope:'cashier' as const,sequence:1,verifiedAt:now,entitlementEnd:now+86400000,policyVersion:1,policyHash:await policyHash(policy)};
  const sign=async(sequence:number)=>{const payload={...p,sequence};const bytes=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));return {payload,signature:btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}};
  return {jwk:await crypto.subtle.exportKey('jwk',pair.publicKey),policy,first:await sign(1),second:await sign(2),third:await sign(3)};
 });
 const name=`policy-${crypto.randomUUID()}`,id={storeId:'s',deviceId:'d',epoch:1,actorId:'a'};
 for(const page of [a,b]) await page.evaluate(async({name,jwk})=>{const {OfflinePermitStorage}=await import('/src/storage/offline-permit.ts');const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);(window as unknown as {permit:InstanceType<typeof OfflinePermitStorage>}).permit=new OfflinePermitStorage(name,{key});},{name,jwk:data.jwk});
 const install=(page:typeof a,value:typeof data.first)=>page.evaluate(async({value,id,policy})=>{try{await (window as unknown as {permit:import('/src/storage/offline-permit.ts').OfflinePermitStorage}).permit.install(value,id,policy);return true}catch{return false}},{value,id,policy:data.policy});
 expect(await install(a,data.first)).toBe(true);await Promise.all([install(a,data.second),install(b,data.third)]);
 await a.reload();const result=await a.evaluate(async({name,jwk,id})=>{const {OfflinePermitStorage}=await import('/src/storage/offline-permit.ts');const {BerrieDatabase}=await import('/src/storage/database.ts');const {checkpoint,stageSnapshot}=await import('/src/storage/recovery.ts');const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const permit=new OfflinePermitStorage(name,{key}),db=new BerrieDatabase(name),stage=new BerrieDatabase(`${name}-stage`);const pair=await permit.read(id),snapshot=await checkpoint(db);await stageSnapshot(stage,snapshot);const staged=await checkpoint(stage);permit.close();db.close();stage.close();return {sequence:pair.permit.payload.sequence,policy:pair.policy,snapshot,staged};},{name,jwk:data.jwk,id});
 expect(result.sequence).toBe(3);expect(result.policy).toEqual(data.policy);expect(JSON.stringify([result.snapshot,result.staged])).not.toContain('policyHash');expect(JSON.stringify([result.snapshot,result.staged])).not.toContain('signature');await context.close();
});
