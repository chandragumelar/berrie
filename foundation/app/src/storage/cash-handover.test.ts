import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {BerrieDatabase} from './database';
import {openCashSession,moveCash,type CashMetadata} from './cash-sessions';
import {changeCashCount,readCustodySegments} from './cash-count';
import {checkpoint,stageSnapshot} from './recovery';
import type {LockProvider} from './commit';
const locks:LockProvider={request:async(_n,fn)=>fn()};
const id='11111111-1111-4111-8111-111111111111';
const meta=(operationId:string,localSequence:number,actorId='A'):CashMetadata=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId,policyVersion:1,recordedAt:'2026-11-01T16:59:00Z'});
const base=(session:number,count:number|null)=>({sessionId:id,expectedSessionRevision:session,expectedCountRevision:count});
const hp={purpose:'handover' as const};
it('AC-86: segmen merekonsiliasi sesi tanpa ledger fiktif',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:100000,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await moveCash(db,{sessionId:id,expectedRevision:0,kind:'in',amount:50000,category:'lain',description:'tunai'},meta('move-a',2),locks);
 await changeCashCount(db,'save',{...base(1,null),...hp,amount:145000},meta('count-a',3),locks);
 const result=await changeCashCount(db,'handover',{...base(2,0),...hp,incoming:'B',received:145000,reason:'kurang'},meta('handover',4,'B'),locks);
 expect(await changeCashCount(db,'handover',{...base(2,0),...hp,incoming:'B',received:145000,reason:'kurang'},meta('handover',4,'B'),locks)).toEqual(result);
 await moveCash(db,{sessionId:id,expectedRevision:3,kind:'in',amount:20000,category:'lain',description:'tunai'},meta('move-b',5,'B'),locks);
 await changeCashCount(db,'save',{...base(4,1),amount:163000},meta('count-b',6,'B'),locks);
 await changeCashCount(db,'close',{...base(5,2),reason:'kurang'},meta('close',7,'B'),locks);
 const segments=await readCustodySegments(db,'store',id);
 expect(segments.map(s=>s.difference)).toEqual([-5000,-2000]);expect(segments.map(s=>s.custodian)).toEqual(['A','B']);expect(segments[1]).toMatchObject({openingPhysical:145000,closingExpected:170000,segmentExpected:165000});
 const snap=await checkpoint(db);expect(snap.ledger).toHaveLength(3);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});

it('Rp0, revisi dan batal mempertahankan jejak; owner mengambil alih tanpa konfirmasi petugas lama',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const {readCashCount}=await import('./cash-count');
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('first',2),locks);
 await expect(changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:1},meta('bad',3,'B'),locks)).rejects.toThrow();
 await changeCashCount(db,'revise',{...base(1,0),...hp,amount:1},meta('revise',3),locks);
 await changeCashCount(db,'cancel',{...base(2,1),...hp},meta('cancel',4),locks);
 await changeCashCount(db,'save',{...base(3,2),...hp,amount:0},meta('owner-count',5,'owner'),locks);
 await expect(changeCashCount(db,'handover',{...base(4,3),...hp,incoming:'owner',received:0},meta('missing-exception',6,'owner'),locks)).rejects.toThrow();
 await changeCashCount(db,'handover',{...base(4,3),...hp,incoming:'owner',received:0,withoutOutgoingReason:'Petugas tidak hadir'},meta('takeover',6,'owner'),locks);
 const h=(await readCashCount(db,'store',id))!;expect(h.events.map(e=>e.amount)).toEqual([0,1,null,0,0]);expect(h.events.at(-1)).toMatchObject({actorId:'owner',handover:{outgoing:'A',incoming:'owner',withoutOutgoingReason:'Petugas tidak hadir'}});
 expect((await readCustodySegments(db,'store',id)).map(s=>s.custodian)).toEqual(['A','owner']);
 await expect(changeCashCount(db,'save',{...base(5,4),...hp,amount:0},meta('cross',7),locks)).resolves.toBeDefined();
 }finally{await db.delete();}});

it('beberapa handover, selisih positif dan negatif serta alasan segmen terakhir',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:100,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:110},meta('c1',2),locks);
 await expect(changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:110},meta('h1',3,'B'),locks)).rejects.toThrow();
 await changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:110,reason:'lebih'},meta('h1',3,'B'),locks);
 await changeCashCount(db,'save',{...base(2,1),...hp,amount:105},meta('c2',4,'B'),locks);
 await changeCashCount(db,'handover',{...base(3,2),...hp,incoming:'C',received:105,reason:'kurang'},meta('h2',5,'C'),locks);
 await changeCashCount(db,'save',{...base(4,3),amount:100},meta('c3',6,'C'),locks);
 await expect(changeCashCount(db,'close',base(5,4),meta('close',7,'C'),locks)).rejects.toThrow();
 await changeCashCount(db,'close',{...base(5,4),reason:'kurang'},meta('close',7,'C'),locks);
 expect((await readCustodySegments(db,'store',id)).map(s=>s.difference)).toEqual([10,-5,-5]);
 const {readInternalCashReport}=await import('./cash-report');const report=await readInternalCashReport(db,'store',id);expect(report.report.segments.map(s=>s.difference)).toEqual([10,-5,-5]);expect(report.report.summary).toMatchObject({expected:100,closingCount:100,closingDifference:0});
 }finally{await db.delete();}});

