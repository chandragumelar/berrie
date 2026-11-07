import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { type LockProvider } from './commit';
import { openCashSession } from './cash-sessions';
import { serveUnits } from './serving';

const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}

import { readOrderOperationalStatus, readSessionCloseBlockers } from './order-status';
import { cancelUnpaidFirstBatch } from './unpaid-cancellations';
import { cancelStoredDraft } from './draft-cancellation';
import { payConfirmedFirstBatchCash } from './confirmed-cash-payment';
import { settleConfirmedFirstBatchFree } from './free-settlement';

it('tracks draft, unpaid processing, serving and full cancellation without writing',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db),before=await checkpoint(db);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'stored',counts:{draft:2},settlement:'unpaid'});
 expect((await readSessionCloseBlockers(db,'store',d.cashSessionId)).blockers).toHaveLength(1);
 expect(await checkpoint(db)).toEqual(before);
 await confirmFirstBatch(db,input,meta('batch',4),locks,now);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'active',counts:{processed:2},reasons:['processed','unsettled']});
 await cancelUnpaidFirstBatch(db,{orderId:d.orderId,expectedBatchRevision:0,expectedServingRevision:null,expectedSessionRevision:0,reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'cancelled_without_settlement',counts:{cancelled:2},reasons:[]});
 expect((await readSessionCloseBlockers(db,'store',d.cashSessionId)).blockers).toEqual([]);
 }finally{await db.delete();}});

it('draft cancellation is terminal and does not enter history',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const {d}=await setup(db);await cancelStoredDraft(db,{orderId:d.orderId,expectedRevision:0,reason:'Batal'},meta('cancel',4),locks);expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'cancelled_without_settlement',counts:{cancelled:2}});}finally{await db.delete();}});

it.each(['paid','free'] as const)('%s remains active until serving completes',async mode=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();if(mode==='free')d.items[0].skuPrice=0;const {input}=await setup(db,d);await confirmFirstBatch(db,input,meta('batch',4),locks,now);
 if(mode==='paid') await payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:30000},meta('settle',5),locks);else await settleConfirmedFirstBatchFree(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,reason:'Gratis'},meta('settle',5),locks);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'active',settlement:mode,counts:{processed:2}});
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',6),locks);
 const before=await checkpoint(db),result=await readOrderOperationalStatus(db,'store',d.orderId);expect(result.status).toMatchObject({classification:'history',counts:{served:2},reasons:[]});result.status!.counts.served=999;expect((await readOrderOperationalStatus(db,'store',d.orderId)).status?.counts.served).toBe(2);expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('refund due follows cancelled allocations, not stock returns, and survives staging',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {payDraftCash}=await import('./confirm-first-batch'),{cancelPaidUnits,refundCancelledUnits}=await import('./paid-cancellations');
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}],reason:'Batal',kitchenConfirmed:true,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('cancel',5),locks);
 const read=()=>readOrderOperationalStatus(db,'store',d.orderId);expect((await read()).status).toMatchObject({refundDue:27500,classification:'active',reasons:['refund_due']});
 const data={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true as const,returnStock:null};
 await refundCancelledUnits(db,data,meta('refund',6),locks);expect((await read()).status?.refundDue).toBe(13750);
 await refundCancelledUnits(db,{...data,expectedRefundRevision:0,expectedSessionRevision:2},meta('refund2',7),locks);expect((await read()).status).toMatchObject({refundDue:0,classification:'history'});
 const before=await checkpoint(db);await stageSnapshot(stage,before);expect(await readOrderOperationalStatus(stage,'store',d.orderId)).toEqual(await read());expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();await stage.delete();}});

