import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { openCashSession } from './cash-sessions';
import { createDraft, updateDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch } from './confirm-first-batch';
import { correctServing, readServing, serveUnits } from './serving';
import { checkpoint, stageSnapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { canonical, type LockProvider } from './commit';

const locks:LockProvider={request:async(_name,fn)=>fn()};
const at='2026-11-01T00:00:00Z';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:at,storeTimeZone:'Asia/Jakarta'});
const draft=()=>({orderId:id(1),displayNumber:'261101-E1-0001',cashSessionId:id(2),customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:at,items:[{id:id(3),unitIds:[id(4),id(5),id(6)],skuId:id(7),name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
const opening={sessionId:id(2),number:'1',initialCustodian:'actor',openingAmount:100,timeZone:'Asia/Jakarta'};
const cashMeta={...meta('cash',1),deviceId:'cash-device'};
const now=()=>at;
async function setup(db:BerrieDatabase) {
 const d=draft();await openCashSession(db,opening,cashMeta,locks);await createStockGroup(db,{groupId:'g',balance:10},meta('stock',1),locks,now);await registerSkuStockMapping(db,{skuId:id(7),groupId:'g'},meta('map',2),locks,now);
 await createDraft(db,d,meta('draft',3),locks,now);d.customer='B';await updateDraft(db,d,meta('edit',4),0,locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);const input={orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups};
 await confirmFirstBatch(db,input,meta('batch',5),locks,now);return {d,input};
}
const selection=(expectedRevision:number|null,unitIds:string[],reason:string|null=null)=>({orderId:id(1),expectedRevision,unitIds,reason});
it('buka kas, edit, konfirmasi, sajikan sebagian dan sisa lalu koreksi tanpa efek uang, stok atau cetak',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
  await setup(db);const before=await checkpoint(db),initial=await readServing(db,'store',id(1));expect(initial.revision).toBeNull();expect(initial.serving.units.every(u=>u.status==='processed')).toBe(true);
  const one=selection(null,[id(4)]),result=await serveUnits(db,one,meta('serve1',6),locks);expect((await readServing(db,'store',id(1))).serving.units.map(u=>u.status)).toEqual(['served','processed','processed']);
  expect(await serveUnits(db,one,meta('serve1',6),locks)).toEqual(result);
  await serveUnits(db,selection(0,[id(5),id(6)]),meta('serve2',7),locks);expect((await readServing(db,'store',id(1))).serving.units.every(u=>u.status==='served')).toBe(true);
  await correctServing(db,selection(1,[id(5)],'Salah tandai'),meta('correct',8),locks);expect((await readServing(db,'store',id(1))).serving.units.map(u=>u.status)).toEqual(['served','processed','served']);
  const after=await checkpoint(db);expect(after.ledger).toEqual(before.ledger);expect(after.state.filter(x=>!x.key.startsWith('serving:'))).toEqual(before.state);expect(after.state.some(x=>x.key.startsWith('settlement:'))).toBe(false);expect(after.audit.find(a=>a.id==='serving-audit:correct')?.value).toMatchObject({reason:'Salah tandai',action:'correct'});
  validateCheckpoint(after);await stageSnapshot(stage,JSON.parse(JSON.stringify(after)));expect(await checkpoint(stage)).toEqual(after);
 }finally{await db.delete();await stage.delete();}
});
it('menolak sesi hilang atau lintas toko dan mempertahankan semua koleksi',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{
  const d=draft(),before=await checkpoint(db);await expect(createDraft(db,d,meta('draft',1),locks,now)).rejects.toThrow('Sesi kas');expect(await checkpoint(db)).toEqual(before);
  await openCashSession(db,opening,{...cashMeta,storeId:'other'},locks);const cross=await checkpoint(db);await expect(createDraft(db,d,meta('draft',1),locks,now)).rejects.toThrow('toko');expect(await checkpoint(db)).toEqual(cross);
 }finally{await db.delete();}
});
it('menolak unit kosong, duplikat, asing, status salah, revisi basi, toko dan konflik ID',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{await setup(db);const before=await checkpoint(db);
  for(const bad of [selection(null,[]),selection(null,[id(4),id(4)]),selection(null,[id(99)]),selection(0,[id(4)])]) await expect(serveUnits(db,bad,meta('bad',6),locks)).rejects.toThrow();
  await expect(correctServing(db,selection(null,[id(4)],'x'),meta('bad',6),locks)).rejects.toThrow();await expect(correctServing(db,selection(null,[id(4)],' '),meta('bad',6),locks)).rejects.toThrow();
  await expect(serveUnits(db,selection(null,[id(4)]),{...meta('bad',1),storeId:'other'},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
  const data=selection(null,[id(4)]);await serveUnits(db,data,meta('serve',6),locks);const after=await checkpoint(db);
  await expect(serveUnits(db,selection(null,[id(5)]),meta('serve',6),locks)).rejects.toThrow('Konflik');await expect(serveUnits(db,selection(0,[id(4)]),meta('bad',7),locks)).rejects.toThrow();await expect(correctServing(db,selection(0,[id(4)],''),meta('bad',7),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}
});
it('input disalin sebelum lock dan dua penulis dengan revisi sama hanya satu berhasil',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try {await setup(db);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);const blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
  const data=selection(null,[id(4)]),m=meta('serve',6),pending=serveUnits(db,data,m,blocked);await ready;data.unitIds[0]=id(5);m.actorId='changed';release();await pending;expect((await readServing(db,'store',id(1))).serving.units.map(u=>u.status)).toEqual(['served','processed','processed']);
  let queue:Promise<unknown>=Promise.resolve();const serial:LockProvider={request:(_n,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}};
  const results=await Promise.allSettled([serveUnits(db,selection(0,[id(5)]),meta('a',7),serial),serveUnits(db,selection(0,[id(5)]),meta('b',7),serial)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 }finally{await db.delete();}
});
it.each(['sequences','state','audit','outbox','receipts'] as const)('abort %s memulihkan semua koleksi, retry dan replay sekali',async table=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{await setup(db);const before=await checkpoint(db),hook=()=>{throw new Error('injected')};db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>serveUnits(db,selection(null,[id(4)]),meta('serve',6),locks);
  await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await run();const after=await checkpoint(db);await run();expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}
});
it('checkpoint menolak histori penyajian rusak dan downgrade kontrak sesi',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{await setup(db);await serveUnits(db,selection(null,[id(4)]),meta('serve',6),locks);const snap=await checkpoint(db);
  for(const variant of ['source','status','downgrade'] as const){const bad=structuredClone(snap),receipt=bad.receipts.find(r=>r.id===(variant==='downgrade'?'draft':'serve'))!,c=JSON.parse(receipt.payload);
   if(variant==='source') c.payload.sessionSource.id=id(99);if(variant==='status') c.payload.data.unitIds=[id(99)];if(variant==='downgrade'){delete c.payload.contractVersion;delete c.payload.sessionSource;}receipt.payload=canonical(c);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);
  }expect(await checkpoint(db)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}
});
it('receipt lama tanpa sesi tetap terbaca, replay tetap berlaku, mutasi baru ditolak',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{await setup(db);const old=await checkpoint(db);
  old.receipts=old.receipts.filter(r=>r.id!=='cash');old.state=old.state.filter(r=>!r.key.startsWith('cash-session:'));old.ledger=old.ledger.filter(r=>r.operationId!=='cash');old.audit=old.audit.filter(r=>r.operationId!=='cash');old.outbox=old.outbox.filter(r=>r.operationId!=='cash');old.sequences=old.sequences.filter(r=>!r.key.includes('cash-device'));
  for(const receipt of old.receipts){const c=JSON.parse(receipt.payload);if(['draft.create','draft.update','batch.confirm-first'].includes(c.kind)){delete c.payload.contractVersion;delete c.payload.sessionSource;for(const s of c.state) if(['draft','first-batch','kitchen-job'].includes(s.value.recordType)) s.value.schemaVersion=1;receipt.payload=canonical(c);}}
  for(const row of old.state){const v=row.value as {recordType?:string;schemaVersion?:number};if(['draft','first-batch','kitchen-job'].includes(v.recordType??''))v.schemaVersion=1;}
  validateCheckpoint(old);await stageSnapshot(stage,old);const before=await checkpoint(stage);await expect(serveUnits(stage,selection(null,[id(4)]),meta('serve',6),locks)).rejects.toThrow('Sesi kas');expect(await checkpoint(stage)).toEqual(before);
  const source=JSON.parse(old.receipts.find(r=>r.id==='batch')!.payload);expect(await confirmFirstBatch(stage,source.payload.data,source.payload.metadata,locks)).toEqual(source.result);expect(await checkpoint(stage)).toEqual(before);
 }finally{await db.delete();await stage.delete();}
});
it('draft, konfirmasi dan penyajian baru menolak sesi asal hilang tanpa efek',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{
  const d=draft();await openCashSession(db,opening,cashMeta,locks);await createStockGroup(db,{groupId:'g',balance:10},meta('stock',1),locks,now);await registerSkuStockMapping(db,{skuId:id(7),groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
  const {sources}=await planStoredDraftStock(db,'store',d.orderId),input={orderId:d.orderId,expectedDraftRevision:0,mappings:sources.mappings,groups:sources.groups};
  await expect(serveUnits(db,selection(null,[id(4)]),meta('before-batch',4),locks)).rejects.toThrow('Batch');
  await db.state.delete(`cash-session:${id(2)}`);const before=await checkpoint(db);d.customer='B';await expect(updateDraft(db,d,meta('edit',4),0,locks,now)).rejects.toThrow('Sesi kas');await expect(confirmFirstBatch(db,input,meta('batch',4),locks,now)).rejects.toThrow('Sesi kas');expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}
});
it('abort koreksi beralasan rollback dan retry tidak menggandakan audit',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{await setup(db);await serveUnits(db,selection(null,[id(4)]),meta('serve',6),locks);const before=await checkpoint(db),hook=()=>{throw new Error('injected')};db.receipts.hook('creating',hook);const input=selection(0,[id(4)],'Salah tanda'),run=()=>correctServing(db,input,meta('correct',7),locks);await expect(run()).rejects.toThrow('injected');db.receipts.hook('creating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await run();const after=await checkpoint(db);await run();expect(await checkpoint(db)).toEqual(after);expect(after.audit.filter(a=>a.id==='serving-audit:correct')).toHaveLength(1);
 }finally{await db.delete();}
});
it('draft lama tanpa sesi tetap dibaca dan replay, tetapi edit dan konfirmasi baru ditolak',async()=>{
 const source=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
  const d=draft(),m=meta('draft',1);await openCashSession(source,opening,cashMeta,locks);await createDraft(source,d,m,locks,now);const old=await checkpoint(source);
  old.receipts=old.receipts.filter(r=>r.id!=='cash');old.state=old.state.filter(r=>!r.key.startsWith('cash-session:'));old.ledger=old.ledger.filter(r=>r.operationId!=='cash');old.audit=old.audit.filter(r=>r.operationId!=='cash');old.outbox=old.outbox.filter(r=>r.operationId!=='cash');old.sequences=old.sequences.filter(r=>!r.key.includes('cash-device'));
  const receipt=old.receipts.find(r=>r.id==='draft')!,c=JSON.parse(receipt.payload);delete c.payload.contractVersion;delete c.payload.sessionSource;c.state[0].value.schemaVersion=1;receipt.payload=canonical(c);(old.state.find(r=>r.key===`draft:${id(1)}`)!.value as {schemaVersion:number}).schemaVersion=1;
  validateCheckpoint(old);await stageSnapshot(stage,old);const before=await checkpoint(stage);expect(await createDraft(stage,d,m,locks,now)).toEqual(c.result);d.customer='B';await expect(updateDraft(stage,d,meta('edit',2),0,locks,now)).rejects.toThrow('Sesi kas');await expect(confirmFirstBatch(stage,{orderId:id(1),expectedDraftRevision:0,mappings:[],groups:[]},meta('confirm',2),locks,now)).rejects.toThrow('Sesi kas');expect(await checkpoint(stage)).toEqual(before);
 }finally{await source.delete();await stage.delete();}
});
it('regresi 200 unit: draft tanpa debit, konfirmasi dan replay menyisakan 800',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();d.items[0].unitIds=Array.from({length:200},(_,i)=>id(1000+i));d.items[0].skuPrice=100;await openCashSession(db,opening,cashMeta,locks);await createStockGroup(db,{groupId:'g',balance:1000},meta('stock',1),locks,now);await registerSkuStockMapping(db,{skuId:id(7),groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);expect((await db.state.get('stock-group:g'))?.value).toMatchObject({stockGroup:{balance:1000}});const {sources}=await planStoredDraftStock(db,'store',d.orderId),input={orderId:d.orderId,expectedDraftRevision:0,mappings:sources.mappings,groups:sources.groups};await confirmFirstBatch(db,input,meta('batch',4),locks,now);const after=await checkpoint(db);await confirmFirstBatch(db,input,meta('batch',4),locks,now);expect(await checkpoint(db)).toEqual(after);expect((await db.state.get('stock-group:g'))?.value).toMatchObject({stockGroup:{balance:800}});
 }finally{await db.delete();}
});
it('histori merujuk revisi sesi saat operasi, bukan revisi terakhir',async()=>{
 const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{await setup(db);const {moveCash}=await import('./cash-sessions');
  await moveCash(db,{sessionId:id(2),expectedRevision:0,kind:'in',amount:1,category:'lain',description:'masuk'},meta('move1',6),locks);await serveUnits(db,selection(null,[id(4)]),meta('serve',7),locks);await moveCash(db,{sessionId:id(2),expectedRevision:1,kind:'in',amount:1,category:'lain',description:'masuk'},meta('move2',8),locks);
  const snap=await checkpoint(db);validateCheckpoint(snap);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);const bad=structuredClone(snap),receipt=bad.receipts.find(r=>r.id==='serve')!,c=JSON.parse(receipt.payload);c.payload.sessionSource.revision=0;receipt.payload=canonical(c);expect(()=>validateCheckpoint(bad)).toThrow();
 }finally{await db.delete();await stage.delete();}
});
