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

import { refundServedUnits, returnRefundedStock, readServedRefunds, type ServedRefundInput } from './served-refunds';

async function paid(db:BerrieDatabase) {const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',5),locks);return d;}
function refundInput(d:ReturnType<typeof draft>):ServedRefundInput {return {orderId:d.orderId,expectedRefundRevision:null,expectedServingRevision:0,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Rusak',moneyReturned:true,returnStock:null};}
it('refund served dari draft dibayar, retry, return kemudian dan staging',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),input=refundInput(d),m=meta('refund',6),result=await refundServedUnits(db,input,m,locks) as {refund:{id:string;units:{id:string}[];amount:number}};
 expect(result.refund.amount).toBe(13750);expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(13750);expect(await refundServedUnits(db,input,m,locks)).toEqual(result);
 const data={orderId:d.orderId,refundId:result.refund.id,unitIds:result.refund.units.map(u=>u.id),expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak jual',sellable:true as const};
 await returnRefundedStock(db,data,meta('return',7),locks);expect((await readServedRefunds(db,'store',d.orderId)).returns).toHaveLength(1);const snap=await checkpoint(db);expect(snap.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:1,baseline:2}});await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 await expect(returnRefundedStock(db,{...data,expectedReturnRevision:0,groups:[{groupId:'g',revision:2,balance:1}]},meta('again',8),locks)).rejects.toThrow();
 }finally{await db.delete();await stage.delete();}});

it('draft → confirmed → paid → served → refund dengan return atomik dan saldo grup asal',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await confirmFirstBatch(db,input,meta('confirm',4),locks,now);
 const {payConfirmedFirstBatchCash}=await import('./confirmed-cash-payment');await payConfirmedFirstBatchCash(db,{orderId:d.orderId,expectedBatchRevision:0,expectedSessionRevision:0,received:50000},meta('pay',5),locks);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',6),locks);
 const data={...refundInput(d),returnStock:{reason:'Masih layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},before=await checkpoint(db);
 const result=await refundServedUnits(db,data,meta('refund',7),locks) as {stockReturn:{id:string};refund:{id:string}};expect(result.stockReturn.id).not.toBe(result.refund.id);
 const after=await checkpoint(db);expect(after.state.find(r=>r.key==='stock-group:g')?.value).toMatchObject({stockGroup:{balance:1,baseline:2,minimum:5}});expect(after.state.filter(r=>r.key.startsWith('payment:')||r.key.startsWith('settlement:')||r.key.startsWith('customer-job:')||r.key.startsWith('serving:'))).toEqual(before.state.filter(r=>r.key.startsWith('payment:')||r.key.startsWith('settlement:')||r.key.startsWith('customer-job:')||r.key.startsWith('serving:')));
 await stageSnapshot(stage,after);expect(await checkpoint(stage)).toEqual(after);
 }finally{await db.delete();await stage.delete();}});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('refund dan return rollback koleksi %s',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),before=await checkpoint(db),data={...refundInput(d),returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},hook=()=>{throw new Error('injected')};
 db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>refundServedUnits(db,data,meta('refund',6),locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const result=await run(),after=await checkpoint(db);expect(await run()).toEqual(result);expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}});
it('saldo tidak cukup, revisi basi, input ilegal dan toko asing ditolak tanpa efek',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db);await moveCash(db,{sessionId:d.cashSessionId,expectedRevision:1,kind:'out',amount:20000,category:'belanja',description:'nyata'},meta('out',6),locks);const before=await checkpoint(db),input={...refundInput(d),expectedSessionRevision:2};
 for(const invalid of [input,{...input,expectedSessionRevision:1},{...input,reason:' '},{...input,moneyReturned:false},{...input,selection:[{itemId:'asing',quantity:1}]},{...input,selection:[{itemId:d.items[0].id,quantity:3}]},{...input,selection:[{itemId:d.items[0].id,quantity:1},{itemId:d.items[0].id,quantity:1}]},{...input,method:'lain'}]) await expect(Promise.resolve().then(()=>refundServedUnits(db,invalid as ServedRefundInput,meta('bad',7),locks))).rejects.toThrow();
 await expect(refundServedUnits(db,{...input,method:'qris'},{...meta('bad',1),storeId:'other'},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 const ok=await refundServedUnits(db,{...input,method:'qris'},meta('noncash',7),locks);expect(ok).toMatchObject({refund:{method:'qris'},balance:7500});
 }finally{await db.delete();}});
