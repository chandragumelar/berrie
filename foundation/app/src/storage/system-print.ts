import { customerDocument, kitchenDocument, type PaperWidth, type PrintableDocument, type PrintMode } from '../domain/print-documents';
import type { CashPayment, NoncashPayment } from '../domain/payment';
import type { SettlementSnapshot } from '../domain/settlement';
import type { BusinessRecord } from '../domain/business-record';
import type { AtomicChange } from './commit';
import { validateCheckpoint } from './validate-checkpoint';
import { checkpoint } from './recovery';
import type { BerrieDatabase, PrintAttemptRow } from './database';

export interface PrinterConfiguration { paperWidth:PaperWidth; configuredAt:string }
export interface PrintAttempt { id:string; scope:string; jobKey:string; requestKey:string; documentId:string; mode:PrintMode; status:'reserved'|'unknown'|'failed'; reservedAt:string; finishedAt?:string; error?:string }
const scope=(storeId:string,deviceId:string,epoch:number)=>`${storeId}:${deviceId}:${epoch}`;
const configKey=(s:string)=>`printer:${s}`;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function config(value:unknown):PrinterConfiguration {if(!object(value)||Object.keys(value).sort().join(',')!=='configuredAt,paperWidth'||!['58','80'].includes(value.paperWidth as string)||typeof value.configuredAt!=='string'||!Number.isFinite(Date.parse(value.configuredAt)))throw new Error('Konfigurasi printer tidak sah');return structuredClone(value as unknown as PrinterConfiguration);}
function attempt(value:unknown):PrintAttempt {if(!object(value)||!['documentId','id','jobKey','mode','requestKey','reservedAt','scope','status'].every(k=>Object.hasOwn(value,k))||!['original','copy'].includes(value.mode as string)||!['reserved','unknown','failed'].includes(value.status as string)||![value.id,value.scope,value.jobKey,value.requestKey,value.documentId,value.reservedAt].every(x=>typeof x==='string'&&!!x)||typeof value.reservedAt!=='string'||!Number.isFinite(Date.parse(value.reservedAt)))throw new Error('Attempt cetak tidak sah');return structuredClone(value as unknown as PrintAttempt);}

export async function readPrinterConfiguration(db:BerrieDatabase,identity:{storeId:string;deviceId:string;epoch:number}):Promise<PrinterConfiguration|null>{const row=await db.printConfigs.get(configKey(scope(identity.storeId,identity.deviceId,identity.epoch)));return row?config(row.value):null;}
export async function savePrinterConfiguration(db:BerrieDatabase,identity:{storeId:string;deviceId:string;epoch:number},paperWidth:PaperWidth):Promise<PrinterConfiguration>{if(!['58','80'].includes(paperWidth))throw new Error('Lebar kertas tidak sah');const value={paperWidth,configuredAt:new Date().toISOString()} as PrinterConfiguration;await db.printConfigs.put({key:configKey(scope(identity.storeId,identity.deviceId,identity.epoch)),value});return value;}

