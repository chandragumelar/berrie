import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch, settleDraftFree } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { canonical, type LockProvider } from './commit';
import { openCashSession, readCashBalance } from './cash-sessions';
import { serveUnits } from './serving';
import { settleConfirmedFirstBatchFree } from './free-settlement';
import { validateCheckpoint } from './validate-checkpoint';

const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}

import { cancelFreeUnits, returnFreeStock, readFreeCancellationStatus } from './free-cancellations';
import { correctServing } from './serving';
const free=async(db:BerrieDatabase,variant:'price'|'discount'='price',confirmed=false)=>{
 const d=draft();if(variant==='price')d.items[0].skuPrice=0;else d.discount={kind:'percent',value:10000} as typeof d.discount;
 const {input}=await setup(db,d);
 if(confirmed) {await confirmFirstBatch(db,input,meta('batch',4),locks,now);await settleConfirmedFirstBatchFree(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,reason:'Hadiah'},meta('free',5),locks);}
 else await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'Hadiah'},meta('free',4),locks,now);
 return d;
};
const cancelInput=(d:ReturnType<typeof draft>)=>({orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true as const,returnStock:null});
const group=(revision:number,balance:number)=>[{groupId:'g',revision,balance}];
const option=(revision:number,balance:number,expectedReturnRevision:number|null=null)=>({reason:'Layak',sellable:true as const,expectedReturnRevision,groups:group(revision,balance)});

it.each(['price','discount'] as const)('%s: batal dan return menyusul, tanpa efek uang atau cetak',async variant=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db,variant),before=await checkpoint(db),input=cancelInput(d),m=meta('cancel',5);
 const result=await cancelFreeUnits(db,input,m,locks) as {cancellation:{id:string;unitIds:string[]}};
 db.close();await db.open();expect(await cancelFreeUnits(db,input,m,locks)).toEqual(result);
 await expect(cancelFreeUnits(db,{...input,reason:'lain'},m,locks)).rejects.toThrow('Konflik');
 await returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:result.cancellation.id,unitIds:result.cancellation.unitIds,groups:group(1,0),reason:'Layak',sellable:true},meta('return',6),locks);
 const after=await checkpoint(db);validateCheckpoint(after);await stageSnapshot(stage,after);expect(await checkpoint(stage)).toEqual(after);
 expect(after.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:1,baseline:2,minimum:5}});
 expect(after.state.filter(r=>/^(payment|settlement|first-batch|customer-job|kitchen-job|cash-session):/.test(r.key))).toEqual(before.state.filter(r=>/^(payment|settlement|first-batch|customer-job|kitchen-job|cash-session):/.test(r.key)));
 expect(after.ledger.filter(r=>r.id.startsWith('batch-debit:'))).toHaveLength(1);expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(0);
 expect(await readFreeCancellationStatus(db,'store',d.orderId)).toMatchObject({cancellationRevision:0,returnRevision:0});
 }finally{await db.delete();await stage.delete();}});

