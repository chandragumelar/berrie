import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { planFreeCancellation, validateFreeSources, validateFreeCancellationEvent, validateFreeStockReturnEvent, type FreeCancellationEvent, type FreeStockReturnEvent } from '../domain/free-cancellation';
import type { FirstBatch } from '../domain/first-batch';
import type { SettlementSnapshot } from '../domain/settlement';
import { initialServing, type ServingState } from '../domain/serving';
import type { CashSession } from '../domain/cash-session';
import type { StockGroup } from '../domain/stock-group';
import type { RefundSelection } from '../domain/served-refund';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { planStockReturn, type ReturnOption, type GroupSource } from './served-refunds';
import type { StockMetadata } from './stock-groups';

export const freeCancellationKey=(orderId:string)=>`free-cancellations:${orderId}`;
export const freeReturnKey=(orderId:string)=>`free-stock-returns:${orderId}`;
export interface CancelFreeInput { orderId:string; expectedServingRevision:number|null; expectedCancellationRevision:number|null; expectedSessionRevision:number; selection:RefundSelection[]; reason:string; kitchenConfirmed:true; returnStock:ReturnOption|null }
export interface ReturnFreeInput { orderId:string; expectedServingRevision:number|null; expectedCancellationRevision:number|null; expectedReturnRevision:number|null; expectedSessionRevision:number; cancellationId:string|null; unitIds:string[]; groups:GroupSource[]; reason:string; sellable:true }
export interface FreeSources { batch:FirstBatch; settlement:SettlementSnapshot; session:CashSession; serving:ServingState|null; cancellations:FreeCancellationEvent[]; returns:FreeStockReturnEvent[]; groups:StockGroup[] }
const text=(v:unknown,max=200)=>typeof v==='string' && !!v.trim() && v.length<=max;
const revision=(v:unknown,nullable=false)=>nullable && v===null || typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<Number.MAX_SAFE_INTEGER;
const revOf=(length:number)=>length?length-1:null;
function sourceChecks(s:FreeSources,orderId:string,meta:StockMetadata,servingRevision:number|null,cancellationRevision:number|null):ServingState {
 if(!s || !Array.isArray(s.cancellations) || !Array.isArray(s.returns) || !Array.isArray(s.groups) || !revision(servingRevision,true) || !revision(cancellationRevision,true) || cancellationRevision!==revOf(s.cancellations.length) || (s.serving===null)!==(servingRevision===null) || s.batch.storeId!==meta.storeId || s.batch.draft.orderId!==orderId || s.session.storeId!==meta.storeId || s.session.id!==s.batch.draft.cashSessionId) throw new Error('Sumber gratis tidak sesuai');
 const serving=s.serving ?? initialServing(s.batch);validateFreeSources(s.batch,s.settlement,serving);
 const cancelled=new Set<string>();
 for(const c of s.cancellations) {
  validateFreeCancellationEvent(c);
  if(c.storeId!==meta.storeId || c.orderId!==orderId || c.cashSessionId!==s.session.id || c.settlementId!==`settlement:${orderId}`) throw new Error('Histori pembatalan asing');
  for(const id of c.unitIds) {if(cancelled.has(id) || !serving.units.some(u=>u.id===id && u.status==='cancelled')) throw new Error('Histori pembatalan tidak sesuai');cancelled.add(id);}
 }
 if(serving.units.some(u=>u.status==='cancelled' && !cancelled.has(u.id))) throw new Error('Unit batal tanpa histori');
 const returned=new Set<string>();
 for(const r of s.returns) {validateFreeStockReturnEvent(r);if(r.storeId!==meta.storeId || r.orderId!==orderId || r.cashSessionId!==s.session.id || r.settlementId!==`settlement:${orderId}`) throw new Error('Histori return asing');for(const u of r.units) {if(returned.has(u.id)) throw new Error('Return duplikat');returned.add(u.id);}}
 return serving;
}
function returnEffects(s:FreeSources,unitIds:string[],eligible:string[],option:ReturnOption,meta:StockMetadata,source:'served'|'cancellation',cancellationId:string|null) {
 const {units,state,groupIds}=planStockReturn(s.batch,s.returns.flatMap(r=>r.units.map(u=>u.id)),s.groups,eligible,unitIds,option,meta,s.returns.length);
 const event:FreeStockReturnEvent={id:`free-return:${meta.operationId}`,settlementId:`settlement:${s.batch.draft.orderId}`,orderId:s.batch.draft.orderId,storeId:meta.storeId,cashSessionId:s.session.id,source,cancellationId,units,reason:option.reason,sellable:true,actorId:meta.actorId,recordedAt:meta.recordedAt};validateFreeStockReturnEvent(event);
 const ledger=groupIds.map(groupId=>({id:`free-return-ledger:${meta.operationId}:${groupId}`,operationId:meta.operationId,value:{kind:'stock-return',event,groupId,delta:units.filter(u=>u.groupId===groupId).length}}));
 return {event,state,ledger};
}
function envelope(meta:StockMetadata,kind:string,orderId:string) {return {operationId:meta.operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind,targetId:orderId};}
export function makeFreeCancellationChange(s:FreeSources,data:CancelFreeInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedCancellationRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock,selection' || !text(data.orderId) || !text(data.reason,500) || data.kitchenConfirmed!==true || !revision(data.expectedSessionRevision)) throw new Error('Intent pembatalan gratis tidak sah');
 const serving=sourceChecks(s,data.orderId,meta,data.expectedServingRevision,data.expectedCancellationRevision);
 const unitIds=planFreeCancellation(s.batch,s.settlement,serving,data.selection);
 const event:FreeCancellationEvent={id:`free-cancel:${meta.operationId}`,settlementId:`settlement:${data.orderId}`,orderId:data.orderId,storeId:meta.storeId,cashSessionId:s.session.id,unitIds,reason:data.reason,kitchenConfirmed:true,actorId:meta.actorId,recordedAt:meta.recordedAt};validateFreeCancellationEvent(event);
 const selected=new Set(unitIds),next={...serving,units:serving.units.map(u=>selected.has(u.id)?{...u,status:'cancelled' as const}:u)};
 const ret=data.returnStock===null?null:returnEffects(s,unitIds,unitIds,data.returnStock,meta,'cancellation',event.id);
 return {...envelope(meta,'cancellation.free',data.orderId),payload:{data,metadata:meta,contractVersion:1},state:[{key:freeCancellationKey(data.orderId),expectedRevision:data.expectedCancellationRevision,value:{recordType:'free-cancellations',schemaVersion:1,cancellations:[...s.cancellations,event]}},{key:`serving:${data.orderId}`,expectedRevision:data.expectedServingRevision,value:{recordType:'serving',schemaVersion:2,serving:next}},...(ret?[{key:freeReturnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'free-stock-returns',schemaVersion:1,returns:[...s.returns,ret.event]}},...ret.state]:[])],ledger:ret?.ledger ?? [],audit:[{id:`free-cancellation-audit:${meta.operationId}`,operationId:meta.operationId,value:{cancellation:event,stockReturn:ret?.event ?? null,before:serving,after:next,policyVersion:meta.policyVersion}}],outbox:{id:`free-cancellation-outbox:${meta.operationId}`,operationId:meta.operationId,value:{orderId:data.orderId,settlementId:event.settlementId}},result:{cancellation:event,stockReturn:ret?.event ?? null,serving:next,cancellationRevision:s.cancellations.length,servingRevision:(data.expectedServingRevision ?? -1)+1,returnRevision:ret?s.returns.length:null}};
}
export function makeFreeReturnChange(s:FreeSources,data:ReturnFreeInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='cancellationId,expectedCancellationRevision,expectedReturnRevision,expectedServingRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds' || !text(data.orderId) || !(data.cancellationId===null || text(data.cancellationId)) || !revision(data.expectedReturnRevision,true) || !revision(data.expectedSessionRevision)) throw new Error('Intent return gratis tidak sah');
 const serving=sourceChecks(s,data.orderId,meta,data.expectedServingRevision,data.expectedCancellationRevision);
 const cancellation=data.cancellationId===null?null:s.cancellations.find(c=>c.id===data.cancellationId);
 if(data.cancellationId!==null && !cancellation) throw new Error('Pembatalan asal tidak ditemukan');
 const eligible=cancellation?cancellation.unitIds:serving.units.filter(u=>u.status==='served').map(u=>u.id);
 const ret=returnEffects(s,data.unitIds,eligible,{reason:data.reason,sellable:data.sellable,expectedReturnRevision:data.expectedReturnRevision,groups:data.groups},meta,cancellation?'cancellation':'served',cancellation?.id ?? null);
 return {...envelope(meta,'return.free',data.orderId),payload:{data,metadata:meta,contractVersion:1},state:[{key:freeReturnKey(data.orderId),expectedRevision:data.expectedReturnRevision,value:{recordType:'free-stock-returns',schemaVersion:1,returns:[...s.returns,ret.event]}},...ret.state],ledger:ret.ledger,audit:[{id:`free-return-audit:${meta.operationId}`,operationId:meta.operationId,value:{stockReturn:ret.event,policyVersion:meta.policyVersion}}],outbox:{id:`free-return-outbox:${meta.operationId}`,operationId:meta.operationId,value:{orderId:data.orderId,settlementId:ret.event.settlementId}},result:{stockReturn:ret.event,returnRevision:s.returns.length}};
}
function get(snapshot:Snapshot,key:string,type:BusinessRecord['recordType'],expected:number|null):BusinessRecord|undefined {
 const row=snapshot.state.find(r=>r.key===key);if((row?.revision ?? null)!==expected) throw new Error(`Revisi ${key} berubah`);if(!row)return;
 validateBusinessRecord(row.value);const value=row.value as BusinessRecord;if(value?.recordType!==type) throw new Error(`Sumber ${key} tidak sah`);return value;
}
function load(snapshot:Snapshot,orderId:string,storeId:string,servingRevision:number|null,cancellationRevision:number|null,returnRevision:number|null,sessionRevision:number,groupSources:GroupSource[]):FreeSources {
 const batch=get(snapshot,`first-batch:${orderId}`,'first-batch',0),settlement=get(snapshot,`settlement:${orderId}`,'settlement',0);
 if(batch?.recordType!=='first-batch' || settlement?.recordType!=='settlement' || batch.batch.storeId!==storeId || snapshot.state.some(r=>r.key===`payment:${orderId}` || r.key===`paid-cancellations:${orderId}` || r.key===`served-refunds:${orderId}` || r.key===`stock-returns:${orderId}`)) throw new Error('Sumber gratis tidak ditemukan');
 const session=get(snapshot,`cash-session:${batch.batch.draft.cashSessionId}`,'cash-session',sessionRevision),serving=get(snapshot,`serving:${orderId}`,'serving',servingRevision),cancellations=get(snapshot,freeCancellationKey(orderId),'free-cancellations',cancellationRevision),returns=get(snapshot,freeReturnKey(orderId),'free-stock-returns',returnRevision);
 if(session?.recordType!=='cash-session' || (serving && serving.recordType!=='serving') || (cancellations && cancellations.recordType!=='free-cancellations') || (returns && returns.recordType!=='free-stock-returns') || !Array.isArray(groupSources)) throw new Error('Sumber histori gratis tidak sah');
 const groups=groupSources.map(g=>{const r=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(r?.recordType!=='stock-group') throw new Error('Grup tidak sah');return r.stockGroup;});
 return {batch:batch.batch,settlement:settlement.settlement,session:session.session,serving:serving?.serving ?? null,cancellations:cancellations?.cancellations ?? [],returns:returns?.returns ?? [],groups};
}
/** Internal only: T-04 must authorize commands and reads before integration. */
export function cancelFreeUnits(db:BerrieDatabase,input:CancelFreeInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CancelFreeInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='cancellation.free' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId)) throw new Error('Pesanan tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  const ret=data.returnStock,current=snapshot.state.find(r=>r.key===freeReturnKey(data.orderId));
  if(ret!==null && (!ret || !Array.isArray(ret.groups))) throw new Error('Sumber return tidak sah');
  const s=load(snapshot,data.orderId,meta.storeId,data.expectedServingRevision,data.expectedCancellationRevision,ret===null?(current?.revision ?? null):ret.expectedReturnRevision,data.expectedSessionRevision,ret?.groups ?? []);
  return commit(makeFreeCancellationChange(s,data,meta));
 });
}
export function returnFreeStock(db:BerrieDatabase,input:ReturnFreeInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ReturnFreeInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='return.free' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId) || !Array.isArray(data.groups)) throw new Error('Sumber return tidak sah');
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  return commit(makeFreeReturnChange(load(snapshot,data.orderId,meta.storeId,data.expectedServingRevision,data.expectedCancellationRevision,data.expectedReturnRevision,data.expectedSessionRevision,data.groups),data,meta));
 });
}
export async function readFreeCancellationStatus(db:BerrieDatabase,storeId:string,orderId:string) {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
 const batch=snapshot.state.find(r=>r.key===`first-batch:${orderId}`),sessionId=(batch?.value as Extract<BusinessRecord,{recordType:'first-batch'}>)?.batch?.draft.cashSessionId;
 const session=snapshot.state.find(r=>r.key===`cash-session:${sessionId}`),serving=snapshot.state.find(r=>r.key===`serving:${orderId}`),c=snapshot.state.find(r=>r.key===freeCancellationKey(orderId)),r=snapshot.state.find(r=>r.key===freeReturnKey(orderId));
 if(!session) throw new Error('Sesi tidak ditemukan');
 const s=load(snapshot,orderId,storeId,serving?.revision ?? null,c?.revision ?? null,r?.revision ?? null,session.revision,[]);
 sourceChecks(s,orderId,{storeId} as StockMetadata,serving?.revision ?? null,c?.revision ?? null);
 return structuredClone({serving:s.serving ?? initialServing(s.batch),cancellations:s.cancellations,returns:s.returns,servingRevision:serving?.revision ?? null,cancellationRevision:c?.revision ?? null,returnRevision:r?.revision ?? null});
}
