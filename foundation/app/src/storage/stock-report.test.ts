import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {BerrieDatabase} from './database';
import {createDraft} from './drafts';
import {planStoredDraftStock} from './draft-stock';
import {openCashSession} from './cash-sessions';
import {payDraftCash,confirmFirstBatch,settleDraftFree} from './confirm-first-batch';
import {cancelPaidUnits} from './paid-cancellations';
import {createStockGroup,correctStockBaseline,setStockMinimum,type StockMetadata} from './stock-groups';
import {registerSkuStockMapping} from './sku-stock-mappings';
import {checkpoint,stageSnapshot} from './recovery';
import {readInternalStockReport} from './stock-report';
import {exportStockReportCsv} from '../domain/stock-report-csv';
import type {LockProvider} from './commit';
const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number):StockMetadata & {storeTimeZone:string}=>({storeTimeZone:'Asia/Jakarta',operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z'});
const now=()=> '2026-11-01T01:00:00Z';
it('merekonsiliasi grup bersama, koreksi dan minimum tanpa menulis',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
 await createStockGroup(db,{groupId:'g',balance:10,minimum:3},meta('open',1),locks,now);
 await registerSkuStockMapping(db,{skuId:'a',groupId:'g'},meta('a',2),locks,now);await registerSkuStockMapping(db,{skuId:'b',groupId:'g'},meta('b',3),locks,now);
 await correctStockBaseline(db,{groupId:'g',value:3,reason:'hitung',expectedRevision:0,expectedBalance:10},meta('correction',4),locks,now);
 await setStockMinimum(db,{groupId:'g',value:4,expectedRevision:1,expectedBalance:3},meta('minimum',5),locks,now);
 const before=await checkpoint(db), report=await readInternalStockReport(db,'store');
 expect(report.status).toBe('complete');expect(report.groups).toEqual([{groupId:'g',revision:2,baseline:3,balance:3,minimum:4,condition:'Menipis',skuIds:['a','b']}]);
 expect(report.ledger.map(x=>[x.kind,x.before,x.delta,x.after])).toEqual([['opening',0,10,10],['correction',10,-7,3]]);
 expect(exportStockReportCsv(report).ledger).toContain(',-7,');expect(await checkpoint(db)).toEqual(before);await stageSnapshot(stage,before);expect(await readInternalStockReport(stage,'store')).toEqual(report);expect((await readInternalStockReport(db,'other')).groups).toEqual([]);
 } finally {await db.delete();await stage.delete();}});

const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}


it.each(['paid','unpaid','free'] as const)('debit %s sekali dan return berjejak',async mode=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const d=draft();if(mode==='free')d.items[0].skuPrice=0;const {input}=await setup(db,d);
 expect((await readInternalStockReport(db,'store')).groups[0].balance).toBe(2);
 if(mode==='paid')await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 if(mode==='unpaid')await confirmFirstBatch(db,input,meta('pay',4),locks,now);
 if(mode==='free')await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'hadiah'},meta('pay',4),locks,now);
 let report=await readInternalStockReport(db,'store');expect(report.groups[0].balance).toBe(0);expect(report.ledger[1]).toMatchObject({kind:'debit',delta:-2,unitIds:d.items[0].unitIds});
 if(mode==='paid') {await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('cancel',5),locks);report=await readInternalStockReport(db,'store');expect(report.ledger[2]).toMatchObject({kind:'return',delta:1,before:0,after:1,unitIds:[d.items[0].unitIds[0]]});}
 }finally {await db.delete();}});
it('menahan ekspor sumber generik dan menolak checkpoint rusak',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {commitChange}=await import('./commit');await commitChange(db,{operationId:'legacy',storeId:'store',deviceId:'legacy',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'old-stock',actorId:'actor',policyVersion:1,payload:{},state:[{key:'stock:old',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'audit',operationId:'legacy',value:{}}],outbox:{id:'outbox',operationId:'legacy',value:{}},result:{}},locks);
 const report=await readInternalStockReport(db,'store');expect(report.status).toBe('incomplete');expect(()=>exportStockReportCsv(report)).toThrow('Ekspor ditahan');expect((await readInternalStockReport(db,'other')).status).toBe('complete');await db.state.delete('stock:old');await expect(readInternalStockReport(db,'store')).rejects.toThrow('Checkpoint');
 }finally{await db.delete();}});
it('return unpaid menyusul per unit dan replay tidak menggandakan saldo',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelUnpaidFirstBatch,returnUnpaidStock}=await import('./unpaid-cancellations');const {d,input}=await setup(db);await confirmFirstBatch(db,input,meta('batch',4),locks,now);
 await cancelUnpaidFirstBatch(db,{orderId:d.orderId,expectedBatchRevision:0,expectedServingRevision:null,expectedSessionRevision:0,reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks);
 const ret={orderId:d.orderId,expectedBatchRevision:0,expectedServingRevision:0,expectedCancellationRevision:0,expectedReturnRevision:null,expectedSessionRevision:0,unitIds:[d.items[0].unitIds[0]],groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true as const};await returnUnpaidStock(db,ret,meta('return',6),locks);const before=await checkpoint(db);await returnUnpaidStock(db,ret,meta('return',6),locks);expect(await checkpoint(db)).toEqual(before);
 const report=await readInternalStockReport(db,'store');expect(report.ledger.map(e=>e.delta)).toEqual([2,-2,1]);expect(report.ledger[2].unitIds).toEqual(ret.unitIds);expect(report.groups[0].balance).toBe(1);
 }finally{await db.delete();}});
