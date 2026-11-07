import { createStockGroupRecord, validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { BerrieDatabase } from './database';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';

export interface StockMetadata { operationId:string; storeId:string; deviceId:string; deviceEpoch:number; localSequence:number; actorId:string; policyVersion:number; recordedAt:string }
type StockRecord=Extract<BusinessRecord,{recordType:'stock-group'}>;
type Action='opening'|'correction'|'minimum';
const key=(id:string)=>`stock-group:${id}`;
function getRecord(value:unknown):StockRecord { validateBusinessRecord(value); if (!value || typeof value!=='object' || !('recordType' in value) || value.recordType!=='stock-group') throw new Error('Target bukan grup stok'); return value as StockRecord; }
function number(n:unknown):asserts n is number { if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0) throw new Error('Jumlah stok tidak sah'); }
function save(db:BerrieDatabase, action:Action, input:unknown, metadata:StockMetadata, locks:LockProvider=navigator.locks, now:()=>string=()=>new Date().toISOString()):Promise<unknown> {
 const data=copyInput(input) as Record<string,unknown>, meta=copyInput(metadata) as StockMetadata;
 if(!data || typeof data!=='object' || Array.isArray(data) || typeof data.groupId!=='string' || !data.groupId.trim()) throw new Error('ID grup tidak sah');
 if(typeof meta.recordedAt!=='string' || !Number.isFinite(Date.parse(meta.recordedAt)) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(meta.recordedAt)) throw new Error('Waktu tidak sah');
 if(action==='opening') {number(data.balance); if(data.minimum!==undefined) number(data.minimum);}
 else {number(data.expectedRevision); number(data.expectedBalance); number(data.value); if(action==='correction' && (typeof data.reason!=='string'||!data.reason.trim())) throw new Error('Alasan wajib');}
 const intent={action,data,metadata:meta}; canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const existing=await db.receipts.get(meta.operationId);
  if(existing) { const prior=JSON.parse(existing.payload) as AtomicChange; if(prior.kind!==`stock.${action}` || canonical(prior.payload)!==canonical(intent)) throw new Error('Konflik operation ID'); return existing.result; }
  const groupId=data.groupId as string, row=await db.state.get(key(groupId));
  const previous=row ? getRecord(row.value).stockGroup : null;
  if(action==='opening' ? !!row : !row || row.revision!==data.expectedRevision || previous?.balance!==data.expectedBalance) throw new Error('Revisi atau saldo berubah');
  if(previous && (previous.groupId!==groupId || previous.storeId!==meta.storeId)) throw new Error('Identitas toko atau grup berbeda');
  const balance=action==='opening'?data.balance as number:action==='correction'?data.value as number:previous!.balance;
  const next={groupId,storeId:meta.storeId,baseline:action==='minimum'?previous!.baseline:balance,balance,minimum:action==='opening'?(data.minimum as number|undefined) ?? 5:action==='minimum'?data.value as number:previous!.minimum};
  const record=createStockGroupRecord(next), revision=row ? row.revision+1 : 0, operationId=meta.operationId, recordedAt=now();
  const reason=action==='correction'?data.reason:null;
  const ledger=action==='minimum'?[]:[{id:`stock-ledger:${operationId}`,operationId,value:{action,groupId,storeId:meta.storeId,delta:balance-(previous?.balance ?? 0),before:previous?.balance ?? 0,after:balance}}];
  const change:AtomicChange={operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:`stock.${action}`,targetId:groupId,payload:intent,state:[{key:key(groupId),expectedRevision:row?.revision ?? null,value:record}],ledger,audit:[{id:`stock-audit:${operationId}`,operationId,value:{action,groupId,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,recordedAt,before:previous,after:next,reason}}],outbox:{id:`stock-outbox:${operationId}`,operationId,value:{groupId}},result:{groupId,revision,stockGroup:next}};
  return commit(change);
 });
}
export function createStockGroup(db:BerrieDatabase,data:{groupId:string;balance:number;minimum?:number},metadata:StockMetadata,locks?:LockProvider,now?:()=>string):Promise<unknown> { return save(db,'opening',data,metadata,locks,now); }
export function correctStockBaseline(db:BerrieDatabase,data:{groupId:string;value:number;reason:string;expectedRevision:number;expectedBalance:number},metadata:StockMetadata,locks?:LockProvider,now?:()=>string):Promise<unknown> {return save(db,'correction',data,metadata,locks,now);}
export function setStockMinimum(db:BerrieDatabase,data:{groupId:string;value:number;expectedRevision:number;expectedBalance:number},metadata:StockMetadata,locks?:LockProvider,now?:()=>string):Promise<unknown> {return save(db,'minimum',data,metadata,locks,now);}
export async function readStockGroup(db:BerrieDatabase,storeId:string,groupId:string):Promise<{stockGroup:StockRecord['stockGroup'];revision:number}|undefined> {if(!storeId?.trim()||!groupId?.trim()) throw new Error('ID tidak sah');const row=await db.state.get(key(groupId));if(!row)return undefined;const group=getRecord(row.value).stockGroup;if(group.storeId!==storeId||group.groupId!==groupId) throw new Error('Identitas toko atau grup berbeda');return {stockGroup:group,revision:row.revision};}
