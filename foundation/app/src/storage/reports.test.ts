import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { createDraft } from './drafts';
import { createStockGroup } from './stock-groups';
import { registerSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';
import { checkpoint, stageSnapshot } from './recovery';
import { type LockProvider } from './commit';
import { openCashSession } from './cash-sessions';

const locks:LockProvider={request:async(_n,fn)=>fn()};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:'Kopi',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
async function setup(db:BerrieDatabase, d=draft()) {
await openCashSession(db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},{...meta('fixture-cash',1),deviceId:'cash-device'},locks);await createStockGroup(db,{groupId:'g',balance:2},meta('open',1),locks,now);await registerSkuStockMapping(db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',2),locks,now);await createDraft(db,d,meta('draft',3),locks,now);
 const {sources}=await planStoredDraftStock(db,'store',d.orderId);
 return {d,input:{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups}};
}

import { readInternalSalesReports } from './reports';
import { readInternalCashReport } from './cash-report';
import { exportSalesReportCsv } from '../domain/sales-report-csv';
import { exportCashReportCsv } from '../domain/cash-report-csv';
import { payDraftCash, settleDraftFree } from './confirm-first-batch';
import { cancelPaidUnits, refundCancelledUnits } from './paid-cancellations';

it('reads settlement and refund from one unchanged checkpoint, including staging',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);const payment={...input,expectedSessionRevision:0,received:50000};await payDraftCash(db,payment,meta('pay',4),locks,now);const saved=await checkpoint(db);await payDraftCash(db,payment,meta('pay',4),locks,now);expect(await checkpoint(db)).toEqual(saved);
 await cancelPaidUnits(db,{orderId:d.orderId,expectedServingRevision:null,expectedCancellationRevision:null,expectedRefundRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],reason:'Batal',kitchenConfirmed:true,returnStock:{reason:'Layak',sellable:true,expectedReturnRevision:null,groups:[{groupId:'g',revision:1,balance:0}]}},meta('cancel',5),locks);
 const filter={kind:'session' as const,sessionId:d.cashSessionId};const beforeRefund=await readInternalSalesReports(db,'store',filter);expect(beforeRefund.report?.totals).toMatchObject({gross:27500,refund:0,netReceipts:27500,paymentCount:1});
 await refundCancelledUnits(db,{orderId:d.orderId,expectedServingRevision:0,expectedCancellationRevision:0,expectedRefundRevision:null,expectedCorrectionRevision:null,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:null,reason:'Kembali',moneyReturned:true,returnStock:null},{...meta('refund',6),recordedAt:'2026-11-02T00:00:00Z'},locks);
 const later=await readInternalSalesReports(db,'store',{kind:'calendar',start:'2026-11-02',end:'2026-11-03',zone:'Asia/Jakarta'});expect(later.report?.totals).toMatchObject({paymentCount:0,refund:13750,netReceipts:-13750});expect(later.report?.skuByValue[0]).toMatchObject({sold:0,refunded:1,net:-1});
 const before=await checkpoint(db),result=await readInternalSalesReports(db,'store',filter);
 expect(result.report?.daily.map(d=>[d.date,d.totals.netReceipts])).toEqual([['2026-11-01',27500],['2026-11-02',-13750]]);
 const files=exportSalesReportCsv(result);const eventRows=parseCsv(files.events),eventHeader=eventRows.find(r=>r[0]==='jenis')!,refundRow=eventRows.find(r=>r[0]==='refund')!;expect(refundRow[eventHeader.indexOf('unit_id')]).toBe(d.items[0].unitIds[0]);expect(refundRow[eventHeader.indexOf('refund_id')]).toBe(result.report!.details.refunds[0].source.refundId);expect(Number(refundRow[eventHeader.indexOf('jumlah_idr')])).toBe(result.report!.totals.refund);expect(files.daily).toContain('2026-11-02');expect(files.summary).toContain('13750');expect(result.report?.totals).toMatchObject({gross:27500,refund:13750,netReceipts:13750});expect(result.report?.skuByValue[0]).toMatchObject({sold:2,refunded:1,net:1,netBase:13750});expect(await checkpoint(db)).toEqual(before);await stageSnapshot(stage,before);expect(await readInternalSalesReports(stage,'store',filter)).toEqual(result);
 }finally{await db.delete();await stage.delete();}});

