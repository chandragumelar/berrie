import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch, payDraftNoncash } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { type LockProvider } from './commit';
import { openCashSession, readCashBalance } from './cash-sessions';
import { setPaymentMethods } from './payment-methods';
import { payConfirmedFirstBatchNoncash } from './noncash-payment';
const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}


it.each(['draft','confirmed'] as const)('%s: tiga metode menyimpan settlement tanpa kas',async path=>{
 for(const method of ['qris','transfer','ewallet'] as const) {const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
  const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:true,ewallet:true},meta('methods',4),locks);
  if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);
  const details={method,verified:true as const,note:null,expectedMethodsRevision:0,expectedSessionRevision:0};
  const m=meta('pay',path==='draft'?5:6);
  const run=()=>path==='draft'?payDraftNoncash(db,{...input,...details},m,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},m,locks);
  const result=await run() as {payment:{amount:number;method:string}};expect(result.payment).toMatchObject({amount:27500,method});expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(0);
  const snapshot=await checkpoint(db);expect(snapshot.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:0}});await stageSnapshot(stage,snapshot);
  await setPaymentMethods(db,{expectedRevision:0,qris:false,transfer:false,ewallet:false},meta('disable',path==='draft'?6:7),locks);
  db.close();await db.open();expect(await run()).toEqual(result);
 }finally{await db.delete();await stage.delete();}}
});

it.each(['draft','confirmed'] as const)('%s: validasi input dan rollback tanpa efek',async path=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {
  const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);
  if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);
  const base={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0},m=meta('pay',path==='draft'?5:6),before=await checkpoint(db);
  const run=(details:typeof base)=>path==='draft'?payDraftNoncash(db,{...input,...details},m,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},m,locks);
  for(const bad of [{...base,verified:false},{...base,method:'transfer'},{...base,method:'cash'},{...base,expectedMethodsRevision:1},{...base,expectedSessionRevision:1},{...base,note:1}]) await expect(Promise.resolve().then(()=>run(bad as typeof base))).rejects.toThrow();
  expect(await checkpoint(db)).toEqual(before);await run(base);
  await expect(run({...base,method:'transfer'} as unknown as typeof base)).rejects.toThrow('Konflik');
 }finally{await db.delete();}
});

it.each(['draft','confirmed'] as const)('%s: rollback setiap koleksi tertulis',async path=>{
 for(const table of path==='draft'?['sequences','state','ledger','audit','outbox','receipts'] as const:['sequences','state','audit','outbox','receipts'] as const){const db=new BerrieDatabase(crypto.randomUUID());try {
  const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);
  if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);
  const before=await checkpoint(db),hook=()=>{throw new Error('injected')},details={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0},m=meta('pay',path==='draft'?5:6);
  db[table].hook('creating',hook);db[table].hook('updating',hook);
  const run=()=>path==='draft'?payDraftNoncash(db,{...input,...details},m,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},m,locks);
  await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await run();
 }finally{await db.delete();}}
});

it.each(['draft','confirmed'] as const)('%s: snapshot 33.350, alokasi dan penyajian terpisah',async path=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const d=draft(),first=d.items[0];first.unitIds=[first.unitIds[0]];first.skuPrice=10000;const second=structuredClone(first);second.id='00000000-0000-4000-8000-000000000008';second.unitIds=['00000000-0000-4000-8000-000000000009'];second.skuPrice=20000;d.items.push(second);d.taxBp=1000;d.serviceBp=500;d.discount={kind:'amount',value:1000} as typeof d.discount;
 const {input}=await setup(db,d);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);
 const details={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0},m=meta('pay',path==='draft'?5:6);
 const result=await (path==='draft'?payDraftNoncash(db,{...input,...details},m,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},m,locks)) as {settlement:{totals:{total:number;allocations:{total:number}[]}}};
 expect(result.settlement.totals.total).toBe(33350);expect(result.settlement.totals.allocations.map(a=>a.total)).toEqual([11117,22233]);const snap=await checkpoint(db),change=JSON.parse(snap.receipts.find(r=>r.id==='pay')!.payload);expect(snap.state.some(r=>r.key.startsWith('serving:'))).toBe(false);expect(snap.ledger.filter(r=>r.id.startsWith('batch-debit:'))).toHaveLength(1);expect(snap.ledger.filter(r=>r.id.startsWith('payment-ledger:'))).toHaveLength(0);if(path==='draft')expect(change.state.findIndex((r:{key:string})=>r.key.startsWith('kitchen-job:'))).toBeLessThan(change.state.findIndex((r:{key:string})=>r.key.startsWith('customer-job:')));else expect(change.state.some((r:{key:string})=>r.key.startsWith('kitchen-job:'))).toBe(false);
 }finally{await db.delete();}});

it.each(['draft','confirmed'] as const)('%s: checkpoint dan staging menolak histori non-tunai rusak',async path=>{for(const field of ['verified','config','session','job','money','audit'] as const){const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);const details={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0},m=meta('pay',path==='draft'?5:6);if(path==='draft')await payDraftNoncash(db,{...input,...details},m,locks,now);else await payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},m,locks);
 const source=await checkpoint(db),bad=structuredClone(source),receipt=bad.receipts.find(r=>r.id==='pay')!,change=JSON.parse(receipt.payload);
 if(field==='verified')change.payload.data.verified=false;if(field==='config')change.payload.methodsSource.revision=99;if(field==='session')change.payload.sessionSource.revision=99;
 if(field==='job'){const row=change.state.find((r:{key:string})=>r.key.startsWith('customer-job:'));row.value.payment.amount++;bad.state.find(r=>r.key===row.key)!.value=row.value;}
 if(field==='money'){const event={id:'injected',operationId:'pay',value:{kind:'sale',amount:1}};change.ledger.push(event);bad.ledger.push(event);}
 if(field==='audit'){change.audit.at(-1).value.payment.amount++;bad.audit.find(r=>r.id===change.audit.at(-1).id)!.value=change.audit.at(-1).value;}
 const {canonical}=await import('./commit');receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(source);
 }finally{await db.delete();await stage.delete();}}});