it('isolates stores and sessions and rejects damaged checkpoints',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d}=await setup(db),second=draft();second.orderId='00000000-0000-4000-8000-000000000021';second.items[0].id='00000000-0000-4000-8000-000000000024';second.items[0].unitIds=['00000000-0000-4000-8000-000000000025'];await createDraft(db,second,meta('second',4),locks,now);const other=draft();other.orderId='00000000-0000-4000-8000-000000000011';other.cashSessionId='00000000-0000-4000-8000-000000000013';other.items[0].id='00000000-0000-4000-8000-000000000014';other.items[0].unitIds=['00000000-0000-4000-8000-000000000015'];
 const m={...meta('other-cash',1),storeId:'other',deviceId:'other-cash'};await openCashSession(db,{sessionId:other.cashSessionId,number:'2',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},m,locks);await createDraft(db,other,{...m,operationId:'other-draft',deviceId:'other-device'},locks,now);
 expect((await readSessionCloseBlockers(db,'store',d.cashSessionId)).blockers.map(x=>x.orderId)).toEqual([d.orderId,second.orderId]);expect((await readOrderOperationalStatus(db,'store',other.orderId)).status).toBeNull();await expect(readSessionCloseBlockers(db,'store',other.cashSessionId)).rejects.toThrow();
 await db.state.delete(`draft:${d.orderId}`);await expect(readSessionCloseBlockers(db,'store',d.cashSessionId)).rejects.toThrow();
 }finally{await db.delete();}});

it('reports platform source as incomplete instead of an empty safe result',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft();d.channel='gofood';d.channelAccountId='00000000-0000-4000-8000-000000000010';d.externalOrderId='platform';await setup(db,d);
 const result=await readSessionCloseBlockers(db,'store',d.cashSessionId);expect(result.blockers).toEqual([]);expect(result.incomplete).toEqual([{key:`draft:${d.orderId}`,reason:'Sumber draft legacy atau platform belum didukung'}]);
 }finally{await db.delete();}});

it('free cancellation becomes history only once all units are terminal',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {settleDraftFree}=await import('./confirm-first-batch'),{cancelFreeUnits}=await import('./free-cancellations');const d=draft();d.items[0].skuPrice=0;const {input}=await setup(db,d);await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'Hadiah'},meta('free',4),locks,now);
 await cancelFreeUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'active',refundDue:0,counts:{processed:1,cancelled:1}});
 await serveUnits(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[1]],reason:null},meta('serve',6),locks);
 expect((await readOrderOperationalStatus(db,'store',d.orderId)).status).toMatchObject({classification:'history',refundDue:0,counts:{served:1,cancelled:1}});
 }finally{await db.delete();}});

it('reports generic order sources and never treats them as a safe empty list',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {commitChange}=await import('./commit');const {d}=await setup(db);const op='legacy';await commitChange(db,{operationId:op,storeId:'store',deviceId:'legacy',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'unknown',actorId:'actor',policyVersion:1,payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'legacy-audit',operationId:op,value:{}}],outbox:{id:'legacy-outbox',operationId:op,value:{}},result:{}},locks);
 const before=await checkpoint(db);expect((await readSessionCloseBlockers(db,'store',d.cashSessionId)).incomplete).toContainEqual({key:'order:unknown',reason:'Record generik belum didukung'});expect((await readOrderOperationalStatus(db,'store','unknown')).incomplete).toHaveLength(1);expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('count rejects draft, processed, unpaid, paid-unserved and refund due; cancellation releases service',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{cancelPaidUnits,refundCancelledUnits}=await import('./paid-cancellations');
 const {d,input}=await setup(db), count=(revision:number,countRevision:number|null)=>({sessionId:d.cashSessionId,expectedSessionRevision:revision,expectedCountRevision:countRevision,amount:0});
 await expect(changeCashCount(db,'save',count(0,null),meta('count',4),locks)).rejects.toThrow();
 await confirmFirstBatch(db,input,meta('batch',4),locks,now);
 await expect(changeCashCount(db,'save',count(0,null),meta('count',5),locks)).rejects.toThrow();
 await payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:30000},meta('pay',5),locks);
 await expect(changeCashCount(db,'save',count(1,null),meta('count',6),locks)).rejects.toThrow();
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',6),locks);
 await expect(changeCashCount(db,'save',count(1,null),meta('count',7),locks)).rejects.toThrow();
 await refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},meta('refund',7),locks);
 await changeCashCount(db,'save',count(2,null),meta('count',8),locks);
 await expect(refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:0,expectedCorrectionRevision:null,expectedSessionRevision:3,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},meta('again',9),locks)).rejects.toThrow();
 await changeCashCount(db,'cancel',{sessionId:d.cashSessionId,expectedSessionRevision:3,expectedCountRevision:0},meta('unfreeze',9),locks);
 await changeCashCount(db,'save',count(4,1),meta('count2',10),locks);
 const snapshot=await checkpoint(db);expect(snapshot.receipts.some(r=>r.id==='count2')).toBe(true);
 }finally{await db.delete();}});