it.each(['sequences','state','audit','outbox','receipts'] as const)('gagal menulis %s membatalkan serah-terima atomik',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('count',2),locks);const before=await checkpoint(db);
 const hook=()=>{throw new Error('fault')};db[table].hook('creating',hook);db[table].hook('updating',hook);
 const input={...base(1,0),...hp,incoming:'B',received:0};await expect(changeCashCount(db,'handover',input,meta('handover',3,'B'),locks)).rejects.toThrow('fault');
 db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);
 await changeCashCount(db,'handover',input,meta('handover',3,'B'),locks);
 }finally{await db.delete();}});

it('menolak revisi lama, lintas toko, intent berbeda dan input yang berubah saat menunggu lock',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 const snapshot=await checkpoint(db);
 await expect(changeCashCount(db,'save',{...base(1,null),...hp,amount:0},meta('bad',2),locks)).rejects.toThrow();
 await expect(changeCashCount(db,'save',{...base(0,null),...hp,amount:0},{...meta('bad',2),storeId:'other'},locks)).rejects.toThrow();
 for(const amount of [-1,1.5,Number.MAX_SAFE_INTEGER+1]) await expect(Promise.resolve().then(()=>changeCashCount(db,'save',{...base(0,null),...hp,amount},meta('bad',2),locks))).rejects.toThrow();
 expect(await checkpoint(db)).toEqual(snapshot);
 let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const input={...base(0,null),...hp,amount:0},metadata=meta('count',2),pending=changeCashCount(db,'save',input,metadata,blocked);await ready;input.amount=8;metadata.actorId='changed';release();await pending;
 await expect(changeCashCount(db,'save',{...base(0,null),...hp,amount:8},meta('count',2),locks)).rejects.toThrow('Konflik');
 const hand={...base(1,0),...hp,incoming:'B',received:0};await changeCashCount(db,'handover',hand,meta('handover',3,'B'),locks);
 await expect(changeCashCount(db,'handover',{...hand,incoming:'C'},meta('handover',3,'B'),locks)).rejects.toThrow('Konflik');
 }finally{await db.delete();}});

it('pesanan aktif tidak menahan handover tetapi tetap menahan hitungan tutup',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const {createDraft}=await import('./drafts');
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 const draft={orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:id,customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-11-01T16:59:00Z',items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0};
 await createDraft(db,draft,{...meta('draft',2),storeTimeZone:'Asia/Jakarta'},locks,()=> '2026-11-01T16:59:00Z');
 await expect(changeCashCount(db,'save',{...base(0,null),amount:0},meta('blocked',3),locks)).rejects.toThrow();
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('count',3),locks);
 await changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:0},meta('handover',4,'B'),locks);
 await expect(changeCashCount(db,'save',{...base(2,1),amount:0},meta('blocked',5,'B'),locks)).rejects.toThrow();
 expect((await readCustodySegments(db,'store',id)).at(-1)?.custodian).toBe('B');
 }finally{await db.delete();}});

it('perhitungan segmen menolak overflow meskipun saldo sesi aman',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:Number.MAX_SAFE_INTEGER},meta('count',2),locks);
 await changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:Number.MAX_SAFE_INTEGER,reason:'lebih'},meta('handover',3,'B'),locks);
 await moveCash(db,{sessionId:id,expectedRevision:2,kind:'in',amount:1,category:'modal',description:'tambah'},meta('move',4,'B'),locks);
 await changeCashCount(db,'save',{...base(3,1),...hp,amount:0},meta('count2',5,'B'),locks);const before=await checkpoint(db);
 await expect(changeCashCount(db,'handover',{...base(4,2),...hp,incoming:'C',received:0,reason:'kurang'},meta('bad',6,'C'),locks)).rejects.toThrow('batas aman');expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it.each(['incoming','received','segmentDifference','boundary'] as const)('staging menolak manipulasi %s tanpa mengubah sumber atau tujuan',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
 const {canonical}=await import('./commit');
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('count',2),locks);
 await changeCashCount(db,'handover',{...base(1,0),...hp,incoming:'B',received:0},meta('handover',3,'B'),locks);
 const original=await checkpoint(db),bad=structuredClone(original),receipt=bad.receipts.find(r=>r.id==='handover')!,change=JSON.parse(receipt.payload),row=change.state.find((r:{key:string})=>r.key===`cash-count:${id}`),event=row.value.history.events.at(-1);
 if(field==='boundary') event.boundary=[];else if(field==='incoming') event.handover.incoming='X';else event.handover[field]++;
 change.audit[0].value.event=event;change.result.event=event;receipt.payload=canonical(change);receipt.result=change.result;bad.state.find(r=>r.key===`cash-count:${id}`)!.value=row.value;bad.audit.find(r=>r.operationId==='handover')!.value=change.audit[0].value;
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(original);
 }finally{await db.delete();await stage.delete();}});