it('handles empty and free settlement and validates filters',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();d.items[0].skuPrice=0;const {input}=await setup(db,d);const filter={kind:'calendar' as const,start:'2026-11-01',end:'2026-11-02',zone:'Asia/Jakarta'};expect((await readInternalSalesReports(db,'store',filter)).report?.totals.paymentCount).toBe(0);await settleDraftFree(db,{...input,expectedSessionRevision:0,reason:'Hadiah'},meta('free',4),locks,now);expect((await readInternalSalesReports(db,'store',filter)).report?.totals.freeSettlements).toBe(1);await expect(readInternalSalesReports(db,'store',{...filter,end:filter.start})).rejects.toThrow();await expect(readInternalSalesReports(db,'store',{...filter,zone:'invalid'})).rejects.toThrow();}finally{await db.delete();}});

it('keeps closed session classification and attributes later adjustment and refund to execution session',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {changeCashCount}=await import('./cash-count'),{serveUnits}=await import('./serving'),{adjustClosedPaymentMethod,correctPaymentMethod}=await import('./payment-correction'),{refundServedUnits}=await import('./served-refunds');
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:1,method:'qris',reason:'Salah'},meta('correct',5),locks);
 await serveUnits(db,{orderId:d.orderId,expectedRevision:null,unitIds:d.items[0].unitIds,reason:null},meta('serve',6),locks);
 await changeCashCount(db,'save',{sessionId:d.cashSessionId,expectedSessionRevision:2,expectedCountRevision:null,amount:0},meta('count',7),locks);
 await changeCashCount(db,'close',{sessionId:d.cashSessionId,expectedSessionRevision:3,expectedCountRevision:0},meta('close',8),locks);
 const current='22222222-2222-4222-8222-222222222222',originFilter={kind:'session' as const,sessionId:d.cashSessionId},old=await readInternalSalesReports(db,'store',originFilter),closed=await checkpoint(db);
 await openCashSession(db,{sessionId:current,number:'2',initialCustodian:'actor',openingAmount:30000,timeZone:'Asia/Jakarta'},meta('next',9),locks);
 await adjustClosedPaymentMethod(db,{orderId:d.orderId,expectedRevision:0,sourceSessionId:d.cashSessionId,expectedSourceRevision:4,executionSessionId:current,expectedSessionRevision:0,method:'cash',reason:'Koreksi',evidenceReference:'Bukti'},meta('adjust',10),locks);
 await refundServedUnits(db,{orderId:d.orderId,expectedRefundRevision:null,expectedServingRevision:0,expectedCorrectionRevision:1,expectedSessionRevision:1,selection:[{itemId:d.items[0].id,quantity:1}],method:'cash',reason:'Rusak',moneyReturned:true,returnStock:null,sourceSessionId:d.cashSessionId,expectedSourceRevision:4,executionSessionId:current},meta('refund',11),locks);
 const oldCash=await readInternalCashReport(db,'store',d.cashSessionId),newCash=await readInternalCashReport(db,'store',current);expect(oldCash.report.summary).toMatchObject({sales:27500,methodCorrection:-27500,expected:0,closingCount:0});expect(newCash.report.summary).toMatchObject({opening:30000,administrativeAdjustment:27500,refunds:13750,expected:43750});expect(newCash.report.ledger).toHaveLength(3);expect(newCash.report.ledger[1]).toMatchObject({paymentId:expect.any(String),originSessionId:d.cashSessionId});expect(newCash.report.ledger[2]).toMatchObject({paymentId:expect.any(String),refundId:expect.any(String)});expect(exportCashReportCsv(newCash).ledger).toContain(newCash.report.ledger[2].refundId!);
 const after=await readInternalSalesReports(db,'store',originFilter),currentReport=await readInternalSalesReports(db,'store',{kind:'session',sessionId:current});expect(after.report).toEqual(old.report);expect(currentReport.report?.totals).toMatchObject({bill:0,refund:13750,netReceipts:-13750});expect(currentReport.report?.methods.find(x=>x.method==='cash')).toMatchObject({adjustment:27500,refunds:13750});const currentRows=parseCsv(exportSalesReportCsv(currentReport).events),adjustment=currentRows.find(r=>r[0]==='penyesuaian')!,eventHeader=currentRows.find(r=>r[0]==='jenis')!;expect(adjustment[eventHeader.indexOf('sesi_id')]).toBe(current);expect(Number(adjustment[eventHeader.indexOf('jumlah_idr')])).toBe(27500);expect((await checkpoint(db)).state.filter(r=>r.key===`cash-session:${d.cashSessionId}`||r.key===`cash-count:${d.cashSessionId}`)).toEqual(closed.state.filter(r=>r.key===`cash-session:${d.cashSessionId}`||r.key===`cash-count:${d.cashSessionId}`));
 }finally{await db.delete();}});

