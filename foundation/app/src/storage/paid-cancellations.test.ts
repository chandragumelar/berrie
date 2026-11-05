import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { confirmFirstBatch, payDraftCash } from './confirm-first-batch';
import { checkpoint, stageSnapshot } from './recovery';
import { canonical, type LockProvider } from './commit';
import { openCashSession, moveCash, readCashBalance } from './cash-sessions';
import { serveUnits, readServing } from './serving';

const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}

import { cancelPaidUnits, type CancelPaidInput } from './paid-cancellations';

it('membatalkan unit paid sebagian, menyimpan due dan menahan penyajian ulang',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const data:CancelPaidInput={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Tidak tersedia',kitchenConfirmed:true,returnStock:null};
 const before=await checkpoint(db),result=await cancelPaidUnits(db,data,meta('cancel',5),locks) as {cancellation:{units:{id:string}[]};refundDue:number};
 expect(result.refundDue).toBe(13750);expect(result.cancellation.units[0].id).toBe(d.items[0].unitIds[0]);
 expect((await readServing(db,'store',d.orderId)).serving.units[0].status).toBe('cancelled');
 await expect(serveUnits(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',6),locks)).rejects.toThrow();
 expect(await cancelPaidUnits(db,data,meta('cancel',5),locks)).toEqual(result);
 const after=await checkpoint(db);expect(after.state.filter(r=>r.key.startsWith('payment:') || r.key.startsWith('settlement:') || r.key.startsWith('stock-group:'))).toEqual(before.state.filter(r=>r.key.startsWith('payment:') || r.key.startsWith('settlement:') || r.key.startsWith('stock-group:')));
 await stageSnapshot(stage,after);expect(await checkpoint(stage)).toEqual(after);
 }finally{await db.delete();await stage.delete();}});
it('return saat batal menambah grup debit asal satu kali dan mempertahankan baseline',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const data:CancelPaidInput={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Tidak tersedia',kitchenConfirmed:true,returnStock:{reason:'Layak jual',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}};
 await cancelPaidUnits(db,data,meta('cancel',5),locks);const snap=await checkpoint(db);
 expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:1,baseline:2,minimum:5}});await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('refund due memakai nilai asal dan hanya lunas sesudah uang dikonfirmasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {refundCancelledUnits}=await import('./paid-cancellations');const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}],reason:'Tidak tersedia',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);
 const data={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true as const,returnStock:null};
 const a=await refundCancelledUnits(db,data,meta('refund',6),locks);expect(a).toMatchObject({refund:{amount:13750,method:'cash'},refundDue:13750,balance:13750});
 const b=await refundCancelledUnits(db,{...data,expectedRefundRevision:0,expectedSessionRevision:2},meta('refund2',7),locks);expect(b).toMatchObject({refundDue:0,balance:0});
 const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 await expect(refundCancelledUnits(db,{...data,expectedRefundRevision:1,expectedSessionRevision:3},meta('again',8),locks)).rejects.toThrow();
 }finally{await db.delete();await stage.delete();}});
it('batal dan refund langsung dalam satu commit dengan return stok',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits}=await import('./paid-cancellations');const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const data={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true as const,moneyReturned:true as const,method:null,returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}};
 const result=await cancelAndRefundPaidUnits(db,data,meta('direct',5),locks);expect(result).toMatchObject({refund:{amount:13750},refundDue:0,balance:13750,stockReturn:{cancellationId:'cancel:direct'}});
 const snap=await checkpoint(db);expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:1,baseline:2}});await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('return menyusul berbagi batas dengan return saat refund',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {refundCancelledUnits,returnCancelledStock}=await import('./paid-cancellations');const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const cancel=await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks) as {cancellation:{id:string;units:{id:string}[]}};
 const data={orderId:d.orderId,cancellationId:cancel.cancellation.id,unitIds:cancel.cancellation.units.map(u=>u.id),expectedCancellationRevision:0,expectedReturnRevision:null,expectedSessionRevision:1,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true as const};
 await returnCancelledStock(db,data,meta('return',6),locks);
 const refund={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true as const,returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:0,groups:[{groupId:'g',revision:2,balance:1}]}};
 const before=await checkpoint(db);await expect(refundCancelledUnits(db,refund,meta('bad',7),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 await refundCancelledUnits(db,{...refund,returnStock:null},meta('refund',7),locks);const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 await expect(returnCancelledStock(db,{...data,expectedReturnRevision:0,expectedSessionRevision:2,groups:[{groupId:'g',revision:2,balance:1}]},meta('again',8),locks)).rejects.toThrow();
 }finally{await db.delete();await stage.delete();}});

