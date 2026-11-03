import { businessDate, cashBalance, validateCashSession, type CashMovement, type CashSession } from '../domain/cash-session';
import { draftDateCode } from '../domain/draft';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { StockMetadata } from './stock-groups';

export type CashMetadata=StockMetadata;
export interface OpenCashInput { sessionId:string; number:string; initialCustodian:string; openingAmount:number; timeZone:string }
export interface MoveCashInput { sessionId:string; expectedRevision:number; kind:'in'|'out'; amount:number; category:string; description:string }
const key=(id:string)=>`cash-session:${id}`;
export function cashMovements(changes:AtomicChange[],id:string):CashMovement[] { return changes.filter(c=>(c.kind.startsWith('cash.') && c.targetId===id) || ((c.kind==='payment.confirmed-cash' || c.kind==='payment.draft-cash') && c.state.some(s=>s.key===key(id)))).sort((a,b)=>(a.state.find(s=>s.key===key(id))!.expectedRevision ?? -1)-(b.state.find(s=>s.key===key(id))!.expectedRevision ?? -1)).map(c=>c.ledger[0].value as CashMovement); }
export function makeCashChange(session:CashSession, data:OpenCashInput|MoveCashInput, meta:CashMetadata, revision:number|null, before:number):AtomicChange {
 const opening=revision===null;
 const entry:CashMovement=opening?{kind:'opening',sessionId:session.id,storeId:session.storeId,amount:session.openingAmount,category:'',description:''}:{kind:(data as MoveCashInput).kind,sessionId:session.id,storeId:session.storeId,amount:(data as MoveCashInput).amount,category:(data as MoveCashInput).category,description:(data as MoveCashInput).description};
 const balance=opening?entry.amount:before+(entry.kind==='out'?-entry.amount:entry.amount);
 if(!Number.isSafeInteger(balance) || balance<0 || (!opening && (!Number.isSafeInteger(entry.amount) || entry.amount<=0 || !['in','out'].includes(entry.kind) || typeof entry.category!=='string' || !entry.category.trim() || entry.category.length>200 || typeof entry.description!=='string' || !entry.description.trim() || entry.description.length>200))) throw new Error('Pergerakan kas tidak sah');
 draftDateCode(meta.recordedAt,'UTC');
 const operationId=meta.operationId,action=opening?'open':'move';
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:`cash.${action}`,targetId:session.id,payload:{data,metadata:meta},state:[{key:key(session.id),expectedRevision:revision,value:{recordType:'cash-session',schemaVersion:1,session}}],ledger:[{id:`cash-ledger:${operationId}`,operationId,value:entry}],audit:[{id:`cash-audit:${operationId}`,operationId,value:{action,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,sessionId:session.id,before,after:balance}}],outbox:{id:`cash-outbox:${operationId}`,operationId,value:{sessionId:session.id}},result:{sessionId:session.id,revision:(revision ?? -1)+1,balance}};
}
async function save(db:BerrieDatabase, input:OpenCashInput|MoveCashInput, metadata:CashMetadata, opening:boolean, locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as OpenCashInput|MoveCashInput,meta=copyInput(metadata) as CashMetadata; canonical({data,metadata:meta});
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange;if(c.kind!==(opening?'cash.open':'cash.move') || canonical(c.payload)!==canonical({data,metadata:meta})) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const changes=snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
  const row=await db.state.get(key(data.sessionId));
  let session:CashSession,before=0;
  if(opening) {
   if(row || snapshot.state.some(r=>{const v=r.value as {recordType?:string;session?:CashSession};return v?.recordType==='cash-session' && v.session?.storeId===meta.storeId;})) throw new Error('Sesi kas sudah terbuka');
   const d=data as OpenCashInput, date=businessDate(meta.recordedAt,d.timeZone);
   session={id:d.sessionId,storeId:meta.storeId,number:d.number,openedBy:meta.actorId,initialCustodian:d.initialCustodian,openedAt:meta.recordedAt,timeZone:d.timeZone,businessDate:date,openingAmount:d.openingAmount};validateCashSession(session);
  } else {
   const d=data as MoveCashInput,record=row?.value as {recordType?:string;session?:CashSession};
   if(!row || record?.recordType!=='cash-session' || row.revision!==d.expectedRevision || !record.session || record.session.storeId!==meta.storeId || record.session.id!==d.sessionId) throw new Error('Sesi atau revisi tidak sesuai');
   session=record.session;before=cashBalance(cashMovements(changes,session.id),session);
  }
  return commit(makeCashChange(session,data,meta,row?.revision ?? null,before));
 });
}
export function openCashSession(db:BerrieDatabase,data:OpenCashInput,meta:CashMetadata,locks?:LockProvider):Promise<unknown> {return save(db,data,meta,true,locks);}
export function moveCash(db:BerrieDatabase,data:MoveCashInput,meta:CashMetadata,locks?:LockProvider):Promise<unknown> {return save(db,data,meta,false,locks);}
/** Internal only: T-04 must authorize access as well as commands. */
export async function readCashBalance(db:BerrieDatabase,storeId:string,sessionId:string):Promise<number> {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);const row=snapshot.state.find(r=>r.key===key(sessionId));const value=row?.value as {recordType?:string;session?:CashSession};
 if(value?.recordType!=='cash-session' || !value.session || value.session.storeId!==storeId || value.session.id!==sessionId) throw new Error('Sesi tidak ditemukan');
 return cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),sessionId),value.session);
}