it('uses settlement time in store zone, not draft time; rejects mixed and invalid filters',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},{...meta('pay',4),recordedAt:'2026-11-01T17:00:00Z'},locks,now);
 const day=(start:string,end:string)=>readInternalSalesReports(db,'store',{kind:'calendar',start,end,zone:'Asia/Jakarta'});
 expect((await day('2026-11-01','2026-11-02')).report?.totals.paymentCount).toBe(0);expect((await day('2026-11-02','2026-11-03')).report?.totals.paymentCount).toBe(1);expect((await readInternalSalesReports(db,'store',{kind:'session',sessionId:d.cashSessionId})).report?.totals.paymentCount).toBe(1);
 await expect(readInternalSalesReports(db,'store',{kind:'session',sessionId:d.cashSessionId,start:'2026-11-01'} as never)).rejects.toThrow();await expect(day('2026-11-03','2026-11-02')).rejects.toThrow();
 }finally{await db.delete();}});

it('marks generic data incomplete, isolates stores, and rejects corrupt checkpoint',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {commitChange}=await import('./commit');await commitChange(db,{operationId:'legacy',storeId:'store',deviceId:'legacy',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'unknown',actorId:'actor',policyVersion:1,payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'audit',operationId:'legacy',value:{}}],outbox:{id:'outbox',operationId:'legacy',value:{}},result:{}},locks);
 const filter={kind:'calendar' as const,start:'2026-11-01',end:'2026-11-02',zone:'Asia/Jakarta'};expect(await readInternalSalesReports(db,'store',filter)).toMatchObject({status:'incomplete',report:null,incomplete:[{key:'order:unknown'}]});expect((await readInternalSalesReports(db,'other',filter)).status).toBe('complete');await db.state.delete('order:unknown');await expect(readInternalSalesReports(db,'store',filter)).rejects.toThrow();
 }finally{await db.delete();}});

it('platform draft is explicitly incomplete',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{const d=draft();d.channel='gofood';d.channelAccountId='00000000-0000-4000-8000-000000000010';d.externalOrderId='platform';await setup(db,d);const result=await readInternalSalesReports(db,'store',{kind:'session',sessionId:d.cashSessionId});expect(()=>exportSalesReportCsv(result)).toThrow();expect(result).toMatchObject({status:'incomplete',report:null,incomplete:[{key:`draft:${d.orderId}`} ]});const cash=await readInternalCashReport(db,'store',d.cashSessionId);expect(cash.status).toBe('incomplete');expect(()=>exportCashReportCsv(cash)).toThrow();}finally{await db.delete();}});