it('menolak input tidak sah, status served, dan revisi atau toko asing tanpa efek',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const base:CancelPaidInput={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},before=await checkpoint(db);
 for(const bad of [{...base,reason:' '},{...base,kitchenConfirmed:false},{...base,selection:[{itemId:d.items[0].id,quantity:2}]},{...base,expectedServingRevision:null},{...base,expectedSessionRevision:0},{...base,selection:[{itemId:'asing',quantity:1}]},{...base,selection:[{itemId:d.items[0].id,quantity:0}]},{...base,extra:1},{...base,returnStock:{reason:'Layak',sellable:false,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}}]) await expect(Promise.resolve().then(()=>cancelPaidUnits(db,bad as CancelPaidInput,meta('bad',6),locks))).rejects.toThrow();
 await expect(cancelPaidUnits(db,base,{...meta('bad',1),storeId:'lain'},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 const result=await cancelPaidUnits(db,base,meta('cancel',6),locks);expect(result).toMatchObject({serving:{units:[{status:'served'},{status:'cancelled'}]},refundDue:13750});
 }finally{await db.delete();}});
it('uang belum dikonfirmasi dan saldo kurang ditolak; override non-tunai tidak mengubah laci',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {refundCancelledUnits}=await import('./paid-cancellations'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);
 await moveCash(db,{sessionId:d.cashSessionId,expectedRevision:1,kind:'out',amount:20000,category:'Belanja',description:'Nyata'},meta('out',6),locks);
 const data={orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:2,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true as const,returnStock:null},before=await checkpoint(db);
 await expect(refundCancelledUnits(db,data,meta('bad',7),locks)).rejects.toThrow();await expect(refundCancelledUnits(db,{...data,moneyReturned:false} as unknown as typeof data,meta('bad',7),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 expect(await refundCancelledUnits(db,{...data,method:'qris'},meta('refund',7),locks)).toMatchObject({refund:{method:'qris',amount:13750},refundDue:0,balance:7500});
 }finally{await db.delete();}});
it('input disalin sebelum lock dan receipt bertahan reload serta menolak intent berbeda',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const data:CancelPaidInput={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},original=structuredClone(data),m=meta('cancel',5);
 let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const pending=cancelPaidUnits(db,data,m,blocked);await ready;data.selection[0].quantity=2;m.actorId='lain';release();const result=await pending;db.close();await db.open();expect(await cancelPaidUnits(db,original,meta('cancel',5),locks)).toEqual(result);await expect(cancelPaidUnits(db,data,meta('cancel',5),locks)).rejects.toThrow('Konflik');
 }finally{await db.delete();}});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('batal+refund+return rollback koleksi %s',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits}=await import('./paid-cancellations'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const data={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true as const,moneyReturned:true as const,method:null,returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},before=await checkpoint(db),hook=()=>{throw new Error('injected')};
 db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>cancelAndRefundPaidUnits(db,data,meta('direct',5),locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const saved=await run();expect(await run()).toEqual(saved);
 }finally{await db.delete();}});