it('return bersama, return served dan koreksi tidak menggandakan stok',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db,'price',true),u=d.items[0].unitIds;
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[u[0]],reason:null},meta('serve',6),locks);
 const cancel=await cancelFreeUnits(db,{...cancelInput(d),expectedServingRevision:0,returnStock:option(1,0)},meta('cancel',7),locks) as {cancellation:{id:string;unitIds:string[]}};
 const ret={orderId:d.orderId,expectedServingRevision:1,expectedCancellationRevision:0,expectedReturnRevision:0,expectedSessionRevision:0,cancellationId:null,unitIds:[u[0]],groups:group(2,1),reason:'Layak',sellable:true as const};
 await returnFreeStock(db,ret,meta('served-return',8),locks);
 await correctServing(db,{orderId:d.orderId,expectedRevision:1,unitIds:[u[0]],reason:'Koreksi'},meta('correct',9),locks);
 const before=await checkpoint(db);
 await expect(returnFreeStock(db,{...ret,expectedServingRevision:2,expectedReturnRevision:1,groups:group(3,2)},meta('again',10),locks)).rejects.toThrow();
 await expect(returnFreeStock(db,{...ret,expectedServingRevision:2,expectedReturnRevision:1,cancellationId:cancel.cancellation.id,unitIds:cancel.cancellation.unitIds,groups:group(3,2)},meta('again',10),locks)).rejects.toThrow();
 await expect(serveUnits(db,{orderId:d.orderId,expectedRevision:2,unitIds:cancel.cancellation.unitIds,reason:null},meta('again',10),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 const second=await cancelFreeUnits(db,{...cancelInput(d),expectedServingRevision:2,expectedCancellationRevision:0,returnStock:null},meta('cancel2',10),locks) as {cancellation:{id:string;unitIds:string[]}};
 const final=await checkpoint(db);await expect(returnFreeStock(db,{...ret,expectedServingRevision:3,expectedCancellationRevision:1,expectedReturnRevision:1,cancellationId:second.cancellation.id,unitIds:second.cancellation.unitIds,groups:group(3,2)},meta('again',11),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(final);
 }finally{await db.delete();}});

it('menolak pilihan, konfirmasi, revisi, grup, dan return duplikat tanpa efek',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),base=cancelInput(d),before=await checkpoint(db);
 for(const bad of [{...base,reason:''},{...base,kitchenConfirmed:false},{...base,selection:[]},{...base,selection:[{itemId:'asing',quantity:1}]},{...base,selection:[...base.selection,...base.selection]},{...base,expectedSessionRevision:1},{...base,expectedServingRevision:0},{...base,returnStock:option(1,1)},{...base,returnStock:option(99,0)}]) await expect(cancelFreeUnits(db,bad as typeof base,meta('bad',5),locks)).rejects.toThrow();
 expect(await checkpoint(db)).toEqual(before);
 const res=await cancelFreeUnits(db,{...base,returnStock:option(1,0)},meta('cancel',5),locks) as {cancellation:{id:string;unitIds:string[]}};
 const after=await checkpoint(db);await expect(returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedReturnRevision:0,expectedSessionRevision:0,cancellationId:res.cancellation.id,unitIds:res.cancellation.unitIds,groups:group(2,1),reason:'Layak',sellable:true},meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}});

it.each(['cancel','return'] as const)('%s: input dan metadata disalin sebelum menunggu lock',async kind=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),input=cancelInput(d);
 if(kind==='return')await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const m=meta('operation',kind==='return'?6:5),data=kind==='cancel'?{...input,returnStock:option(1,0)}:{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true as const};
 let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const run=kind==='cancel'?cancelFreeUnits(db,data as Parameters<typeof cancelFreeUnits>[1],m,blocked):returnFreeStock(db,data as Parameters<typeof returnFreeStock>[1],m,blocked);await ready;data.reason='Berubah';m.actorId='other';release();await run;
 const saved=JSON.parse((await checkpoint(db)).receipts.find(r=>r.id==='operation')!.payload);expect(saved.payload.data.reason).toBe(kind==='cancel'?'Batal':'Layak');expect(saved.actorId).toBe('actor');
 }finally{await db.delete();}});

it.each(['cancel','return'] as const)('%s: kegagalan tiap koleksi rollback penuh dan retry aman',async kind=>{for(const table of ['sequences','state','ledger','audit','outbox','receipts'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),base=cancelInput(d);if(kind==='return')await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const before=await checkpoint(db),hook=()=>{throw new Error('injected')};db[table].hook('creating',hook);db[table].hook('updating',hook);
 const run=()=>kind==='cancel'?cancelFreeUnits(db,{...base,returnStock:option(1,0)},meta('operation',5),locks):returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true},meta('operation',6),locks);
 await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const result=await run(),after=await checkpoint(db);db.close();await db.open();expect(await run()).toEqual(result);expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}}});

it.each(['source','unit','group','effect','receipt','money'] as const)('staging menolak manipulasi %s dan mempertahankan data sumber',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),input={...cancelInput(d),returnStock:option(1,0)};await cancelFreeUnits(db,input,meta('cancel',5),locks);
 const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='cancel')!,change=JSON.parse(receipt.payload);
 if(field==='source')change.payload.data.expectedSessionRevision=99;
 if(field==='unit')change.payload.data.selection[0].itemId='asing';
 if(field==='group')change.payload.data.returnStock.groups[0].groupId='asing';
 if(field==='effect'){const row=change.state.find((r:{key:string})=>r.key==='stock-group:g');row.value.stockGroup.balance++;bad.state.find(r=>r.key===row.key)!.value=row.value;}
 if(field==='receipt')receipt.result={};
 if(field==='money'){const event={id:'fake-money',operationId:'cancel',value:{kind:'refund',amount:1}};change.ledger.push(event);bad.ledger.push(event);}
 receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});

