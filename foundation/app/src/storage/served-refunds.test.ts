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

it('return sesudah hitungan dibatalkan mengikat revisi sesi baru dan tetap dapat direkonstruksi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count');const d=await paid(db),result=await refundServedUnits(db,refundInput(d),meta('refund',6),locks) as {refund:{id:string;units:{id:string}[]}};
 await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:2,expectedCountRevision:null,amount:13750},meta('count',7),locks);
 const data={orderId:d.orderId,refundId:result.refund.id,unitIds:result.refund.units.map(u=>u.id),expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak jual',sellable:true as const};
 await expect(returnRefundedStock(db,data,meta('return',8),locks)).rejects.toThrow();
 await changeCashCount(db,'cancel',{sessionId:d.cashSessionId,expectedSessionRevision:3,expectedCountRevision:0},meta('cancel-count',8),locks);
 await returnRefundedStock(db,data,meta('return',9),locks);const snap=await checkpoint(db),receipt=JSON.parse(snap.receipts.find(r=>r.id==='return')!.payload);expect(receipt.payload).toMatchObject({contractVersion:2,sessionSource:{id:d.cashSessionId,revision:4}});await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 }finally{await db.delete();await stage.delete();}});

it('sesi tertutup: penyesuaian berantai, refund bertahap dan return mempertahankan snapshot asal',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{adjustClosedPaymentMethod,readEffectivePayment}=await import('./payment-correction');
 const d=await paid(db),origin=d.cashSessionId,current='22222222-2222-4222-8222-222222222222';
 await changeCashCount(db,'save',{sessionId:origin,expectedSessionRevision:1,expectedCountRevision:null,amount:27500},meta('count',6),locks);
 await changeCashCount(db,'close',{sessionId:origin,expectedSessionRevision:2,expectedCountRevision:0},meta('close',7),locks);
 const closed=await checkpoint(db),old=closed.state.filter(r=>r.key===`cash-session:${origin}` || r.key===`cash-count:${origin}` || /^(payment|settlement|first-batch|serving|customer-job|kitchen-job):/.test(r.key));
 await openCashSession(db,{sessionId:current,number:'2',initialCustodian:'actor',openingAmount:50000,timeZone:'Asia/Jakarta'},meta('next',8),locks);
 const adjustment={orderId:d.orderId,expectedRevision:null,sourceSessionId:origin,expectedSourceRevision:3,executionSessionId:current,expectedSessionRevision:0,method:'qris' as const,reason:'Salah metode',evidenceReference:'Bukti 1'};
 await adjustClosedPaymentMethod(db,adjustment,meta('adjust',9),locks);
 expect(await readCashBalance(db,'store',current)).toBe(22500);
 const data={...refundInput(d),sourceSessionId:origin,expectedSourceRevision:3,executionSessionId:current,expectedCorrectionRevision:0,expectedSessionRevision:1,returnStock:{reason:'Layak',sellable:true as const,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}};
 const first=await refundServedUnits(db,data,meta('refund-next',10),locks) as {refund:{id:string;units:{id:string}[];method:string}};
 expect(first.refund.method).toBe('qris');expect(await readCashBalance(db,'store',current)).toBe(22500);
 await adjustClosedPaymentMethod(db,{...adjustment,expectedRevision:0,expectedSessionRevision:2,method:'cash',evidenceReference:'Bukti 2'},meta('adjust2',11),locks);
 expect((await readEffectivePayment(db,'store',d.orderId)).method).toBe('cash');
 const second=await refundServedUnits(db,{...data,expectedRefundRevision:0,expectedCorrectionRevision:1,expectedSessionRevision:3,returnStock:null},meta('refund-next2',12),locks) as {refund:{id:string;units:{id:string}[];method:string}};
 expect(second.refund.method).toBe('cash');expect(await readCashBalance(db,'store',current)).toBe(36250);
 await returnRefundedStock(db,{orderId:d.orderId,refundId:second.refund.id,unitIds:second.refund.units.map(u=>u.id),expectedRefundRevision:1,expectedReturnRevision:0,groups:[{groupId:'g',revision:2,balance:1}],reason:'Layak',sellable:true,sourceSessionId:origin,expectedSourceRevision:3,executionSessionId:current,expectedSessionRevision:4},meta('return-next',13),locks);
 const snap=await checkpoint(db);expect(snap.state.filter(r=>old.some(x=>x.key===r.key))).toEqual(old);await stageSnapshot(stage,snap);expect(await checkpoint(stage)).toEqual(snap);
 expect(await refundServedUnits(db,data,meta('refund-next',10),locks)).toEqual(expect.objectContaining({refund:first.refund}));
 }finally{await db.delete();await stage.delete();}});