it.each(['event','serving','stock','refund','audit'] as const)('staging menolak manipulasi %s tanpa mengubah sumber',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits}=await import('./paid-cancellations'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await cancelAndRefundPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,moneyReturned:true,method:null,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('direct',5),locks);
 const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='direct')!,change=JSON.parse(receipt.payload);
 if(field==='event')change.state.find((r:{key:string})=>r.key.startsWith('paid-cancellations:')).value.cancellations[0].units[0].amount++;
 if(field==='serving')change.state.find((r:{key:string})=>r.key.startsWith('serving:')).value.serving.units[0].status='served';
 if(field==='stock')change.state.find((r:{key:string})=>r.key==='stock-group:g').value.stockGroup.balance++;
 if(field==='refund')change.state.find((r:{key:string})=>r.key.startsWith('served-refunds:')).value.refunds[0].amount++;
 if(field==='audit'){change.audit[0].value.refundDue++;bad.audit.find(r=>r.id===change.audit[0].id)!.value=change.audit[0].value;}
 for(const row of change.state) {const current=bad.state.find(r=>r.key===row.key);if(current)current.value=row.value;}receipt.payload=canonical(change);
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});
it('unit Rp0 dapat dibatalkan dan direturn tanpa refund moneter',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits,readPaidCancellationStatus}=await import('./paid-cancellations');const d=draft(),first=d.items[0];first.unitIds=[first.unitIds[0]];first.skuPrice=0;const second=structuredClone(first);second.id='00000000-0000-4000-8000-000000000008';second.unitIds=['00000000-0000-4000-8000-000000000009'];second.skuPrice=100;d.items.push(second);
 const {input}=await setup(db,d);await payDraftCash(db,{...input,expectedSessionRevision:0,received:100},meta('pay',4),locks,now);
 const result=await cancelAndRefundPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:first.id,quantity:1}],reason:'Batal',kitchenConfirmed:true,moneyReturned:true,method:null,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('direct',5),locks);
 expect(result).toMatchObject({refund:null,refundDue:0,balance:100,stockReturn:{cancellationId:'cancel:direct'}});expect(await readPaidCancellationStatus(db,'store',d.orderId)).toMatchObject({refundDue:0});const snap=await checkpoint(db);expect(snap.ledger.filter(r=>r.id.startsWith('refund-ledger:'))).toHaveLength(0);await stageSnapshot(stage,snap);
 }finally{await db.delete();await stage.delete();}});
it('promo, topping, pajak dan layanan mempertahankan alokasi settlement untuk due dan refund',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {refundCancelledUnits}=await import('./paid-cancellations'),d=draft(),item=d.items[0];item.skuPrice=10001;item.toppingPrice=5000;item.toppings=[{id:'00000000-0000-4000-8000-000000000010',name:'Topping',price:5000}] as typeof item.toppings;item.promo={kind:'buyXGetY',buy:1,free:1,promotionId:'promo',revision:1} as typeof item.promo;d.taxBp=1000;d.serviceBp=500;
 const {input}=await setup(db,d),paid=await payDraftCash(db,{...input,expectedSessionRevision:0,received:100000},meta('pay',4),locks,now) as {settlement:{totals:{total:number;allocations:{id:string;total:number}[]}}};
 const cancel=await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:item.id,quantity:2}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);expect(cancel).toMatchObject({refundDue:paid.settlement.totals.total});
 const a=await refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:item.id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},meta('refund',6),locks) as {refund:{units:{id:string}[];amount:number};refundDue:number};
 expect(a.refund.amount).toBe(paid.settlement.totals.allocations.find(x=>x.id===a.refund.units[0].id)!.total);expect(a.refundDue+a.refund.amount).toBe(paid.settlement.totals.total);
 }finally{await db.delete();}});
it('refund served lama tidak dapat dibangkitkan melalui koreksi dan refund due memakai metode efektif',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {refundServedUnits}=await import('./served-refunds'),{correctServing}=await import('./serving'),{correctPaymentMethod}=await import('./payment-correction'),{refundCancelledUnits}=await import('./paid-cancellations');const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 await refundServedUnits(db,{orderId:d.orderId,expectedRefundRevision:null,expectedServingRevision:0,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Rusak',moneyReturned:true,returnStock:null},meta('served-refund',6),locks);
 await expect(correctServing(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[0]],reason:'Koreksi'},meta('bad',7),locks)).rejects.toThrow();
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedRefundRevision:0,expectedSessionRevision:2,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',7),locks);
 // Add actual cash before reclassification, because correction reclassifies the full payment.
 await moveCash(db,{sessionId:d.cashSessionId,expectedRevision:2,kind:'in',amount:13750,category:'Modal',description:'Nyata'},meta('in',8),locks);
 await correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:3,method:'qris',reason:'Salah metode'},meta('correct',9),locks);
 const refund=await refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:1,expectedCancellationRevision:0,expectedRefundRevision:0,expectedCorrectionRevision:0,expectedSessionRevision:4,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},meta('refund',10),locks);
 expect(refund).toMatchObject({refund:{method:'qris',amount:13750},refundDue:0,balance:0});const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('return lewat jalur refund dan pembatalan memakai batas unit yang sama',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits,returnCancelledStock}=await import('./paid-cancellations'),{returnRefundedStock}=await import('./served-refunds'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const result=await cancelAndRefundPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,moneyReturned:true,method:null,returnStock:null},meta('direct',5),locks) as {refund:{id:string;units:{id:string}[]};cancellation:{id:string}};
 const unitIds=result.refund.units.map(u=>u.id);await returnRefundedStock(db,{orderId:d.orderId,refundId:result.refund.id,unitIds,expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true},meta('return',6),locks);
 const before=await checkpoint(db);await expect(returnCancelledStock(db,{orderId:d.orderId,cancellationId:result.cancellation.id,unitIds,expectedCancellationRevision:0,expectedReturnRevision:0,expectedSessionRevision:2,groups:[{groupId:'g',revision:2,balance:1}],reason:'Layak',sellable:true},meta('again',7),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);await stageSnapshot(stage,before);expect(await checkpoint(stage)).toEqual(before);
 }finally{await db.delete();await stage.delete();}});