it('commit langsung menolak efek ledger dan sumber yang dimanipulasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),before=await checkpoint(db),{makeFreeCancellationChange}=await import('./free-cancellations'),{commitChange}=await import('./commit');
 const record=(key:string)=>before.state.find(r=>r.key===key)!.value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
 const change=makeFreeCancellationChange({batch:record(`first-batch:${d.orderId}`).batch,settlement:record(`settlement:${d.orderId}`).settlement,session:record(`cash-session:${d.cashSessionId}`).session,serving:null,cancellations:[],returns:[],groups:[]},cancelInput(d),meta('bad',5));
 change.ledger.push({id:'money',operationId:'bad',value:{kind:'refund',amount:1}});await expect(commitChange(db,change,locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('pembatalan parsial lalu penuh menolak served dan tidak membangkitkan cancelled',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),units=d.items[0].unitIds;
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[units[0]],reason:null},meta('serve',5),locks);
 const input={...cancelInput(d),expectedServingRevision:0};await expect(cancelFreeUnits(db,{...input,selection:[{itemId:d.items[0].id,quantity:2}]},meta('bad',6),locks)).rejects.toThrow();
 const first=await cancelFreeUnits(db,input,meta('cancel',6),locks) as {cancellation:{unitIds:string[]}};expect(first.cancellation.unitIds).toEqual([units[1]]);
 await expect(correctServing(db,{orderId:d.orderId,expectedRevision:1,unitIds:first.cancellation.unitIds,reason:'Koreksi'},meta('bad',7),locks)).rejects.toThrow();
 await correctServing(db,{orderId:d.orderId,expectedRevision:1,unitIds:[units[0]],reason:'Koreksi'},meta('correct',7),locks);
 await cancelFreeUnits(db,{...input,expectedServingRevision:2,expectedCancellationRevision:0},meta('cancel2',8),locks);
 expect((await readFreeCancellationStatus(db,'store',d.orderId)).serving.units.every(u=>u.status==='cancelled')).toBe(true);
 }finally{await db.delete();}});

it('return menolak overflow dan status/sumber yang salah',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db),{correctStockBaseline}=await import('./stock-groups');
 await correctStockBaseline(db,{groupId:'g',value:Number.MAX_SAFE_INTEGER,reason:'Hitung',expectedRevision:1,expectedBalance:0},meta('count',5),locks,now);
 const before=await checkpoint(db);await expect(cancelFreeUnits(db,{...cancelInput(d),returnStock:option(2,Number.MAX_SAFE_INTEGER)},meta('bad',6),locks)).rejects.toThrow();
 await expect(returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(2,Number.MAX_SAFE_INTEGER),reason:'Layak',sellable:true},meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it.each(['source','unit','group','effect','receipt'] as const)('staging menolak manipulasi return served: %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 await returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true},meta('ret',6),locks);
 const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='ret')!,change=JSON.parse(receipt.payload);
 if(field==='source')change.payload.data.expectedServingRevision=null;
 if(field==='unit')change.payload.data.unitIds=[d.items[0].unitIds[1]];
 if(field==='group')change.payload.data.groups[0].groupId='asing';
 if(field==='effect'){const row=change.state.find((r:{key:string})=>r.key==='stock-group:g');row.value.stockGroup.balance++;bad.state.find(r=>r.key===row.key)!.value=row.value;}
 if(field==='receipt')receipt.result={};receipt.payload=canonical(change);
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});