it('input disalin sebelum lock dan replay setelah database dibuka ulang',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),data=refundInput(d),m=meta('refund',6);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),blocked:LockProvider={request:async(_n,fn)=>{entered();await held;return fn()}};
 const pending=refundServedUnits(db,data,m,blocked);await ready;data.selection[0].quantity=2;data.reason='ubah';m.actorId='lain';release();const result=await pending;db.close();await db.open();expect(await refundServedUnits(db,refundInput(d),meta('refund',6),locks)).toEqual(result);await expect(refundServedUnits(db,data,meta('refund',6),locks)).rejects.toThrow('Konflik');
 }finally{await db.delete();}});
it('checkpoint menolak efek refund yang dimanipulasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db);await refundServedUnits(db,refundInput(d),meta('refund',6),locks);const original=await checkpoint(db),bad=structuredClone(original),receipt=bad.receipts.find(r=>r.id==='refund')!,change=JSON.parse(receipt.payload);change.ledger[0].value.refund.amount++;bad.ledger.find(r=>r.id===change.ledger[0].id)!.value=change.ledger[0].value;receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(original);
 }finally{await db.delete();await stage.delete();}});

it.each(['draft','confirmed'] as const)('refund non-tunai %s, koreksi metode efektif dan override',async path=>{for(const method of ['qris','transfer','ewallet'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db),{setPaymentMethods}=await import('./payment-methods'),{payDraftNoncash}=await import('./confirm-first-batch'),{payConfirmedFirstBatchNoncash}=await import('./noncash-payment'),{correctPaymentMethod}=await import('./payment-correction');
 await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:true,ewallet:true},meta('methods',4),locks);let seq=5;
 if(path==='confirmed')await confirmFirstBatch(db,input,meta('confirm',seq++),locks,now);
 const details={expectedSessionRevision:0,expectedMethodsRevision:0,method,verified:true as const};if(path==='draft')await payDraftNoncash(db,{...input,...details},meta('pay',seq++),locks,now);else await payConfirmedFirstBatchNoncash(db,{orderId:d.orderId,expectedBatchRevision:0,...details},meta('pay',seq++),locks);
 await correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:0,method:'cash',reason:'Salah metode'},meta('correction',seq++),locks);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',seq++),locks);
 const base={...refundInput(d),expectedCorrectionRevision:0,expectedSessionRevision:1},a=await refundServedUnits(db,base,meta('refund',seq++),locks);expect(a).toMatchObject({refund:{method:'cash',amount:13750},balance:13750});
 const b=await refundServedUnits(db,{...base,expectedRefundRevision:0,expectedSessionRevision:2,method:'qris'},meta('refund2',seq),locks);expect(b).toMatchObject({refund:{method:'qris',amount:13750},balance:13750});expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(13750);
 }finally{await db.delete();}}});
