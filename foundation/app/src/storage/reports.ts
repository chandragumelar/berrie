import type { BusinessRecord } from '../domain/business-record';
import { draftDateCode } from '../domain/draft';
import { calculateReports, calculateDailyReports, type Classification, type Refund, type Sale } from '../domain/reports';
import { canonical, type AtomicChange } from './commit';
import type { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

export type ReportFilter = {kind:'calendar';start:string;end:string;zone:string}|{kind:'session';sessionId:string};
function validId(value:unknown):value is string {return typeof value==='string' && !!value.trim() && value.length<=200;}
function calendarDate(v:unknown):v is string {if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return false;const d=new Date(`${v}T00:00:00.000Z`);return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===v;}
function validateFilter(v:ReportFilter):void {
 if(!v || typeof v!=='object')throw new Error('Filter tidak sah');
 if(v.kind==='session'){if(Object.keys(v).sort().join(',')!=='kind,sessionId'||!validId(v.sessionId))throw new Error('Filter sesi tidak sah');return;}
 if(v.kind!=='calendar'||Object.keys(v).sort().join(',')!=='end,kind,start,zone'||!calendarDate(v.start)||!calendarDate(v.end)||v.start>=v.end||!validId(v.zone))throw new Error('Filter kalender tidak sah');
 draftDateCode('2026-01-01T00:00:00Z',v.zone);
}
function localDate(time:string,zone:string):string {draftDateCode(time,zone);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');}
function selected(filter:ReportFilter,time:string,session:string):boolean {if(filter.kind==='session')return filter.sessionId===session;const date=localDate(time,filter.zone);return date>=filter.start&&date<filter.end;}
const kinds=new Set(['payment.draft-cash','payment.confirmed-cash','payment.draft-noncash','payment.confirmed-noncash','settlement.draft-free','settlement.confirmed-free']);
/** Internal read only. T-04 must authorize the caller. */
export async function readInternalSalesReports(db:BerrieDatabase,storeId:string,filter:ReportFilter) {
 if(!validId(storeId))throw new Error('Toko tidak sah');filter=structuredClone(filter);validateFilter(filter);
 const s=validateCheckpoint(await checkpoint(db));const changes=s.receipts.map(r=>JSON.parse(r.payload) as AtomicChange);const own=changes.filter(c=>c.storeId===storeId);
 if(filter.kind==='session'&&!s.state.some(r=>r.key===`cash-session:${filter.sessionId}`&&(r.value as BusinessRecord)?.recordType==='cash-session'&&((r.value as Extract<BusinessRecord,{recordType:'cash-session'}>).session.storeId===storeId)))throw new Error('Sesi tidak ditemukan');
 const sessionRecord=filter.kind==='session'?s.state.find(r=>r.key===`cash-session:${filter.sessionId}`)?.value as Extract<BusinessRecord,{recordType:'cash-session'}>|undefined:undefined;
 const zone=filter.kind==='calendar'?filter.zone:sessionRecord!.session.timeZone;
 const rows=new Map(s.state.map(r=>[r.key,r.value as BusinessRecord]));const origin=(key:string)=>own.find(c=>c.state.some(x=>x.key===key&&x.expectedRevision===null));
 const incomplete:{key:string;reason:string}[]=[];const sales:Sale[]=[];const refunds:Refund[]=[];const classifications:Classification[]=[];
 for(const r of s.state){const creator=origin(r.key);if(!creator)continue;const v=r.value as BusinessRecord;if(!v||typeof v!=='object'||!('recordType' in v)){incomplete.push({key:r.key,reason:'Record generik belum didukung'});continue;}if(v.recordType==='draft' && (v.schemaVersion!==2 || v.draft.channel!=='store'))incomplete.push({key:r.key,reason:'Draft legacy atau platform belum didukung'});if(v.recordType==='first-batch' && v.schemaVersion!==2)incomplete.push({key:r.key,reason:'Batch legacy belum didukung'});if(v.recordType==='refund-history')incomplete.push({key:r.key,reason:'Histori refund generik belum didukung'});}
 for(const r of s.state){const rec=r.value as BusinessRecord;if(!rec||rec.recordType!=='settlement')continue;const orderId=rec.settlement.orderId,key=r.key,creator=origin(key);if(!creator)continue;
  const batch=rows.get(`first-batch:${orderId}`),payment=rows.get(`payment:${orderId}`),refund=rows.get(`served-refunds:${orderId}`),correction=rows.get(`payment-corrections:${orderId}`);
  if(key!==`settlement:${orderId}`||!kinds.has(creator.kind)||batch?.recordType!=='first-batch'||batch.schemaVersion!==2||batch.batch.draft.channel!=='store'||rec.settlement.source==='platform'||(rec.settlement.source==='payment'&&payment?.recordType!=='payment')){incomplete.push({key,reason:'Settlement atau sumber belum didukung'});continue;}
  const time=(creator.payload as {metadata?:{recordedAt?:unknown}})?.metadata?.recordedAt;if(typeof time!=='string'){incomplete.push({key,reason:'Waktu settlement tidak tersedia'});continue;}draftDateCode(time,'UTC');
  const names:Record<string,string>={};for(const item of batch.batch.draft.items)for(const unit of item.unitIds)names[unit]=item.name;
  if(rec.settlement.units.some(u=>!names[u.id])){incomplete.push({key,reason:'Nama unit historis tidak tersedia'});continue;}
  const p=payment?.recordType==='payment'?payment.payment:null;const session=batch.batch.draft.cashSessionId;const source={orderId,settlementId:key,paymentId:p?.id??null,operationId:creator.operationId,settlementOperationId:creator.operationId,recordedAt:time,cashSessionId:session};
  if(selected(filter,time,session))sales.push({source,settlement:rec.settlement,names,method:p?.method??null});
  if(refund?.recordType==='served-refunds')for(const event of refund.refunds){const op=own.find(c=>(c.result as {refund?:{id?:string}})?.refund?.id===event.id);if(!op){incomplete.push({key:`served-refunds:${orderId}`,reason:'Operasi refund tidak tersedia'});continue;}if(selected(filter,event.recordedAt,event.cashSessionId))refunds.push({source:{...source,operationId:op.operationId,recordedAt:event.recordedAt,cashSessionId:event.cashSessionId,refundId:event.id},settlement:rec.settlement,names,unitIds:event.units.map(u=>u.id),method:event.method});}
  if(correction?.recordType==='payment-corrections')for(const event of correction.corrections){const op=own.find(c=>(c.result as {correction?:unknown})?.correction && (c.result as {correction:unknown}).correction && canonical((c.result as {correction:unknown}).correction)===canonical(event));if(!op){incomplete.push({key:`payment-corrections:${orderId}`,reason:'Operasi koreksi tidak tersedia'});continue;}if(selected(filter,event.recordedAt,event.executionSessionId??event.cashSessionId))classifications.push({source:{...source,operationId:op.operationId,recordedAt:event.recordedAt,cashSessionId:event.executionSessionId??event.cashSessionId},from:event.from,to:event.to,amount:event.amount,administrative:!!event.executionSessionId});}
 }
 incomplete.sort((a,b)=>a.key.localeCompare(b.key)||a.reason.localeCompare(b.reason));
 const events={sales,refunds,classifications};
 return structuredClone({filter,storeId,zone,scope:'settlement batch pertama channel Toko',checkpoint:{schema:s.schema,boundary:s.sequences},status:incomplete.length?'incomplete':'complete',incomplete,report:incomplete.length?null:{...calculateReports(events),daily:calculateDailyReports(events,zone)}});
}