async function closedQris(db:BerrieDatabase) {
 const {d,input}=await setup(db),{setPaymentMethods}=await import('./payment-methods'),{payDraftNoncash}=await import('./confirm-first-batch'),{changeCashCount}=await import('./cash-count');
 await setPaymentMethods(db,{expectedRevision:null,qris:true,transfer:true,ewallet:true},meta('methods',4),locks);
 await payDraftNoncash(db,{...input,expectedSessionRevision:0,expectedMethodsRevision:0,method:'qris',verified:true},meta('pay',5),locks,now);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',6),locks);
 await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:0,expectedCountRevision:null,amount:0},meta('count',7),locks);
 await changeCashCount(db,'close',{sessionId:d.cashSessionId,expectedSessionRevision:1,expectedCountRevision:0},meta('close',8),locks);
 const current='22222222-2222-4222-8222-222222222222';
 await openCashSession(db,{sessionId:current,number:'2',initialCustodian:'actor',openingAmount:30000,timeZone:'Asia/Jakarta'},meta('next',9),locks);
 const inputRefund={...refundInput(d),sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:0,method:'cash' as const};
 return {d,current,inputRefund};
}
it('QRIS sesi A direfund tunai pada B; guard, replay dan snapshot tetap',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current,inputRefund}=await closedQris(db),before=await checkpoint(db),m=meta('refund-next',10);
 for(const bad of [{...inputRefund,expectedSourceRevision:1},{...inputRefund,expectedSessionRevision:1},{...inputRefund,sourceSessionId:current},{...inputRefund,selection:[{itemId:d.items[0].id,quantity:3}]},{...inputRefund,executionSessionId:d.cashSessionId}]) await expect(refundServedUnits(db,bad,m,locks)).rejects.toThrow();
 await expect(refundServedUnits(db,inputRefund,{...m,storeId:'foreign'},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 const result=await refundServedUnits(db,inputRefund,m,locks);expect(result).toMatchObject({refund:{amount:13750,method:'cash',cashSessionId:current},balance:16250});
 db.close();await db.open();expect(await refundServedUnits(db,inputRefund,m,locks)).toEqual(result);
 await expect(refundServedUnits(db,{...inputRefund,method:'qris'},m,locks)).rejects.toThrow('Konflik');
 const next={...inputRefund,expectedRefundRevision:0,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}]};await expect(refundServedUnits(db,next,meta('again',11),locks)).rejects.toThrow();
 const after=await checkpoint(db);expect(after.state.filter(r=>r.key===`cash-session:${d.cashSessionId}` || r.key===`cash-count:${d.cashSessionId}`)).toEqual(before.state.filter(r=>r.key===`cash-session:${d.cashSessionId}` || r.key===`cash-count:${d.cashSessionId}`));
 const {changeCashCount}=await import('./cash-count');await changeCashCount(db,'save',{sessionId:current,expectedSessionRevision:1,expectedCountRevision:null,amount:16250},meta('count-b',11),locks);await changeCashCount(db,'close',{sessionId:current,expectedSessionRevision:2,expectedCountRevision:0},meta('close-b',12),locks);expect(await refundServedUnits(db,inputRefund,m,locks)).toEqual(result);await expect(refundServedUnits(db,{...inputRefund,method:'qris'},m,locks)).rejects.toThrow('Konflik');
 const closedB=await checkpoint(db);await expect(refundServedUnits(db,{...inputRefund,expectedRefundRevision:0,expectedSessionRevision:3},meta('closed-b',13),locks)).rejects.toThrow();
 const third='33333333-3333-4333-8333-333333333333';await openCashSession(db,{sessionId:third,number:'3',initialCustodian:'actor',openingAmount:10,timeZone:'Asia/Jakarta'},meta('third',13),locks);
 const final=await refundServedUnits(db,{...inputRefund,expectedRefundRevision:0,executionSessionId:third,expectedSessionRevision:0,method:null},meta('third-refund',14),locks);expect(final).toMatchObject({refund:{method:'qris',amount:13750,cashSessionId:third},balance:10});
 const finalSnapshot=await checkpoint(db);expect(finalSnapshot.state.filter(r=>r.key===`cash-session:${current}` || r.key===`cash-count:${current}`)).toEqual(closedB.state.filter(r=>r.key===`cash-session:${current}` || r.key===`cash-count:${current}`));
 }finally{await db.delete();}});