function recordsForOrder(snap:ReturnType<typeof validateCheckpoint>,storeId:string,orderId:string){
 const get=(key:string)=>snap.state.find(row=>row.key===key)?.value as BusinessRecord|undefined;
 const first=get(`first-batch:${orderId}`),addition=get(`order-batch:${orderId}:2`),payment=get(`payment:${orderId}`),settlement=get(`settlement:${orderId}`),cancel=get(`paid-cancellations:${orderId}`),firstKitchen=get(`kitchen-job:${orderId}`),additionKitchen=get(`kitchen-job-addition:${orderId}:2`),customer=get(`customer-job:${orderId}`);
 if(first?.recordType!=='first-batch'||first.batch.storeId!==storeId||first.batch.draft.orderId!==orderId)throw new Error('Tiket pesanan tidak tersedia');
 if(firstKitchen?.recordType!=='kitchen-job'||firstKitchen.batch.storeId!==storeId||firstKitchen.batch.draft.orderId!==orderId)throw new Error('Job dapur pesanan tidak sah');
 if(addition&& (addition.recordType!=='order-batch'||addition.batch.storeId!==storeId||addition.batch.orderId!==orderId))throw new Error('Batch tambahan tidak sah');
 if(addition&& (additionKitchen?.recordType!=='kitchen-job-addition'||additionKitchen.batch.storeId!==storeId||additionKitchen.batch.orderId!==orderId))throw new Error('Job dapur tambahan tidak sah');
 if(payment&& (payment.recordType!=='payment'||payment.payment.storeId!==storeId||payment.payment.orderId!==orderId))throw new Error('Pembayaran asing');
 if(settlement&& (settlement.recordType!=='settlement'||settlement.settlement.orderId!==orderId))throw new Error('Settlement asing');
 if(settlement&&customer?.recordType!=='customer-job')throw new Error('Job pelanggan pesanan tidak sah');
 if(customer?.recordType==='customer-job'){
  const source=customer.schemaVersion===4?customer.batches[0].draft:customer.batch.draft;
  if(source.orderId!==orderId||source.cashSessionId!==first.batch.draft.cashSessionId||customer.settlement.orderId!==orderId)throw new Error('Job pelanggan asing');
 }
 const cancelled=cancel?.recordType==='paid-cancellations'?cancel.cancellations.flatMap(c=>c.units.map(u=>u.id)):[];
 return {first:first.batch,addition:addition?.recordType==='order-batch'?addition.batch:undefined,payment:payment?.recordType==='payment'?payment.payment:undefined,settlement:settlement?.recordType==='settlement'?settlement.settlement:undefined,cancelled};
}
/** Reads immutable jobs/snapshots only.  It never recreates a document from the live catalog. */
export async function readOrderPrintDocuments(db:BerrieDatabase,identity:{storeId:string},orderId:string,timeZone:string):Promise<PrintableDocument[]> {const snap=validateCheckpoint(await checkpoint(db));const source=recordsForOrder(snap,identity.storeId,orderId),docs=[kitchenDocument(source.first,timeZone,source.cancelled)];if(source.addition)docs.push(kitchenDocument(source.addition,timeZone,source.cancelled));if(source.settlement)docs.push(customerDocument(source.addition?[source.first,source.addition]:source.first,source.payment as CashPayment|NoncashPayment|undefined,source.settlement as SettlementSnapshot,timeZone));return docs;}
/** Only jobs created by this exact fresh business receipt are eligible for automatic prompting. */
export async function readFreshReceiptDocuments(db:BerrieDatabase,identity:{storeId:string;deviceId:string;epoch:number;actorId:string},operationId:string,timeZone:string):Promise<PrintableDocument[]> {
 const receipt=await db.receipts.get(operationId);if(!receipt)throw new Error('Receipt cetak tidak ditemukan');const change=JSON.parse(receipt.payload) as AtomicChange;
 if(change.storeId!==identity.storeId||change.deviceId!==identity.deviceId||change.deviceEpoch!==identity.epoch||change.actorId!==identity.actorId)throw new Error('Receipt bukan milik perangkat ini');
 const orderId=change.targetId;if(!['batch.confirm-first','payment.draft-cash','payment.draft-noncash','payment.confirmed-cash','payment.confirmed-noncash','payment.multi-batch-cash'].includes(change.kind))return [];
 const all=await readOrderPrintDocuments(db,identity,orderId,timeZone),has=(prefix:string)=>change.state.some(row=>row.key.startsWith(prefix));
 if(change.kind==='batch.confirm-first')return all.filter(x=>x.kind==='kitchen'&&x.batch===1);
 if(change.kind==='payment.confirmed-cash'||change.kind==='payment.confirmed-noncash')return all.filter(x=>x.kind==='customer');
 if(change.kind==='payment.multi-batch-cash')return all.filter(x=>(x.kind==='kitchen'&&x.batch===2)||x.kind==='customer');
 return all.filter(x=>(x.kind==='kitchen'&&has(x.batch===1?`kitchen-job:${orderId}`:`kitchen-job-addition:${orderId}`))||x.kind==='customer');
}

export async function reservePrintAttempt(db:BerrieDatabase,identity:{storeId:string;deviceId:string;epoch:number},document:PrintableDocument,requestKey:string):Promise<PrintAttempt>{
 const currentScope=scope(identity.storeId,identity.deviceId,identity.epoch);if(!requestKey.trim())throw new Error('Permintaan cetak tidak sah');
 return db.transaction('rw',db.printAttempts,async()=>{const prior=(await db.printAttempts.where('scope').equals(currentScope).toArray()).map(row=>attempt(row.value));const same=prior.find(row=>row.jobKey===document.jobKey&&row.mode===document.mode&&row.requestKey===requestKey);if(same)return same;if(document.mode==='original'&&prior.some(row=>row.jobKey===document.jobKey&&row.mode==='original'))throw new Error('Dokumen asli sudah pernah dicoba; gunakan Cetak ulang — SALINAN');const value:PrintAttempt={id:crypto.randomUUID(),scope:currentScope,jobKey:document.jobKey,requestKey,documentId:document.id,mode:document.mode,status:'reserved',reservedAt:new Date().toISOString()};const row:PrintAttemptRow={id:value.id,scope:currentScope,jobKey:value.jobKey,requestKey:value.requestKey,value};await db.printAttempts.add(row);return value;});
}
export async function finishPrintAttempt(db:BerrieDatabase,id:string,status:'unknown'|'failed',error?:string):Promise<PrintAttempt>{return db.transaction('rw',db.printAttempts,async()=>{const row=await db.printAttempts.get(id);if(!row)throw new Error('Attempt cetak tidak ditemukan');const old=attempt(row.value);if(old.status!=='reserved')return old;const value={...old,status,finishedAt:new Date().toISOString(),...(error?{error:error.slice(0,500)}:{})} as PrintAttempt;await db.printAttempts.put({...row,value});return value;});}
export async function attemptsForOrder(db:BerrieDatabase,identity:{storeId:string;deviceId:string;epoch:number},orderId:string):Promise<PrintAttempt[]>{const currentScope=scope(identity.storeId,identity.deviceId,identity.epoch);return (await db.printAttempts.where('scope').equals(currentScope).toArray()).map(row=>attempt(row.value)).filter(row=>row.jobKey.includes(`:${orderId}:`)||row.jobKey===`customer:${orderId}`);}
