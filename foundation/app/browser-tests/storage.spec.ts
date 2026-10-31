import { test, expect } from '@playwright/test';
test('IndexedDB: dua tab, retry setelah reload, rollback dan staging gagal',async({browser})=>{
 const context=await browser.newContext();const a=await context.newPage(),b=await context.newPage();await Promise.all([a.goto('/'),b.goto('/')]);const name=`berrie-test-${Date.now()}`;
 const run=async(page:typeof a,op:string)=>page.evaluate(async({name,op})=>{
  const {BerrieDatabase}=await import('/src/storage/database.ts');const {commitChange}=await import('/src/storage/commit.ts');const db=new BerrieDatabase(name);
  const change={operationId:op,storeId:'s',deviceId:'d',deviceEpoch:1,localSequence:1,kind:'test',targetId:'stock',actorId:'a',policyVersion:1,payload:{quantity:1},state:[{key:'stock',expectedRevision:null,value:9}],ledger:[{id:'l-'+op,operationId:op,value:-1}],audit:[{id:'a-'+op,operationId:op,value:'test'}],outbox:{id:'o-'+op,operationId:op,value:'test'},result:'ok'};
  try{return await commitChange(db,change)}catch(e){return String(e)}finally{db.close()}
 },{name,op});
 const results=await Promise.all([run(a,'one'),run(b,'two')]);expect(results.filter(x=>x==='ok')).toHaveLength(1);expect(results.some(x=>x.includes('Revisi berubah'))).toBeTruthy();
 const winner=results[0]==='ok'?'one':'two';await a.reload();expect(await run(a,winner)).toBe('ok');
 const evidence=await a.evaluate(async(name)=>{const {BerrieDatabase}=await import('/src/storage/database.ts');const {commitChange}=await import('/src/storage/commit.ts');const {checkpoint,stageSnapshot}=await import('/src/storage/recovery.ts');const db=new BerrieDatabase(name),stage=new BerrieDatabase(name+'-stage');const snap=await checkpoint(db);let rollback=false;try{await commitChange(db,{operationId:'failure',storeId:'s',deviceId:'d',deviceEpoch:1,localSequence:2,kind:'test',targetId:'stock',actorId:'a',policyVersion:1,payload:{},state:[{key:'stock',expectedRevision:0,value:0}],ledger:[{id:snap.ledger[0].id,operationId:'failure',value:-1}],audit:[{id:'failure-a',operationId:'failure',value:'x'}],outbox:{id:'failure-o',operationId:'failure',value:'x'},result:'ok'})}catch{rollback=true}let failed=false;try{await stageSnapshot(stage,{...snap,ledger:[...snap.ledger,...snap.ledger]})}catch{failed=true}const counts=[await db.state.count(),await db.ledger.count(),await db.audit.count(),await db.outbox.count(),await db.receipts.count(),await stage.state.count()];const stock=(await checkpoint(db)).state[0]?.value;await db.delete();await stage.delete();return {failed,rollback,counts,stock};},name);
 expect(evidence).toEqual({failed:true,rollback:true,counts:[1,1,1,1,1,0],stock:9});await context.close();
});
test('migrasi IndexedDB yang gagal membatalkan upgrade dan mempertahankan data lama',async({page})=>{
 await page.goto('/'); const result=await page.evaluate(async()=>{const {default:Dexie}=await import('/node_modules/.vite/deps/dexie.js');const name=`migration-${Date.now()}`;const v1=new Dexie(name);v1.version(1).stores({ledger:'&id'});await v1.table('ledger').add({id:'entry',amount:100});v1.close();const v2=new Dexie(name);v2.version(1).stores({ledger:'&id'});v2.version(2).stores({ledger:'&id',newTable:'&id'}).upgrade(async tx=>{await tx.table('ledger').put({id:'entry',amount:0});throw new Error('simulasi migrasi gagal')});let failed=false;try{await v2.open()}catch{failed=true}v2.close();const old=new Dexie(name);old.version(1).stores({ledger:'&id'});const entry=await old.table('ledger').get('entry');const version=old.verno;await old.delete();return {failed,entry,version}});expect(result).toEqual({failed:true,entry:{id:'entry',amount:100},version:1});
});
test('checkpoint JSON disimpan di staging dan bertahan setelah database dibuka kembali',async({page})=>{
 await page.goto('/');const evidence=await page.evaluate(async()=>{
  const {BerrieDatabase}=await import('/src/storage/database.ts');const {commitChange}=await import('/src/storage/commit.ts');const {checkpoint,stageSnapshot}=await import('/src/storage/recovery.ts');
  const name=`recovery-browser-${crypto.randomUUID()}`,source=new BerrieDatabase(name),stage=new BerrieDatabase(name+'-stage'),bad=new BerrieDatabase(name+'-bad');
  try {
   await commitChange(source,{operationId:'op',storeId:'s',deviceId:'d',deviceEpoch:1,localSequence:1,kind:'test',targetId:'stock',actorId:'a',policyVersion:1,payload:{qty:1},state:[{key:'stock',expectedRevision:null,value:9}],ledger:[{id:'l',operationId:'op',value:-1}],audit:[{id:'a',operationId:'op',value:'test'}],outbox:{id:'o',operationId:'op',value:'test'},result:'ok'});
   const original=await checkpoint(source),input=JSON.parse(JSON.stringify(original));await stageSnapshot(stage,input);stage.close();const reopened=new BerrieDatabase(name+'-stage');const restored=await checkpoint(reopened);reopened.close();
   let rejected=false;try{await stageSnapshot(bad,{...input,audit:[null]})}catch{rejected=true}
   const empty=await checkpoint(bad),sourceAfter=await checkpoint(source);return {original,restored,empty,sourceAfter,rejected};
  } finally {await source.delete();await stage.delete();await bad.delete();}
 });
 expect(evidence.restored).toEqual(evidence.original);expect(evidence.sourceAfter).toEqual(evidence.original);expect(evidence.rejected).toBe(true);expect(evidence.empty).toEqual({schema:1,state:[],ledger:[],audit:[],outbox:[],receipts:[],sequences:[]});
});
test('mutasi input saat menunggu Web Lock tidak mengubah commit',async({page})=>{
 await page.goto('/');const evidence=await page.evaluate(async()=>{
  const {BerrieDatabase}=await import('/src/storage/database.ts');const {commitChange}=await import('/src/storage/commit.ts');const {checkpoint,stageSnapshot}=await import('/src/storage/recovery.ts');const {validateCheckpoint}=await import('/src/storage/validate-checkpoint.ts');
  const name=`lock-input-${crypto.randomUUID()}`,db=new BerrieDatabase(name),stage=new BerrieDatabase(name+'-stage');
  let release!:()=>void,acquired!:()=>void;const gate=new Promise<void>(r=>{release=r}),ready=new Promise<void>(r=>{acquired=r});
  const holder=navigator.locks.request(`berrie-writer:${name}`,async()=>{acquired();await gate});await ready;
  const input={operationId:'op',storeId:'s',deviceId:'d',deviceEpoch:1,localSequence:1,kind:'test',targetId:'stock',actorId:'a',policyVersion:1,payload:{nested:{qty:1}},state:[{key:'stock',expectedRevision:null,value:{qty:9}}],ledger:[{id:'l',operationId:'op',value:{qty:-1}}],audit:[{id:'a',operationId:'op',value:{action:'before'}}],outbox:{id:'o',operationId:'op',value:{action:'before'}},result:{nested:{ok:true}}};const original=structuredClone(input);
  try {
   const pending=commitChange(db,input);input.operationId='changed';input.payload.nested.qty=2;input.state[0].value.qty=0;input.ledger[0].value.qty=0;input.audit[0].value.action='after';input.outbox.value.action='after';input.result.nested.ok=false;release();await holder;
   const result=await pending,snapshot=await checkpoint(db);validateCheckpoint(snapshot);await stageSnapshot(stage,snapshot);const staged=await checkpoint(stage);const replay=await commitChange(db,original);let conflict=false;try{await commitChange(db,{...original,payload:{nested:{qty:3}}})}catch{conflict=true}return {result,snapshot,staged,replay,conflict,after:await checkpoint(db),original};
  } finally {release();await db.delete();await stage.delete()}
 });
 expect(evidence.result).toEqual(evidence.original.result);expect(evidence.snapshot.state[0].value).toEqual(evidence.original.state[0].value);expect(evidence.snapshot.ledger).toEqual(evidence.original.ledger);expect(evidence.snapshot.audit).toEqual(evidence.original.audit);expect(evidence.snapshot.outbox).toEqual([evidence.original.outbox]);expect(evidence.snapshot.receipts[0].id).toBe('op');expect(evidence.staged).toEqual(evidence.snapshot);expect(evidence.replay).toEqual(evidence.original.result);expect(evidence.conflict).toBe(true);expect(evidence.after).toEqual(evidence.snapshot);
});