it('hanya unit served dapat dipilih; sumber belum dibayar ditolak',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db),base=refundInput(d);await expect(refundServedUnits(db,base,meta('bad',4),locks)).rejects.toThrow();
 await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[d.items[0].unitIds[0]],reason:null},meta('serve',5),locks);
 const before=await checkpoint(db);await expect(refundServedUnits(db,{...base,selection:[{itemId:d.items[0].id,quantity:2}]},meta('bad',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});

it('alokasi 33.350 dibayar penuh dalam dua refund tanpa hitung ulang',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft(),first=d.items[0];first.unitIds=[first.unitIds[0]];first.skuPrice=10000;const second=structuredClone(first);second.id='00000000-0000-4000-8000-000000000008';second.unitIds=['00000000-0000-4000-8000-000000000009'];second.skuPrice=20000;d.items.push(second);d.discount={kind:'amount',value:1000} as typeof d.discount;d.taxBp=1000;d.serviceBp=500;
 const {input}=await setup(db,d);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:[...first.unitIds,...second.unitIds],reason:null},meta('serve',5),locks);
 const a=await refundServedUnits(db,{...refundInput(d),selection:[{itemId:first.id,quantity:1}]},meta('one',6),locks),b=await refundServedUnits(db,{...refundInput(d),expectedRefundRevision:0,expectedSessionRevision:2,selection:[{itemId:second.id,quantity:1}]},meta('two',7),locks);expect(a).toMatchObject({refund:{amount:11117}});expect(b).toMatchObject({refund:{amount:22233},balance:0});
 const before=await checkpoint(db);await expect(refundServedUnits(db,{...refundInput(d),expectedRefundRevision:1,expectedSessionRevision:3},meta('again',8),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
it.each(['serving','payment','session','stock','return','audit'] as const)('staging menolak sumber/efek yang diubah: %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),data={...refundInput(d),returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},before=await checkpoint(db);await refundServedUnits(db,data,meta('refund',6),locks);const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='refund')!,change=JSON.parse(receipt.payload);
 if(field==='serving')change.payload.data.expectedServingRevision=7;
 if(field==='payment')change.state.find((r:{key:string})=>r.key.startsWith('served-refunds:')).value.refunds[0].paymentId='payment:other';
 if(field==='session')change.payload.data.expectedSessionRevision=0;
 if(field==='stock')change.state.find((r:{key:string})=>r.key==='stock-group:g').value.stockGroup.balance=2;
 if(field==='return')change.state.find((r:{key:string})=>r.key.startsWith('stock-returns:')).value.returns[0].units[0].groupId='other';
 if(field==='audit'){change.audit[0].value.after++;bad.audit.find(r=>r.id===change.audit[0].id)!.value=change.audit[0].value;}
 for(const row of change.state) {const current=bad.state.find(r=>r.key===row.key);if(current)current.value=row.value;}
 receipt.payload=canonical(change);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect((await checkpoint(db)).state).not.toEqual(before.state);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});
it('record generik lama dengan nama kind refund tetap generik',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{const {commitChange}=await import('./commit');await commitChange(db,{operationId:'generic',storeId:'store',deviceId:'device',deviceEpoch:1,localSequence:1,kind:'refund.served',targetId:'generic',actorId:'actor',policyVersion:1,payload:{legacy:true},state:[{key:'generic',expectedRevision:null,value:{kind:'refund.served'}}],ledger:[],audit:[{id:'audit',operationId:'generic',value:{}}],outbox:{id:'outbox',operationId:'generic',value:{}},result:{}},locks);const snap=await checkpoint(db);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);}finally{await db.delete();await stage.delete();}});
it('promo jumlah, topping dan pajak memakai alokasi settlement sampai refund penuh',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft(),item=d.items[0];item.skuPrice=10001;item.toppingPrice=5000;item.toppings=[{id:'00000000-0000-4000-8000-000000000010',name:'Topping',price:5000}] as typeof item.toppings;item.promo={kind:'buyXGetY',buy:1,free:1,promotionId:'promo',revision:1} as typeof item.promo;d.taxBp=1000;
 const {input}=await setup(db,d),paid=await payDraftCash(db,{...input,expectedSessionRevision:0,received:100000},meta('pay',4),locks,now) as {settlement:{totals:{total:number;allocations:{id:string;total:number}[]}}};await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:item.unitIds,reason:null},meta('serve',5),locks);
 const a=await refundServedUnits(db,refundInput(d),meta('a',6),locks) as {refund:{units:{id:string}[];amount:number}},b=await refundServedUnits(db,{...refundInput(d),expectedRefundRevision:0,expectedSessionRevision:2},meta('b',7),locks) as {refund:{amount:number}};
 expect(a.refund.amount).toBe(paid.settlement.totals.allocations.find(x=>x.id===a.refund.units[0].id)!.total);expect(a.refund.amount+b.refund.amount).toBe(paid.settlement.totals.total);expect(await readCashBalance(db,'store',d.cashSessionId)).toBe(0);
 }finally{await db.delete();}});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('return terpisah rollback koleksi %s',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),result=await refundServedUnits(db,refundInput(d),meta('refund',6),locks) as {refund:{id:string;units:{id:string}[]}},before=await checkpoint(db),data={orderId:d.orderId,refundId:result.refund.id,unitIds:result.refund.units.map(u=>u.id),expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true as const},hook=()=>{throw new Error('injected')};
 db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>returnRefundedStock(db,data,meta('return',7),locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const saved=await run(),after=await checkpoint(db);db.close();await db.open();expect(await run()).toEqual(saved);expect(await checkpoint(db)).toEqual(after);
 }finally{await db.delete();}});