it('sumber paid, draft, toko lain dan return dengan pilihan tidak sah ditolak',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft(),{input}=await setup(db,d),{payDraftCash}=await import('./confirm-first-batch'),base=cancelInput(d),draftCheckpoint=await checkpoint(db);
 await expect(cancelFreeUnits(db,base,meta('bad',4),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(draftCheckpoint);
 await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('paid',4),locks,now);const paid=await checkpoint(db);
 await expect(cancelFreeUnits(db,base,meta('bad',5),locks)).rejects.toThrow();await expect(readFreeCancellationStatus(db,'store',d.orderId)).rejects.toThrow();expect(await checkpoint(db)).toEqual(paid);
 }finally{await db.delete();}
 const freeDb=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(freeDb);await serveUnits(freeDb,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const before=await checkpoint(freeDb),ret={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true as const};
 for(const bad of [{...ret,unitIds:['asing']},{...ret,unitIds:[...ret.unitIds,...ret.unitIds]},{...ret,unitIds:[d.items[0].unitIds[1]]},{...ret,sellable:false},{...ret,reason:''},{...ret,cancellationId:'asing'},{...ret,expectedSessionRevision:1}]) await expect(returnFreeStock(freeDb,bad as typeof ret,meta('bad',6),locks)).rejects.toThrow();
 await expect(returnFreeStock(freeDb,ret,{...meta('bad',6),storeId:'lain'},locks)).rejects.toThrow();expect(await checkpoint(freeDb)).toEqual(before);
 }finally{await freeDb.delete();}});

it('return campuran memakai grup debit asal masing-masing SKU',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft();d.items[0].skuPrice=0;d.items[0].unitIds=[d.items[0].unitIds[0]];const other=structuredClone(d.items[0]);other.id='00000000-0000-4000-8000-000000000010';other.skuId='00000000-0000-4000-8000-000000000011';other.unitIds=['00000000-0000-4000-8000-000000000012'];d.items.push(other);
 await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('cash',1),deviceId:'cash-device'},locks);
 await createStockGroup(db,{groupId:'g',balance:1},meta('g',1),locks,now);await createStockGroup(db,{groupId:'h',balance:1},meta('h',2),locks,now);
 await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map1',3),locks,now);await registerSkuStockMapping(db,{skuId:other.skuId,groupId:'h'},meta('map2',4),locks,now);await createDraft(db,d,meta('draft',5),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);await settleDraftFree(db,{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups,expectedSessionRevision:0,reason:'Hadiah'},meta('free',6),locks,now);
 const result=await cancelFreeUnits(db,{...cancelInput(d),selection:d.items.map(item=>({itemId:item.id,quantity:1})),returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0},{groupId:'h',revision:1,balance:0}]}},meta('cancel',7),locks) as {stockReturn:{units:{id:string;groupId:string}[]}};
 expect(result.stockReturn.units).toEqual([{id:d.items[0].unitIds[0],groupId:'g'},{id:other.unitIds[0],groupId:'h'}]);validateCheckpoint(await checkpoint(db));
 }finally{await db.delete();}});

it('return served replay setelah reload mengembalikan hasil asal dan menolak intent lain',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const data={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true as const},m=meta('return',6);
 const result=await returnFreeStock(db,data,m,locks),before=await checkpoint(db);db.close();await db.open();expect(await returnFreeStock(db,data,m,locks)).toEqual(result);await expect(returnFreeStock(db,{...data,reason:'lain'},m,locks)).rejects.toThrow('Konflik');expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('commit langsung return served menolak penambahan ledger uang',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await free(db);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);const before=await checkpoint(db),{makeFreeReturnChange}=await import('./free-cancellations'),{commitChange}=await import('./commit');
 const record=(key:string)=>before.state.find(r=>r.key===key)!.value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
 const change=makeFreeReturnChange({batch:record(`first-batch:${d.orderId}`).batch,settlement:record(`settlement:${d.orderId}`).settlement,session:record(`cash-session:${d.cashSessionId}`).session,serving:record(`serving:${d.orderId}`).serving,cancellations:[],returns:[],groups:[record('stock-group:g').stockGroup]}, {orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:null,unitIds:[d.items[0].unitIds[0]],groups:group(1,0),reason:'Layak',sellable:true},meta('bad',6));
 change.ledger.push({id:'money',operationId:'bad',value:{kind:'refund',amount:1}});await expect(commitChange(db,change,locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