it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('transaksi lintas sesi rollback %s',async table=>{for(const action of ['refund','adjust'] as const){const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current,inputRefund}=await closedQris(db),{adjustClosedPaymentMethod}=await import('./payment-correction'),before=await checkpoint(db),hook=()=>{throw new Error('injected')};
 const adjust={orderId:d.orderId,expectedRevision:null,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:0,method:'cash' as const,reason:'Salah',evidenceReference:'Bukti'};
 const run=()=>action==='refund'?refundServedUnits(db,{...inputRefund,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('run',10),locks):adjustClosedPaymentMethod(db,adjust,meta('run',10),locks);
 db[table].hook('creating',hook);db[table].hook('updating',hook);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const result=await run();expect(await run()).toEqual(result);
 }finally{await db.delete();}}});
it('penyesuaian lintas sesi menolak bukti kosong, saldo tidak cukup, revisi dan hitungan aktif',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current,inputRefund}=await closedQris(db),{adjustClosedPaymentMethod}=await import('./payment-correction'),{changeCashCount}=await import('./cash-count');
 await moveCash(db,{sessionId:current,expectedRevision:0,kind:'out',amount:5000,category:'ambil',description:'nyata'},meta('out-next',10),locks);
 const base={orderId:d.orderId,expectedRevision:null,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:1,method:'cash' as const,reason:'Koreksi',evidenceReference:'Bukti'},before=await checkpoint(db);
 for(const bad of [{...base,evidenceReference:' '},{...base,expectedSourceRevision:1},{...base,sourceSessionId:current},{...base,expectedSessionRevision:0},{...base,method:'qris' as const}]) await expect(adjustClosedPaymentMethod(db,bad,meta('bad',10),locks)).rejects.toThrow();
 await expect(refundServedUnits(db,{...inputRefund,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:2}]},meta('short',11),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 await changeCashCount(db,'save',{sessionId:current,expectedSessionRevision:1,expectedCountRevision:null,amount:25000},meta('count-next',11),locks);
 await expect(adjustClosedPaymentMethod(db,{...base,expectedSessionRevision:2},meta('blocked',12),locks)).rejects.toThrow();await expect(refundServedUnits(db,{...inputRefund,expectedSessionRevision:2},meta('blocked',12),locks)).rejects.toThrow();
 }finally{await db.delete();}});

it('semua arah reklasifikasi berantai memakai delta tunai dan tanpa penjualan baru',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current}=await closedQris(db),{adjustClosedPaymentMethod}=await import('./payment-correction');let effective:'cash'|'qris'|'transfer'|'ewallet'='qris',revision:number|null=null,sessionRevision=0,seq=10;
 const methods=['cash','qris','transfer','ewallet'] as const;
 for(const from of methods) for(const to of methods) {if(from===to)continue;for(const target of [from,to]) {if(target===effective)continue;
  await adjustClosedPaymentMethod(db,{orderId:d.orderId,expectedRevision:revision,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:sessionRevision,method:target,reason:'Koreksi',evidenceReference:`Bukti ${seq}`},meta(`adjust-${seq}`,seq),locks);
  effective=target;revision=(revision??-1)+1;sessionRevision++;seq++;expect(await readCashBalance(db,'store',current)).toBe(30000+(effective==='cash'?27500:0));
 }}
 const snap=await checkpoint(db);expect(snap.state.filter(r=>r.key.startsWith('payment:'))).toHaveLength(1);expect(snap.ledger.filter(r=>(r.value as {kind?:string}).kind==='method-adjustment')).toHaveLength(sessionRevision);
 }finally{await db.delete();}});
