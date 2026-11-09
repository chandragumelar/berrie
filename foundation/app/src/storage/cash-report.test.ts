import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {BerrieDatabase} from './database';
import {openCashSession,moveCash,type CashMetadata} from './cash-sessions';
import {changeCashCount} from './cash-count';
import {checkpoint,stageSnapshot} from './recovery';
import {readInternalCashReport} from './cash-report';
import {exportCashReportCsv} from '../domain/cash-report-csv';
import type {LockProvider} from './commit';
const locks:LockProvider={request:async(_n,fn)=>fn()};
const id='11111111-1111-4111-8111-111111111111';
const meta=(operationId:string,localSequence:number,actorId='A'):CashMetadata=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId,policyVersion:1,recordedAt:'2026-11-01T16:59:00Z'});
const base=(session:number,count:number|null)=>({sessionId:id,expectedSessionRevision:session,expectedCountRevision:count});
it('merekonsiliasi handover dan close pada satu checkpoint tanpa mutasi',async()=>{const db=new BerrieDatabase(crypto.randomUUID()),stage=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:100000,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await moveCash(db,{sessionId:id,expectedRevision:0,kind:'in',amount:50000,category:'lain',description:'=SUM(1,2)'},meta('move-a',2),locks);
 await changeCashCount(db,'save',{...base(1,null),purpose:'handover',amount:145000},meta('count-a',3),locks);
 await changeCashCount(db,'handover',{...base(2,0),purpose:'handover',incoming:'B',received:145000,reason:'kurang'},meta('handover',4,'B'),locks);
 let result=await readInternalCashReport(db,'store',id);expect(result.report.summary).toMatchObject({expected:150000,closingCount:null,closingDifference:null});expect(result.report.segments.map(s=>s.difference)).toEqual([-5000,null]);
 await moveCash(db,{sessionId:id,expectedRevision:3,kind:'in',amount:20000,category:'lain',description:'tunai'},meta('move-b',5,'B'),locks);
 await changeCashCount(db,'save',{...base(4,1),amount:163000},meta('count-b',6,'B'),locks);
 await changeCashCount(db,'close',{...base(5,2),reason:'kurang'},meta('close',7,'B'),locks);
 const before=await checkpoint(db);result=await readInternalCashReport(db,'store',id);expect(result.status).toBe('complete');expect(result.report.summary).toMatchObject({cashIn:70000,expected:170000,closingCount:163000,closingDifference:-7000});expect(result.report.segments.map(s=>s.difference)).toEqual([-5000,-2000]);
 const files=exportCashReportCsv(result);expect(files.ledger).toContain('"\'=SUM(1,2)"');expect(files.summary).toContain('170000');expect(await checkpoint(db)).toEqual(before);
 await stageSnapshot(stage,before);expect(await readInternalCashReport(stage,'store',id)).toEqual(result);
 await expect(readInternalCashReport(db,'other',id)).rejects.toThrow('Sesi tidak ditemukan');
 }finally{await db.delete();await stage.delete();}});
it('sesi nol dan count yang dibatalkan tidak menjadi penutupan',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await changeCashCount(db,'save',{...base(0,null),amount:0},meta('count',2),locks);
 await changeCashCount(db,'revise',{...base(1,0),amount:1},meta('revise',3),locks);
 await changeCashCount(db,'cancel',base(2,1),meta('cancel',4),locks);
 const result=await readInternalCashReport(db,'store',id);expect(result.report.summary).toMatchObject({opening:0,expected:0,closingCount:null,closingDifference:null});expect(result.report.segments[0].closingPhysical).toBeNull();
 }finally{await db.delete();}});
it('CSV melindungi teks formula dan mengutip koma, kutip, baris baru',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:10,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await moveCash(db,{sessionId:id,expectedRevision:0,kind:'out',amount:3,category:'@kategori',description:' \t=cmd,"x"\nbaris'},meta('move',2,'+actor'),locks);
 const result=await readInternalCashReport(db,'store',id),csv=exportCashReportCsv(result);expect(result.report.summary).toMatchObject({cashOut:3,expected:7});expect(csv.ledger).toContain('"\'+actor"');expect(csv.ledger).toContain('"\'@kategori"');expect(csv.ledger).toContain('"\' \t=cmd,""x""\nbaris"');expect(csv.ledger.startsWith('\ufeff')).toBe(true);
 }finally{await db.delete();}});
it('histori rusak ditolak dan sumber generik menahan ekspor',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 const {commitChange}=await import('./commit');await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await commitChange(db,{operationId:'legacy',storeId:'store',deviceId:'other',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'unknown',actorId:'actor',policyVersion:1,payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'audit',operationId:'legacy',value:{}}],outbox:{id:'outbox',operationId:'legacy',value:{}},result:{}},locks);
 const result=await readInternalCashReport(db,'store',id);expect(result.status).toBe('incomplete');expect(()=>exportCashReportCsv(result)).toThrow('Ekspor ditahan');await db.state.delete('order:unknown');await expect(readInternalCashReport(db,'store',id)).rejects.toThrow('Checkpoint');
 }finally{await db.delete();}});
it('total per kategori yang melampaui integer aman ditolak walaupun saldo akhir aman',async()=>{const db=new BerrieDatabase(crypto.randomUUID());try {
 await openCashSession(db,{sessionId:id,number:'1',initialCustodian:'A',openingAmount:0,timeZone:'Asia/Jakarta'},meta('open',1),locks);
 await moveCash(db,{sessionId:id,expectedRevision:0,kind:'in',amount:Number.MAX_SAFE_INTEGER,category:'lain',description:'masuk'},meta('in1',2),locks);
 await moveCash(db,{sessionId:id,expectedRevision:1,kind:'out',amount:Number.MAX_SAFE_INTEGER,category:'lain',description:'keluar'},meta('out',3),locks);
 await moveCash(db,{sessionId:id,expectedRevision:2,kind:'in',amount:1,category:'lain',description:'masuk'},meta('in2',4),locks);
 const before=await checkpoint(db);await expect(readInternalCashReport(db,'store',id)).rejects.toThrow('batas aman');expect(await checkpoint(db)).toEqual(before);
 }finally{await db.delete();}});