it.each(['draft','confirmed'] as const)('%s: salin input sebelum lock',async path=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);const details={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0,note:'asal'},data=path==='draft'?{...input,...details}:{orderId:d.orderId,expectedBatchRevision:0,...details},m=meta('pay',path==='draft'?5:6);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};const pending=path==='draft'?payDraftNoncash(db,data as typeof input & typeof details,m,blocked,now):payConfirmedFirstBatchNoncash(db,data as {orderId:string;expectedBatchRevision:number} & typeof details,m,blocked);await ready;data.note='berubah';m.actorId='lain';release();const result=await pending as {payment:{note:string}};expect(result.payment.note).toBe('asal');}finally{await db.delete();}});

it.each(['draft','confirmed'] as const)('%s: total nol dan lintas toko ditolak',async path=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();d.items[0].skuPrice=0;const {input}=await setup(db,d);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);const details={method:'qris' as const,verified:true as const,expectedMethodsRevision:0,expectedSessionRevision:0},m=meta('pay',path==='draft'?5:6),before=await checkpoint(db),run=(metadata:typeof m)=>path==='draft'?payDraftNoncash(db,{...input,...details},metadata,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},metadata,locks);await expect(run(m)).rejects.toThrow();await expect(run({...m,storeId:'other'})).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);}finally{await db.delete();}});

it('konfigurasi default, revisi, replay dan validasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{const {readPaymentMethods}=await import('./payment-methods');expect(await readPaymentMethods(db,'store')).toEqual({methods:{storeId:'store',qris:false,transfer:false,ewallet:false},revision:null});const data={expectedRevision:null,qris:true,transfer:false,ewallet:false},m=meta('methods',1),result=await setPaymentMethods(db,data,m,locks);await setPaymentMethods(db,{...data,expectedRevision:0,qris:false},meta('disable',2),locks);expect(await setPaymentMethods(db,data,m,locks)).toEqual(result);await expect(setPaymentMethods(db,{...data,transfer:true},m,locks)).rejects.toThrow('Konflik');const before=await checkpoint(db);await expect(setPaymentMethods(db,{...data,expectedRevision:0},meta('stale',3),locks)).rejects.toThrow();await expect(setPaymentMethods(db,{...data,expectedRevision:1,qris:1} as unknown as typeof data,meta('bad',3),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);await stageSnapshot(stage,before);expect(await checkpoint(stage)).toEqual(before);}finally{await db.delete();await stage.delete();}});

it('commit primitive menolak receipt baru memakai revisi konfigurasi basi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{const {input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);const before=await checkpoint(db);await stageSnapshot(stage,before);await payDraftNoncash(db,{...input,method:'qris',verified:true,expectedMethodsRevision:0,expectedSessionRevision:0},meta('pay',5),locks,now);const change=JSON.parse((await checkpoint(db)).receipts.find(r=>r.id==='pay')!.payload);await setPaymentMethods(stage,{expectedRevision:0,qris:false,transfer:false,ewallet:false},{...meta('disable',1),deviceId:'other-device'},locks);const stale=await checkpoint(stage),{commitChange}=await import('./commit');await expect(commitChange(stage,change,locks)).rejects.toThrow('Revisi metode');expect(await checkpoint(stage)).toEqual(stale);}finally{await db.delete();await stage.delete();}});

it.each(['draft','confirmed'] as const)('%s: verifikasi yang hilang ditolak',async path=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d,input}=await setup(db);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',5),locks,now);const details={method:'qris' as const,expectedMethodsRevision:0,expectedSessionRevision:0},before=await checkpoint(db),m=meta('pay',path==='draft'?5:6);await expect(Promise.resolve().then(()=>path==='draft'?payDraftNoncash(db,{...input,...details} as Parameters<typeof payDraftNoncash>[1],m,locks,now):payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details} as Parameters<typeof payConfirmedFirstBatchNoncash>[1],m,locks))).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);}finally{await db.delete();}});

it('konfigurasi mengisolasi input lock dan rollback setiap koleksi',async()=>{for(const table of ['sequences','state','audit','outbox','receipts'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{const before=await checkpoint(db),hook=()=>{throw new Error('injected')},data={expectedRevision:null,qris:true,transfer:false,ewallet:false},m=meta('methods',1);db[table].hook('creating',hook);db[table].hook('updating',hook);await expect(setPaymentMethods(db,data,m,locks)).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};const pending=setPaymentMethods(db,data,m,blocked);await ready;data.qris=false;m.actorId='lain';release();const result=await pending as {methods:{qris:boolean}};expect(result.methods.qris).toBe(true);}finally{await db.delete();}}});

it('order channel platform yang dibayar langsung menghasilkan Payment biasa',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();d.channel='gofood';d.channelAccountId='00000000-0000-4000-8000-000000000010';d.externalOrderId='ORDER-1';const {input}=await setup(db,d);await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},meta('methods',4),locks);await payDraftNoncash(db,{...input,method:'qris',verified:true,expectedMethodsRevision:0,expectedSessionRevision:0},meta('pay',5),locks,now);const snap=await checkpoint(db);expect(snap.state.find(r=>r.key===`payment:${d.orderId}`)?.value).toMatchObject({payment:{method:'qris',orderId:d.orderId}});expect(snap.state.some(r=>r.key.startsWith('platform-receivable:'))).toBe(false);}finally{await db.delete();}});