it('applies a chain of corrections without changing sales or duplicating classification',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const {correctPaymentMethod}=await import('./payment-correction'),{d,input}=await setup(db);await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},meta('pay',4),locks,now);
 await correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:null,expectedSessionRevision:1,method:'qris',reason:'Salah'},meta('one',5),locks);
 await correctPaymentMethod(db,{orderId:d.orderId,expectedRevision:0,expectedSessionRevision:2,method:'transfer',reason:'Salah lagi'},meta('two',6),locks);
 const cash=await readInternalCashReport(db,'store',d.cashSessionId);expect(cash.report.summary).toMatchObject({sales:27500,methodCorrection:-27500,expected:0});expect(cash.report.ledger).toHaveLength(4);
 const result=await readInternalSalesReports(db,'store',{kind:'session',sessionId:d.cashSessionId});expect(result.report?.totals).toMatchObject({bill:27500,netReceipts:27500,paymentCount:1});expect(result.report?.methods.map(x=>x.net)).toEqual([0,0,27500,0]);expect(result.report?.details.classifications).toHaveLength(2);
 }finally{await db.delete();}});

// Parse quoted CSV, including embedded newlines, rather than relying on substring matching.
function parseCsv(text:string):string[][] {
 expect(text.startsWith('\ufeff')).toBe(true);const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=1;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\r'&&text[i+1]==='\n'){row.push(cell);rows.push(row);row=[];cell='';i++;}else cell+=ch;}
 expect(quoted).toBe(false);return rows;
}
it('exports parsed rows from one checkpoint, preserving historical names and reconciling days',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try{
 const d=draft();d.items[0].name=' \t=Kopi, "lama"\nbaris';const {input}=await setup(db,d);
 await payDraftCash(db,{...input,expectedSessionRevision:0,received:50000},{...meta('pay',4),recordedAt:'2026-11-01T17:00:00Z'},locks,now);
 const before=await checkpoint(db),result=await readInternalSalesReports(db,'store',{kind:'calendar',start:'2026-11-01',end:'2026-11-03',zone:'Asia/Jakarta'}),files=exportSalesReportCsv(result),report=result.report!;
 for(const file of Object.values(files)){const rows=parseCsv(file);expect(rows.find(r=>r[0]==='checkpoint_boundary_json')?.[1]).toEqual(JSON.stringify(result.checkpoint.boundary));}
 const day=parseCsv(files.daily),header=day.findIndex(r=>r[0]==='tanggal');expect(day[header+1][0]).toBe('2026-11-02');expect(Number(day[header+1][day[header].indexOf('bill')])).toBe(report.totals.bill);
 const summary=parseCsv(files.summary);for(const [key,value] of Object.entries(report.totals))expect(summary.find(r=>r[0]===key)?.[1]).toBe(String(value));
 const methods=parseCsv(files.methods),methodIndex=methods.findIndex(r=>r[0]==='metode');expect(methods[methodIndex+1].slice(0,6)).toEqual(['cash',String(report.methods[0].receipts),String(report.methods[0].refunds),String(report.methods[0].correction),String(report.methods[0].adjustment),String(report.methods[0].net)]);
 const skus=parseCsv(files.skus),skuIndex=skus.findIndex(r=>r[0]==='sku_id');expect(skus[skuIndex+1][0]).toBe(report.skuByValue[0].skuId);expect(JSON.parse(skus[skuIndex+1][1])).toEqual(report.skuByValue[0].names);expect(Number(skus[skuIndex+1][6])).toBe(report.skuByValue[0].netBase);
 const events=parseCsv(files.events),idx=events.findIndex(r=>r[0]==='jenis'),columns=events[idx],first=events[idx+1];expect(first[columns.indexOf('unit_id')]).toBe(d.items[0].unitIds[0]);expect(first[columns.indexOf('nama_snapshot')]).toBe("'"+d.items[0].name);expect(first[columns.indexOf('operasi_kejadian_id')]).toBe('pay');
 expect(report.daily.reduce((n,x)=>n+x.totals.bill,0)).toBe(report.totals.bill);expect(report.daily.reduce((n,x)=>n+x.totals.paymentCount,0)).toBe(report.totals.paymentCount);expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