it('refund served lanjutan tetap dapat direkonstruksi setelah return pembatalan',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {refundServedUnits}=await import('./served-refunds'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('cancel',5),locks);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:0,unitIds:[d.items[0].unitIds[1]],reason:null},meta('serve',6),locks);
 await refundServedUnits(db,{orderId:d.orderId,expectedRefundRevision:null,expectedServingRevision:1,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Rusak',moneyReturned:true,returnStock:null},meta('refund',7),locks);const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('mendukung batch confirmed yang kemudian dibayar dan tidak mendebit ulang',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {payConfirmedFirstBatchCash}=await import('./confirmed-cash-payment'),{d,input}=await setup(db);await confirmFirstBatch(db,input,meta('confirm',4),locks,now);await payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:50000},meta('pay',5),locks);
 const before=await checkpoint(db);await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}],reason:'Batal semua',kitchenConfirmed:true,returnStock:null},meta('cancel',6),locks);
 expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(27500);const after=await checkpoint(db);expect(after.state.find(r=>r.key==='stock-group:g')).toEqual(before.state.find(r=>r.key==='stock-group:g'));expect(after.ledger.filter(r=>r.id.startsWith('batch-debit:'))).toHaveLength(1);
 }finally{await db.delete();}});
it('refund served berikutnya mempertahankan kontrak histori versi dua',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits}=await import('./paid-cancellations'),{refundServedUnits}=await import('./served-refunds'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 await cancelAndRefundPaidUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:null,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,moneyReturned:true,method:null,returnStock:null},meta('direct',6),locks);
 await refundServedUnits(db,{orderId:d.orderId,expectedRefundRevision:0,expectedServingRevision:1,expectedCorrectionRevision:null,expectedSessionRevision:2,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Rusak',moneyReturned:true,returnStock:null},meta('served',7),locks);
 const snap=await checkpoint(db);expect(snap.state.find(r=>r.key.startsWith('served-refunds:'))?.value).toMatchObject({schemaVersion:2});await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('Payment non-tunai positif memakai metode efektif tanpa mengubah laci',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {setPaymentMethods}=await import('./payment-methods'),{payDraftNoncash}=await import('./confirm-first-batch'),{refundCancelledUnits}=await import('./paid-cancellations'),{d,input}=await setup(db);
 await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:true,ewallet:true},meta('methods',4),locks);await payDraftNoncash(db,{...input,expectedSessionRevision:0,expectedMethodsRevision:0,method:'transfer',verified:true},meta('pay',5),locks,now);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',6),locks);
 const result=await refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},meta('refund',7),locks);expect(result).toMatchObject({refund:{method:'transfer',amount:13750},balance:0});expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(0);const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});
it('refund langsung hanya melunasi unit yang baru dibatalkan, tidak mengambil due lama',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelAndRefundPaidUnits,readPaidCancellationStatus}=await import('./paid-cancellations'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 const base={orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true as const,returnStock:null};
 const first=await cancelPaidUnits(db,base,meta('first',5),locks) as {cancellation:{units:{id:string}[]}};
 const second=await cancelAndRefundPaidUnits(db,{...base,expectedServingRevision:0,expectedCancellationRevision:0,expectedCorrectionRevision:null,moneyReturned:true,method:null},meta('second',6),locks) as {cancellation:{units:{id:string}[]};refund:{units:{id:string}[]};refundDue:number};
 expect(second.refund.units[0].id).toBe(second.cancellation.units[0].id);expect(second.refund.units[0].id).not.toBe(first.cancellation.units[0].id);expect(second.refundDue).toBe(13750);expect((await readPaidCancellationStatus(db,'store',d.orderId)).refundDue).toBe(13750);
 }finally{await db.delete();}});
