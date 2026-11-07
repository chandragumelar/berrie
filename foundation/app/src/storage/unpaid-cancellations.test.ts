import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { canonical, type LockProvider } from './commit';
import { openCashSession, readCashBalance } from './cash-sessions';
import { serveUnits } from './serving';
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

import { cancelUnpaidFirstBatch, returnUnpaidStock, readUnpaidCancellationStatus } from './unpaid-cancellations';
import { correctServing } from './serving';
import { payConfirmedFirstBatchCash } from './confirmed-cash-payment';
import { settleConfirmedFirstBatchFree } from './free-settlement';

const group=(revision:number,balance:number)=>[{groupId:'g',revision,balance}];
const cancelInput=(d:ReturnType<typeof draft>)=>({orderId:d.orderId,expectedBatchRevision:0,expectedServingRevision:null,expectedSessionRevision:0,reason:'Batal',kitchenConfirmed:true as const,returnStock:null});
const ret=(d:ReturnType<typeof draft>,unitIds:string[],revision:number|null,groupRevision:number,balance:number)=>({orderId:d.orderId,expectedBatchRevision:0,expectedServingRevision:0,expectedCancellationRevision:0,expectedReturnRevision:revision,expectedSessionRevision:0,unitIds,groups:group(groupRevision,balance),reason:'Layak',sellable:true as const});
async function confirmed(db:BerrieDatabase) {const {d,input}=await setup(db);await confirmFirstBatch(db,input,meta('batch',4),locks,now);return {d,input};}

it('batal penuh tanpa return mempertahankan sumber, replay dan return menyusul sekali per unit',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input:batchInput}=await confirmed(db),before=await checkpoint(db),input=cancelInput(d),m=meta('cancel',5);
 const result=await cancelUnpaidFirstBatch(db,input,m,locks);db.close();await db.open();expect(await cancelUnpaidFirstBatch(db,input,m,locks)).toEqual(result);
 await expect(cancelUnpaidFirstBatch(db,{...input,reason:'lain'},m,locks)).rejects.toThrow('Konflik');
 const status=await readUnpaidCancellationStatus(db,'store',d.orderId);expect(status.serving.units.every(u=>u.status==='cancelled')).toBe(true);expect(status.batch.draft.orderId).toBe(d.orderId);
 await expect(serveUnits(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[0]],reason:null},meta('bad',6),locks)).rejects.toThrow();
 await expect(correctServing(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[0]],reason:'Koreksi'},meta('bad',6),locks)).rejects.toThrow();
 await expect(confirmFirstBatch(db,batchInput,meta('bad',6),locks,now)).rejects.toThrow();
 await expect(payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:50000},meta('bad',6),locks)).rejects.toThrow();
 await expect(settleConfirmedFirstBatchFree(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,reason:'gratis'},meta('bad',6),locks)).rejects.toThrow();
 await returnUnpaidStock(db,ret(d,[d.items[0].unitIds[0]],null,1,0),meta('return1',6),locks);
 await expect(returnUnpaidStock(db,ret(d,[d.items[0].unitIds[0]],0,2,1),meta('bad',7),locks)).rejects.toThrow();
 await returnUnpaidStock(db,ret(d,[d.items[0].unitIds[1]],0,2,1),meta('return2',7),locks);
 const after=await checkpoint(db);validateCheckpoint(after);await stageSnapshot(stage,after);expect(await checkpoint(stage)).toEqual(after);
 expect(after.state.filter(r=>/^(draft|first-batch|kitchen-job|cash-session):/.test(r.key))).toEqual(before.state.filter(r=>/^(draft|first-batch|kitchen-job|cash-session):/.test(r.key)));
 expect(after.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:2}});expect(after.ledger.filter(r=>r.id.startsWith('batch-debit:'))).toHaveLength(1);expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(0);
 }finally{await db.delete();await stage.delete();}});

it('return sebagian atomik dan sisanya menyusul',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db),units=d.items[0].unitIds;
 const input={...cancelInput(d),returnStock:{unitIds:[units[0]],reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:group(1,0)}};
 await cancelUnpaidFirstBatch(db,input,meta('cancel',5),locks);await returnUnpaidStock(db,ret(d,[units[1]],0,2,1),meta('return',6),locks);validateCheckpoint(await checkpoint(db));
 }finally{await db.delete();}});

it('menolak input, revisi dan unit served tanpa mengubah data',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db),input=cancelInput(d),before=await checkpoint(db);
 for(const bad of [{...input,reason:''},{...input,kitchenConfirmed:false},{...input,expectedServingRevision:0},{...input,expectedSessionRevision:1},{...input,expectedBatchRevision:1},{...input,returnStock:{unitIds:[d.items[0].unitIds[0]],reason:'Layak',sellable:true,expectedReturnRevision:null,groups:group(1,1)}}]) await expect(cancelUnpaidFirstBatch(db,bad as typeof input,meta('bad',5),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);const served=await checkpoint(db);await expect(cancelUnpaidFirstBatch(db,{...input,expectedServingRevision:0},meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(served);
 }finally{await db.delete();}});