it('count refuses incomplete platform and generic sources',async()=>{for(const platform of [true,false]) {const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count');const d=draft();if(platform){d.channel='gofood';d.channelAccountId='00000000-0000-4000-8000-000000000010';d.externalOrderId='platform';}await setup(db,d);
 if(!platform){const {commitChange}=await import('./commit');const op='legacy';await commitChange(db,{operationId:op,storeId:'store',deviceId:'legacy',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'unknown',actorId:'actor',policyVersion:1,payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'legacy-audit',operationId:op,value:{}}],outbox:{id:'legacy-outbox',operationId:op,value:{}},result:{}},locks);}
 const before=await checkpoint(db);await expect(changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:0},meta('count',4),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}}});

it('served unpaid tetap blocker; hitungan ditolak tanpa mengubah checkpoint',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count');const {d,input}=await setup(db);await confirmFirstBatch(db,input,meta('batch',4),locks,now);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',5),locks);
 expect((await readSessionCloseBlockers(db,'store',d.cashSessionId)).blockers[0].reasons).toEqual(['unsettled']);const before=await checkpoint(db);await expect(changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:0},meta('count',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('mutasi pesanan tanpa ledger ditahan saat hitungan dan sesi tertutup; replay lama tetap berhasil',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{correctServing}=await import('./serving'),{correctPaymentMethod}=await import('./payment-correction');const {d,input}=await setup(db);await confirmFirstBatch(db,input,meta('batch',4),locks,now);await payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:30000},meta('pay',5),locks);
 const serving={orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null};const served=await serveUnits(db,serving,meta('serve',6),locks);
 await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:1,expectedCountRevision:null,amount:27500},meta('count',7),locks);
 const correction={orderId:d.orderId,expectedRevision:0,unitIds:d.items[0].unitIds,reason:'Salah catat'},before=await checkpoint(db);
 await expect(correctServing(db,correction,meta('correction',8),locks)).rejects.toThrow();await expect(correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:2,method:'qris',reason:'Salah'},meta('method',8),locks)).rejects.toThrow();expect(await serveUnits(db,serving,meta('serve',6),locks)).toEqual(served);expect(await checkpoint(db)).toEqual(before);
 await changeCashCount(db,'close',{sessionId:d.cashSessionId,expectedSessionRevision:2,expectedCountRevision:0},meta('close',8),locks);
 await expect(correctServing(db,correction,meta('correction',9),locks)).rejects.toThrow();await expect(correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:3,method:'qris',reason:'Salah'},meta('method',9),locks)).rejects.toThrow();expect(await serveUnits(db,serving,meta('serve',6),locks)).toEqual(served);
 }finally{await db.delete();}});

it('staging menolak batas hitungan yang menyembunyikan penyelesaian blocker',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{canonical}=await import('./commit');const {d}=await setup(db);await cancelStoredDraft(db,{orderId:d.orderId,expectedRevision:0,reason:'Batal'},meta('cancel',4),locks);await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:0},meta('count',5),locks);
 const original=await checkpoint(db),bad=structuredClone(original),receipt=bad.receipts.find(r=>r.id==='count')!,change=JSON.parse(receipt.payload),count=change.state.find((r:{key:string})=>r.key===`cash-count:${d.cashSessionId}`).value,event=count.history.events.at(-1);event.boundary.find((x:{key:string})=>x.key===JSON.stringify(['store','device',1])).sequence=3;change.payload.boundary=event.boundary;change.audit[0].value.event=event;change.result.event=event;receipt.payload=canonical(change);receipt.result=change.result;bad.state.find(r=>r.key===`cash-count:${d.cashSessionId}`)!.value=count;bad.audit.find(r=>r.operationId==='count')!.value=change.audit[0].value;
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(original);
 }finally{await db.delete();await stage.delete();}});