it('return gratis menyusul dan menyimpan referensi pembatalan',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {cancelFreeUnits,returnFreeStock}=await import('./free-cancellations');const d=draft();d.items[0].skuPrice=0;const {input}=await setup(db,d);await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'Hadiah'},meta('free',4),locks,now);
 const result=await cancelFreeUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:null},meta('cancel',5),locks) as {cancellation:{id:string;unitIds:string[]}};
 await returnFreeStock(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedReturnRevision:null,expectedSessionRevision:0,cancellationId:result.cancellation.id,unitIds:result.cancellation.unitIds,groups:[{groupId:'g',revision:1,balance:0}],reason:'Layak',sellable:true},meta('return',6),locks);
 const report=await readInternalStockReport(db,'store');expect(report.ledger.map(e=>e.delta)).toEqual([2,-2,1]);expect(report.ledger[2]).toMatchObject({cancellationId:result.cancellation.id,unitIds:result.cancellation.unitIds});
 }finally{await db.delete();}});
it('return served pada sesi berikutnya tetap direkonsiliasi ke grup asal',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{serveUnits}=await import('./serving'),{refundServedUnits}=await import('./served-refunds');const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',5),locks);
 await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:1,expectedCountRevision:null,amount:27500},meta('count',6),locks);await changeCashCount(db,'close',{sessionId:d.cashSessionId,expectedSessionRevision:2,expectedCountRevision:0},meta('close',7),locks);
 const current='22222222-2222-4222-8222-222222222222';await openCashSession(db,{sessionId:current,number:'2',initialCustodian:'actor',openingAmount:30000,timeZone:'Asia/Jakarta'},meta('next',8),locks);
 await refundServedUnits(db,{orderId:d.orderId,expectedRefundRevision:null,expectedServingRevision:0,expectedCorrectionRevision:null,expectedSessionRevision:0,selection:[{itemId:d.items[0].id,quantity:1}],method:'cash',reason:'Rusak',moneyReturned:true,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]},sourceSessionId:d.cashSessionId,expectedSourceRevision:3,executionSessionId:current},meta('refund',9),locks);
 const report=await readInternalStockReport(db,'store');expect(report.ledger.map(e=>e.delta)).toEqual([2,-2,1]);expect(report.ledger[2]).toMatchObject({kind:'return',orderId:d.orderId,refundId:'refund:refund',groupId:'g',unitIds:[d.items[0].unitIds[0]]});
 }finally{await db.delete();}});
it('batas integer aman tetap numerik dan input overflow ditolak tanpa mengubah laporan',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 await createStockGroup(db,{groupId:'g',balance:Number.MAX_SAFE_INTEGER},meta('open',1),locks,now);const before=await readInternalStockReport(db,'store');expect(before.ledger[0].delta).toBe(Number.MAX_SAFE_INTEGER);expect(()=>correctStockBaseline(db,{groupId:'g',value:Number.MAX_SAFE_INTEGER+1,reason:'hitung',expectedRevision:0,expectedBalance:Number.MAX_SAFE_INTEGER},meta('bad',2),locks,now)).toThrow();expect(await readInternalStockReport(db,'store')).toEqual(before);
 }finally{await db.delete();}});

function parseCsv(text:string):string[][] {
 expect(text.startsWith('\ufeff')).toBe(true);const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=1;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\r'&&text[i+1]==='\n'){row.push(cell);rows.push(row);row=[];cell='';i++;}else cell+=ch;}
 expect(quoted).toBe(false);return rows;
}
it('baris CSV cocok ID dan total delta laporan',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{await createStockGroup(db,{groupId:'g',balance:10},meta('open',1),locks,now);await correctStockBaseline(db,{groupId:'g',value:3,reason:'hitung',expectedRevision:0,expectedBalance:10},meta('correct',2),locks,now);const report=await readInternalStockReport(db,'store'),files=exportStockReportCsv(report),balances=parseCsv(files.balances),ledger=parseCsv(files.ledger),bh=balances.findIndex(r=>r[0]==='group_id'),lh=ledger.findIndex(r=>r[0]==='ledger_id');expect(balances[bh+1][0]).toBe(report.groups[0].groupId);expect(Number(balances[bh+1][3])).toBe(report.groups[0].balance);expect(ledger.slice(lh+1).map(r=>r[0])).toEqual(report.ledger.map(e=>e.ledgerId));expect(ledger.slice(lh+1).reduce((sum,r)=>sum+Number(r[15]),0)).toBe(report.groups[0].balance);for(const rows of [balances,ledger])expect(rows.find(r=>r[0]==='checkpoint_boundary_json')?.[1]).toBe(JSON.stringify(report.checkpoint.boundary));}finally{await db.delete();}});
it('dua SKU berbagi satu saldo dan debit satu ledger grup',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft(),first=d.items[0];first.unitIds=[first.unitIds[0]];const second={...first,id:'00000000-0000-4000-8000-000000000010',skuId:'00000000-0000-4000-8000-000000000011',unitIds:['00000000-0000-4000-8000-000000000012']};d.items.push(second);
 await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:first.skuId,groupId:'g'},meta('map1',2),locks,now);await registerSkuStockMapping(db,{skuId:second.skuId,groupId:'g'},meta('map2',3),locks,now);await createDraft(db,d,meta('draft',4),locks,now);const {sources}=await planStoredDraftStock(db,'store',d.orderId);await confirmFirstBatch(db,{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups},meta('batch',5),locks,now);
 const report=await readInternalStockReport(db,'store');expect(report.groups).toHaveLength(1);expect(report.groups[0]).toMatchObject({balance:0,condition:'Habis',skuIds:[first.skuId,second.skuId]});expect(report.ledger[1]).toMatchObject({delta:-2,unitIds:[first.unitIds[0],second.unitIds[0]]});
 }finally{await db.delete();}});