it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('rollback %s dan retry atomik',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db),before=await checkpoint(db),hook=()=>{throw new Error('injected')};db[table].hook('creating',hook);db[table].hook('updating',hook);
 const input={...cancelInput(d),returnStock:{unitIds:d.items[0].unitIds,reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:group(1,0)}};const run=()=>cancelUnpaidFirstBatch(db,input,meta('cancel',5),locks);
 await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);await run();validateCheckpoint(await checkpoint(db));
 }finally{await db.delete();}});

it.each(['source','unit','group','effect','receipt','money'] as const)('staging menolak manipulasi %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db);await cancelUnpaidFirstBatch(db,{...cancelInput(d),returnStock:{unitIds:d.items[0].unitIds,reason:'Layak',sellable:true,expectedReturnRevision:null,groups:group(1,0)}},meta('cancel',5),locks);
 const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='cancel')!,change=JSON.parse(receipt.payload);
 if(field==='source')change.payload.data.expectedSessionRevision=99;if(field==='unit')change.payload.data.returnStock.unitIds=['asing'];if(field==='group')change.payload.data.returnStock.groups[0].groupId='asing';if(field==='effect'){const row=change.state.find((r:{key:string})=>r.key==='stock-group:g');row.value.stockGroup.balance++;bad.state.find(r=>r.key===row.key)!.value=row.value;}if(field==='receipt')receipt.result={};if(field==='money'){const event={id:'fake-money',operationId:'cancel',value:{kind:'refund',amount:1}};change.ledger.push(event);bad.ledger.push(event);}receipt.payload=canonical(change);
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});

it.each(['cancel','return'] as const)('%s membekukan input sebelum Web Lock',async kind=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db);if(kind==='return')await cancelUnpaidFirstBatch(db,cancelInput(d),meta('first',5),locks);
 const data=kind==='cancel'?cancelInput(d):ret(d,[d.items[0].unitIds[0]],null,1,0),m=meta('operation',kind==='cancel'?5:6);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const run=kind==='cancel'?cancelUnpaidFirstBatch(db,data as Parameters<typeof cancelUnpaidFirstBatch>[1],m,blocked):returnUnpaidStock(db,data as Parameters<typeof returnUnpaidStock>[1],m,blocked);await ready;data.reason='berubah';m.actorId='lain';release();await run;const saved=JSON.parse((await checkpoint(db)).receipts.find(r=>r.id==='operation')!.payload);expect(saved.payload.data.reason).toBe(kind==='cancel'?'Batal':'Layak');expect(saved.actorId).toBe('actor');
 }finally{await db.delete();}});

it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('return menyusul rollback %s dan replay',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db);await cancelUnpaidFirstBatch(db,cancelInput(d),meta('cancel',5),locks);const before=await checkpoint(db),hook=()=>{throw new Error('injected')};db[table].hook('creating',hook);db[table].hook('updating',hook);const data=ret(d,d.items[0].unitIds,null,1,0),m=meta('return',6),run=()=>returnUnpaidStock(db,data,m,locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const result=await run();db.close();await db.open();expect(await run()).toEqual(result);await expect(returnUnpaidStock(db,{...data,reason:'lain'},m,locks)).rejects.toThrow('Konflik');
 }finally{await db.delete();}});

it('overflow saldo dan return ilegal ditolak',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db),{correctStockBaseline}=await import('./stock-groups');await correctStockBaseline(db,{groupId:'g',value:Number.MAX_SAFE_INTEGER,reason:'Hitung',expectedRevision:1,expectedBalance:0},meta('count',5),locks,now);const before=await checkpoint(db),base=cancelInput(d),option={unitIds:[d.items[0].unitIds[0]],reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:group(2,Number.MAX_SAFE_INTEGER)};await expect(cancelUnpaidFirstBatch(db,{...base,returnStock:option},meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 await cancelUnpaidFirstBatch(db,base,meta('cancel',6),locks);const after=await checkpoint(db),data=ret(d,[d.items[0].unitIds[0]],null,2,Number.MAX_SAFE_INTEGER);for(const bad of [data,{...data,sellable:false},{...data,unitIds:['asing']},{...data,unitIds:[data.unitIds[0],data.unitIds[0]]},{...data,expectedCancellationRevision:1}])await expect(returnUnpaidStock(db,bad as typeof data,meta('bad',7),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}});

it('beberapa SKU berbagi grup mengembalikan tepat satu debit per unit',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft(),other=structuredClone(d.items[0]);d.items[0].unitIds=[d.items[0].unitIds[0]];other.id='00000000-0000-4000-8000-000000000010';other.skuId='00000000-0000-4000-8000-000000000011';other.unitIds=['00000000-0000-4000-8000-000000000012'];d.items.push(other);
 await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('stock',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map1',2),locks,now);await registerSkuStockMapping(db,{skuId:other.skuId,groupId:'g'},meta('map2',3),locks,now);await createDraft(db,d,meta('draft',4),locks,now);const {sources}=await planStoredDraftStock(db,'store',d.orderId);await confirmFirstBatch(db,{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups},meta('batch',5),locks,now);
 const result=await cancelUnpaidFirstBatch(db,{...cancelInput(d),returnStock:{unitIds:d.items.flatMap(i=>i.unitIds),reason:'Layak',sellable:true,expectedReturnRevision:null,groups:group(1,0)}},meta('cancel',6),locks) as {stockReturn:{units:{id:string;groupId:string}[]}};expect(result.stockReturn.units.map(u=>u.groupId)).toEqual(['g','g']);const snapshot=await checkpoint(db);expect(snapshot.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:2}});validateCheckpoint(snapshot);
 }finally{await db.delete();}});