it('penyesuaian tunai yang melampaui integer aman ditolak atomik',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current}=await closedQris(db),{adjustClosedPaymentMethod}=await import('./payment-correction');await moveCash(db,{sessionId:current,expectedRevision:0,kind:'in',amount:Number.MAX_SAFE_INTEGER-30000,category:'modal',description:'nyata'},meta('max',10),locks);const before=await checkpoint(db);
 await expect(adjustClosedPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:1,method:'cash',reason:'Koreksi',evidenceReference:'Bukti'},meta('overflow',11),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
it.each(['origin','execution','amount','unit','ledger','snapshot'] as const)('staging menolak manipulasi pasca tutup: %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,inputRefund}=await closedQris(db);await refundServedUnits(db,inputRefund,meta('refund-next',10),locks);const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='refund-next')!,change=JSON.parse(receipt.payload);
 if(field==='origin')change.payload.sourceSession.revision--;
 if(field==='execution')change.payload.sessionSource.id=d.cashSessionId;
 if(field==='amount')change.state.find((r:{key:string})=>r.key.startsWith('served-refunds:')).value.refunds[0].units[0].amount++;
 if(field==='unit')change.state.find((r:{key:string})=>r.key.startsWith('served-refunds:')).value.refunds[0].units[0].id='alien';
 if(field==='ledger'){change.ledger[0].value.refund.amount++;bad.ledger.find(r=>r.id===change.ledger[0].id)!.value=change.ledger[0].value;}
 if(field==='snapshot'){const count=bad.state.find(r=>r.key===`cash-count:${d.cashSessionId}`)!;(count.value as {history:{events:{expected?:number}[]}}).history.events.at(-1)!.expected=1;}
 for(const row of change.state){const state=bad.state.find(r=>r.key===row.key);if(state)state.value=row.value;}receipt.payload=canonical(change);
 await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});

it.each(['sequences','state','ledger','audit','outbox','receipts'] as const)('return susulan lintas sesi rollback %s',async table=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current,inputRefund}=await closedQris(db),first=await refundServedUnits(db,inputRefund,meta('first',10),locks) as {refund:{id:string;units:{id:string}[]}},before=await checkpoint(db),input={orderId:d.orderId,refundId:first.refund.id,unitIds:first.refund.units.map(u=>u.id),expectedRefundRevision:0,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true as const,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:1},hook=()=>{throw new Error('injected')};
 db[table].hook('creating',hook);db[table].hook('updating',hook);const run=()=>returnRefundedStock(db,input,meta('return',11),locks);await expect(run()).rejects.toThrow('injected');db[table].hook('creating').unsubscribe(hook);db[table].hook('updating').unsubscribe(hook);expect(await checkpoint(db)).toEqual(before);const result=await run();expect(await run()).toEqual(result);
 }finally{await db.delete();}});
it.each(['source','execution','legs','evidence','history'] as const)('staging menolak penyesuaian yang dimanipulasi: %s',async field=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,current}=await closedQris(db),{adjustClosedPaymentMethod}=await import('./payment-correction');await adjustClosedPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,sourceSessionId:d.cashSessionId,expectedSourceRevision:2,executionSessionId:current,expectedSessionRevision:0,method:'cash',reason:'Koreksi',evidenceReference:'Bukti'},meta('adjust',10),locks);const good=await checkpoint(db),bad=structuredClone(good),receipt=bad.receipts.find(r=>r.id==='adjust')!,c=JSON.parse(receipt.payload);
 if(field==='source')c.payload.sourceSession.revision--;
 if(field==='execution')c.payload.sessionSource.id=d.cashSessionId;
 if(field==='legs'){c.ledger[0].value.legs[0].delta++;bad.ledger.find(r=>r.id===c.ledger[0].id)!.value=c.ledger[0].value;}
 if(field==='evidence')c.payload.data.evidenceReference='';
 if(field==='history')c.state.find((r:{key:string})=>r.key.startsWith('payment-corrections:')).value.corrections[0].from='transfer';
 for(const row of c.state){const state=bad.state.find(r=>r.key===row.key);if(state)state.value=row.value;}receipt.payload=canonical(c);await expect(stageSnapshot(stage,bad)).rejects.toThrow();expect((await checkpoint(stage)).state).toEqual([]);expect(await checkpoint(db)).toEqual(good);
 }finally{await db.delete();await stage.delete();}});