it('return menolak unit asing, duplikat, revisi basi dan barang yang belum dinyatakan layak',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),result=await refundServedUnits(db,refundInput(d),meta('refund',6),locks) as {refund:{id:string;units:{id:string}[]}},unit=result.refund.units[0].id,base={orderId:d.orderId,refundId:result.refund.id,unitIds:[unit],expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true as const},before=await checkpoint(db);
 for(const bad of [{...base,unitIds:[unit,unit]},{...base,unitIds:[d.items[0].unitIds[1]]},{...base,refundId:'asing'},{...base,reason:' '},{...base,sellable:false},{...base,groups:[{groupId:'g',revision:0,balance:2}]},{...base,expectedRefundRevision:3}])await expect(Promise.resolve().then(()=>returnRefundedStock(db,bad as typeof base,meta('bad',7),locks))).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
it('return yang melampaui integer aman ditolak tanpa mengubah refund atau stok',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=await paid(db),result=await refundServedUnits(db,refundInput(d),meta('refund',6),locks) as {refund:{id:string;units:{id:string}[]}}, {correctStockBaseline}=await import('./stock-groups');
 await correctStockBaseline(db,{groupId:'g',expectedRevision:1,expectedBalance:0,value:Number.MAX_SAFE_INTEGER,reason:'Hitung'},meta('adjust',7),locks,now);const before=await checkpoint(db);
 await expect(returnRefundedStock(db,{orderId:d.orderId,refundId:result.refund.id,unitIds:result.refund.units.map(u=>u.id),expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:2,balance:Number.MAX_SAFE_INTEGER}],reason:'Layak',sellable:true},meta('return',8),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
it('unit Rp0 dan settlement gratis tidak menghasilkan refund moneter',async()=>{for(const mode of ['mixed','free'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft(),first=d.items[0];first.unitIds=[first.unitIds[0]];first.skuPrice=0;if(mode==='mixed'){const second=structuredClone(first);second.id='00000000-0000-4000-8000-000000000008';second.unitIds=['00000000-0000-4000-8000-000000000009'];second.skuPrice=100;d.items.push(second);}
 const {input}=await setup(db,d);if(mode==='mixed')await payDraftCash(db,{...input,expectedSessionRevision:0,received:100},meta('pay',4),locks,now);else {const {settleDraftFree}=await import('./confirm-first-batch');await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'Gratis'},meta('pay',4),locks,now);}
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items.flatMap(i=>i.unitIds),reason:null},meta('serve',5),locks);const before=await checkpoint(db);await expect(refundServedUnits(db,refundInput(d),meta('refund',6),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}}});