it('sumber draft, settled, toko lain dan replay konfirmasi asal',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d,input}=await setup(db),base=cancelInput(d),draftSnapshot=await checkpoint(db);await expect(cancelUnpaidFirstBatch(db,base,meta('bad',4),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(draftSnapshot);const batchMeta=meta('batch',4),original=await confirmFirstBatch(db,input,batchMeta,locks,now);await expect(cancelUnpaidFirstBatch(db,base,{...meta('bad',5),storeId:'lain'},locks)).rejects.toThrow();await cancelUnpaidFirstBatch(db,base,meta('cancel',5),locks);expect(await confirmFirstBatch(db,input,batchMeta,locks,now)).toEqual(original);
 }finally{await db.delete();}
 const paid=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(paid);await payConfirmedFirstBatchCash(paid,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:50000},meta('pay',5),locks);const before=await checkpoint(paid);await expect(cancelUnpaidFirstBatch(paid,cancelInput(d),meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(paid)).toEqual(before);}finally{await paid.delete();}});

it('komit langsung menolak efek tambahan dan settlement sesudah batal',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db),before=await checkpoint(db),{makeUnpaidCancellationChange}=await import('./unpaid-cancellations'),{commitChange}=await import('./commit');
 const record=(key:string)=>before.state.find(r=>r.key===key)!.value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
 const change=makeUnpaidCancellationChange({batch:record(`first-batch:${d.orderId}`).batch,session:record(`cash-session:${d.cashSessionId}`).session,serving:null,cancellation:null,returns:[],groups:[]},cancelInput(d),meta('bad',5));change.ledger.push({id:'fake',operationId:'bad',value:{kind:'refund',amount:1}});await expect(commitChange(db,change,locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 await cancelUnpaidFirstBatch(db,cancelInput(d),meta('cancel',5),locks);const cancelled=await checkpoint(db),{makeConfirmedCashPaymentChange}=await import('./confirmed-cash-payment');const payment=makeConfirmedCashPaymentChange(record(`first-batch:${d.orderId}`).batch,record(`cash-session:${d.cashSessionId}`).session,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:50000},meta('bad',6),0);await expect(commitChange(db,payment,locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(cancelled);
 }finally{await db.delete();}});

it.each(['event','revision','return-event','return-revision'] as const)('staging menolak perubahan %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{const {d}=await confirmed(db);await cancelUnpaidFirstBatch(db,cancelInput(d),meta('cancel',5),locks);await returnUnpaidStock(db,ret(d,[d.items[0].unitIds[0]],null,1,0),meta('return',6),locks);const good=await checkpoint(db),bad=structuredClone(good),id=field.startsWith('return')?'return':'cancel',receipt=bad.receipts.find(r=>r.id===id)!,change=JSON.parse(receipt.payload);
 if(field==='event'){const row=change.state.find((r:{key:string})=>r.key.startsWith('unpaid-cancellation:'));row.value.cancellation.reason='lain';bad.state.find(r=>r.key===row.key)!.value=row.value;}
 if(field==='revision')change.payload.data.expectedServingRevision=0;
 if(field==='return-event'){const row=change.state.find((r:{key:string})=>r.key.startsWith('unpaid-stock-returns:'));row.value.returns[0].units[0].groupId='lain';bad.state.find(r=>r.key===row.key)!.value=row.value;}
 if(field==='return-revision')change.payload.data.expectedCancellationRevision=1;
 receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});

it('settlement gratis Rp0 dan non-tunai baru ditolak setelah batal',async()=>{for(const mode of ['free','noncash'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();if(mode==='free')d.items[0].skuPrice=0;const {input}=await setup(db,d);await confirmFirstBatch(db,input,meta('batch',4),locks,now);const {setPaymentMethods}=await import('./payment-methods');await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:false,ewallet:false},{...meta('methods',1),deviceId:'settings'},locks);await cancelUnpaidFirstBatch(db,cancelInput(d),meta('cancel',5),locks);const before=await checkpoint(db);if(mode==='free')await expect(settleConfirmedFirstBatchFree(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,reason:'gratis'},meta('bad',6),locks)).rejects.toThrow();else {const {payConfirmedFirstBatchNoncash}=await import('./noncash-payment');await expect(payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,expectedMethodsRevision:0,method:'qris',verified:true},meta('bad',6),locks)).rejects.toThrow();}expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}}});