it.each(['sequences','state','audit','outbox','receipts'] as const)('rollback %s selama save/revise/cancel handover',async table=>{for(const action of ['save','revise','cancel'] as const){const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 if(action!=='save') await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('count',2),locks);
 const before=await checkpoint(db),input=action==='save'?{...base(0,null),...hp,amount:0}:action==='revise'?{...base(1,0),...hp,amount:1}:{...base(1,0),...hp},m=meta('action',action==='save'?2:3);
 const hook=()=>{throw new Error('fault')};db[table].hook('creating',hook);db[table].hook('updating',hook);await expect(changeCashCount(db,action,input,m,locks)).rejects.toThrow('fault');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await changeCashCount(db,action,input,m,locks);
 }finally{await db.delete();}}});

it('AC-86 memakai payment tunai aktual di kedua segmen',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const {createDraft}=await import('./drafts'),{createStockGroup}=await import('./stock-groups'),{registerSkuStockMapping}=await import('./sku-stock-mappings'),{planStoredDraftStock}=await import('./draft-stock'),{payDraftCash}=await import('./confirm-first-batch'),{serveUnits}=await import('./serving');
 const now=()=> '2026-11-01T16:59:00Z',m=(op:string,n:number,actor='A')=>({...meta(op,n,actor),storeTimeZone:'Asia/Jakarta'}),sku='00000000-0000-4000-8000-000000000006';
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:100000,timeZone:'Asia/Jakarta'},m('open',1),locks);
 await createStockGroup(db,{groupId:'g',balance:2},m('stock',2),locks,now);await registerSkuStockMapping(db,{skuId:sku,groupId:'g'},m('mapping',3),locks,now);
 const draft=(n:number,price:number)=>({orderId:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,displayNumber:'261101-E1-0001',cashSessionId:id,customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:`00000000-0000-4000-8000-${String(n+10).padStart(12,'0')}`,unitIds:[`00000000-0000-4000-8000-${String(n+20).padStart(12,'0')}`],skuId:sku,name:'Kopi',skuPrice:price,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
 const a=draft(1,50000);await createDraft(db,a,m('draft-a',4),locks,now);let {sources}=await planStoredDraftStock(db,'store',a.orderId);await payDraftCash(db,{orderId:a.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups,expectedSessionRevision:0,received:50000},m('pay-a',5),locks,now);await serveUnits(db,{orderId:a.orderId,expectedRevision:null,unitIds:a.items[0].unitIds,reason:null},m('serve-a',6),locks);
 await changeCashCount(db,'save',{...base(1,null),...hp,amount:145000},m('count-a',7),locks);await changeCashCount(db,'handover',{...base(2,0),...hp,incoming:'B',received:145000,reason:'kurang'},m('handover',8,'B'),locks);
 const b=draft(2,20000);await createDraft(db,b,m('draft-b',9,'B'),locks,now);({sources}=await planStoredDraftStock(db,'store',b.orderId));await payDraftCash(db,{orderId:b.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups,expectedSessionRevision:3,received:20000},m('pay-b',10,'B'),locks,now);await serveUnits(db,{orderId:b.orderId,expectedRevision:null,unitIds:b.items[0].unitIds,reason:null},m('serve-b',11,'B'),locks);
 await changeCashCount(db,'save',{...base(4,1),amount:163000},m('count-b',12,'B'),locks);await changeCashCount(db,'close',{...base(5,2),reason:'kurang'},m('close',13,'B'),locks);
 const segments=await readCustodySegments(db,'store',id);expect(segments.map(s=>s.difference)).toEqual([-5000,-2000]);expect(segments.at(-1)?.closingExpected).toBe(170000);expect((await checkpoint(db)).ledger.filter(x=>(x.value as {kind?:string}).kind==='sale')).toHaveLength(2);
 }finally{await db.delete();}});

it('intent dan actor handover dibekukan sebelum menunggu Web Lock',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);await changeCashCount(db,'save',{...base(0,null),...hp,amount:0},meta('count',2),locks);
 let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const input={...base(1,0),...hp,incoming:'B',received:0},metadata=meta('handover',3,'B'),pending=changeCashCount(db,'handover',input,metadata,blocked);await ready;input.incoming='C';input.received=1;metadata.actorId='C';release();await pending;
 expect((await readCustodySegments(db,'store',id)).map(s=>s.custodian)).toEqual(['A','B']);
 }finally{await db.delete();}});
