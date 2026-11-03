import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft, readDraft, updateDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { canonical, type LockProvider } from './commit';
import { openCashSession } from './cash-sessions';

const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase) {
 const d=draft();await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:1},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}
it('konfirmasi menyimpan batch, debit dan job sekali; menolak edit dan replay berbeda',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
  const {d,input}=await setup(db),m=meta('confirm',4);const result=await confirmFirstBatch(db,input,m,locks);expect(result).toEqual({orderId:d.orderId,batchNumber:1});
  const snap=await checkpoint(db);expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:0,baseline:1,minimum:5}});expect(snap.ledger).toHaveLength(3);expect(snap.state.filter(r=>r.key.startsWith('kitchen-job:'))).toHaveLength(1);
  expect(await confirmFirstBatch(db,input,m,locks)).toEqual(result);await expect(confirmFirstBatch(db,{...input,expectedDraftRevision:1},m,locks)).rejects.toThrow('Konflik');await expect(confirmFirstBatch(db,input,meta('again',5),locks)).rejects.toThrow();await expect(updateDraft(db,d,meta('edit',5),0,locks,now)).rejects.toThrow();await expect(planStoredDraftStock(db,'store',d.orderId)).rejects.toThrow();await expect(readDraft(db,d.orderId)).rejects.toThrow();expect(await checkpoint(db)).toEqual(snap);
  await stageSnapshot(stage,JSON.parse(JSON.stringify(snap)));expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}
});
it('menolak sumber hilang, toko berbeda, revisi dan saldo basi tanpa efek',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {const {input}=await setup(db),before=await checkpoint(db);
  for(const invalid of [{...input,expectedDraftRevision:1},{...input,mappings:[{...input.mappings[0],groupId:'missing'}]},{...input,groups:[{...input.groups[0],balance:0}]},{...input,groups:[]},{...input,orderId:'missing'}]) await expect(confirmFirstBatch(db,invalid,meta('confirm',4),locks)).rejects.toThrow();
  await expect(confirmFirstBatch(db,input,{...meta('other',1),storeId:'other'},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}
});
it('intent disalin sebelum menunggu lock',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {const {input}=await setup(db),m=meta('confirm',4);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);const blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};const pending=confirmFirstBatch(db,input,m,blocked);await ready;input.groups[0].balance=999;m.actorId='other';release();await pending;const snap=await checkpoint(db);expect(snap.audit.find(a=>a.id==='batch-audit:confirm')?.value).toMatchObject({actorId:'actor'});expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:0}});}finally{await db.delete();}
});
it.each(['batch','job','debit'] as const)('staging menolak histori %s yang dimanipulasi dan mempertahankan sumber',async field=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {const {input}=await setup(db);await confirmFirstBatch(db,input,meta('confirm',4),locks);const snap=await checkpoint(db),bad=structuredClone(snap),receipt=bad.receipts.find(r=>r.id==='confirm')!,change=JSON.parse(receipt.payload);
  if(field==='debit') {change.ledger[0].value.required=2;bad.ledger.find(r=>r.id===change.ledger[0].id)!.value=change.ledger[0].value;}
  else {const row=change.state.find((s:{key:string})=>s.key.startsWith(field==='batch'?'first-batch:':'kitchen-job:'));row.value.batch.draft.items[0].name='Changed';bad.state.find(r=>r.key===row.key)!.value=row.value;}
  receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}
});
it('staging menolak unit batch yang diubah serentak di batch, job dan audit',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {const {input}=await setup(db);await confirmFirstBatch(db,input,meta('confirm',4),locks);const snap=await checkpoint(db),bad=structuredClone(snap),receipt=bad.receipts.find(r=>r.id==='confirm')!,change=JSON.parse(receipt.payload);
  for(const row of change.state.filter((s:{key:string})=>s.key.startsWith('first-batch:')||s.key.startsWith('kitchen-job:'))) {row.value.batch.draft.items[0].unitIds[0]='00000000-0000-4000-8000-000000000099';bad.state.find(r=>r.key===row.key)!.value=row.value;}
  change.audit[0].value.batch.draft.items[0].unitIds[0]='00000000-0000-4000-8000-000000000099';bad.audit.find(r=>r.id===change.audit[0].id)!.value=change.audit[0].value;receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}
});
it.each(['draft','mapping','group'] as const)('menolak %s yang hilang tanpa menambah efek',async missing=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {const {d,input}=await setup(db);const key=missing==='draft'?`draft:${d.orderId}`:missing==='mapping'?`sku-stock-mapping:${JSON.stringify(['store',d.items[0].skuId])}`:'stock-group:g';await db.state.delete(key);const before=await checkpoint(db);await expect(confirmFirstBatch(db,input,meta('confirm',4),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);}finally{await db.delete();}
});
it('dua operasi draft sama dan dua draft berebut stok hanya menghasilkan satu debit',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {
  const {d,input}=await setup(db);const d2=structuredClone(d);d2.orderId='00000000-0000-4000-8000-000000000011';d2.items[0].id='00000000-0000-4000-8000-000000000014';d2.items[0].unitIds=['00000000-0000-4000-8000-000000000015'];await createDraft(db,d2,meta('draft2',4),locks,now);
  const sources=(await planStoredDraftStock(db,'store',d2.orderId)).sources,input2={orderId:d2.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups};
  let queue:Promise<unknown>=Promise.resolve();const serial:LockProvider={request:(_n,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}};
  const results=await Promise.allSettled([confirmFirstBatch(db,input,meta('a',5),serial),confirmFirstBatch(db,input,meta('b',5),serial),confirmFirstBatch(db,input2,meta('c',5),serial)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const snap=await checkpoint(db);expect(snap.ledger).toHaveLength(3);expect(snap.state.filter(r=>r.key.startsWith('first-batch:'))).toHaveLength(1);expect(snap.state.filter(r=>r.key.startsWith('kitchen-job:'))).toHaveLength(1);expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:0}});
 }finally{await db.delete();}
});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('abort %s memulihkan seluruh koleksi dan retry sekali',async table=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {const {input}=await setup(db),before=await checkpoint(db),hook=()=>{throw new Error('injected')};db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>confirmFirstBatch(db,input,meta('confirm',4),locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await run();const after=await checkpoint(db);await run();expect(await checkpoint(db)).toEqual(after);}finally{await db.delete();}
});
