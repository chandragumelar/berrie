import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateFirstBatch, type FirstBatch } from '../domain/first-batch';
import { initialServing, validateServingState, type ServingState } from '../domain/serving';
import { validateUnpaidCancellation, validateUnpaidReturn, type UnpaidCancellationEvent, type UnpaidReturnEvent } from '../domain/unpaid-cancellation';
import type { CashSession } from '../domain/cash-session';
import type { StockGroup } from '../domain/stock-group';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { planStockReturn, type GroupSource, type ReturnOption } from './served-refunds';
import type { StockMetadata } from './stock-groups';

export const unpaidCancellationKey=(orderId:string)=>`unpaid-cancellation:${orderId}`;
export const unpaidReturnKey=(orderId:string)=>`unpaid-stock-returns:${orderId}`;
export interface UnpaidReturnOption extends ReturnOption { unitIds:string[] }
export interface CancelUnpaidInput { orderId:string; expectedBatchRevision:number; expectedServingRevision:number|null; expectedSessionRevision:number; reason:string; kitchenConfirmed:true; returnStock:UnpaidReturnOption|null }
export interface ReturnUnpaidInput { orderId:string; expectedBatchRevision:number; expectedServingRevision:number; expectedCancellationRevision:number; expectedReturnRevision:number|null; expectedSessionRevision:number; unitIds:string[]; groups:GroupSource[]; reason:string; sellable:true }
export interface UnpaidSources { batch:FirstBatch; session:CashSession; serving:ServingState|null; cancellation:UnpaidCancellationEvent|null; returns:UnpaidReturnEvent[]; groups:StockGroup[] }
const text=(v:unknown,max=200)=>typeof v==='string' && !!v.trim() && v.length<=max;
const rev=(v:unknown,nullable=false)=>nullable && v===null || typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<Number.MAX_SAFE_INTEGER;
function checkSources(s:UnpaidSources,orderId:string,meta:StockMetadata,servingRevision:number|null):ServingState {
 validateFirstBatch(s.batch);
 if(s.batch.storeId!==meta.storeId || s.batch.draft.orderId!==orderId || s.session.storeId!==meta.storeId || s.session.id!==s.batch.draft.cashSessionId || !Array.isArray(s.returns) || !Array.isArray(s.groups) || !rev(servingRevision,true) || (s.serving===null)!==(servingRevision===null)) throw new Error('Sumber unpaid tidak sesuai');
 const initial=initialServing(s.batch),serving=s.serving ?? initial;validateServingState(serving,true);
 if(serving.orderId!==initial.orderId || serving.storeId!==initial.storeId || serving.cashSessionId!==initial.cashSessionId || canonical(serving.units.map(u=>u.id))!==canonical(initial.units.map(u=>u.id))) throw new Error('Unit penyajian tidak sesuai');
 if(s.cancellation) {
  validateUnpaidCancellation(s.cancellation);
  if(s.cancellation.orderId!==orderId || s.cancellation.storeId!==meta.storeId || s.cancellation.cashSessionId!==s.session.id || canonical(s.cancellation.unitIds)!==canonical(initial.units.map(u=>u.id)) || serving.units.some(u=>u.status!=='cancelled')) throw new Error('Pembatalan unpaid tidak sesuai');
 } else if(s.returns.length) throw new Error('Return tanpa pembatalan');
 const returned=new Set<string>();for(const event of s.returns) {validateUnpaidReturn(event);if(event.orderId!==orderId || event.storeId!==meta.storeId || event.cashSessionId!==s.session.id || event.cancellationId!==s.cancellation?.id) throw new Error('Return asing');for(const unit of event.units) {const item=s.batch.draft.items.find(i=>i.unitIds.includes(unit.id));if(returned.has(unit.id) || !item || s.batch.skuGroups.find(m=>m.skuId===item.skuId)?.groupId!==unit.groupId) throw new Error('Return duplikat atau grup berbeda');returned.add(unit.id);}}
 return serving;
}
function returnEffects(s:UnpaidSources,cancellation:UnpaidCancellationEvent,unitIds:string[],option:ReturnOption,meta:StockMetadata) {
 const plan=planStockReturn(s.batch,s.returns.flatMap(r=>r.units.map(u=>u.id)),s.groups,cancellation.unitIds,unitIds,option,meta,s.returns.length);
 const event:UnpaidReturnEvent={id:`unpaid-return:${meta.operationId}`,cancellationId:cancellation.id,orderId:cancellation.orderId,storeId:meta.storeId,cashSessionId:s.session.id,units:plan.units,reason:option.reason,sellable:true,actorId:meta.actorId,recordedAt:meta.recordedAt};validateUnpaidReturn(event);
 return {event,state:plan.state,ledger:plan.groupIds.map(groupId=>({id:`unpaid-return-ledger:${meta.operationId}:${groupId}`,operationId:meta.operationId,value:{kind:'stock-return',event,groupId,delta:plan.units.filter(u=>u.groupId===groupId).length}}))};
}
function envelope(meta:StockMetadata,kind:string,orderId:string) {return {operationId:meta.operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind,targetId:orderId};}
export function makeUnpaidCancellationChange(s:UnpaidSources,data:CancelUnpaidInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedBatchRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock' || !text(data.orderId) || !text(data.reason,500) || data.kitchenConfirmed!==true || data.expectedBatchRevision!==0 || !rev(data.expectedSessionRevision)) throw new Error('Intent pembatalan unpaid tidak sah');
 const before=checkSources(s,data.orderId,meta,data.expectedServingRevision);if(s.cancellation || s.returns.length || before.units.some(u=>u.status!=='processed')) throw new Error('Batch tidak dapat dibatalkan');
 const event:UnpaidCancellationEvent={id:`unpaid-cancel:${meta.operationId}`,orderId:data.orderId,storeId:meta.storeId,cashSessionId:s.session.id,unitIds:before.units.map(u=>u.id),reason:data.reason,kitchenConfirmed:true,actorId:meta.actorId,recordedAt:meta.recordedAt};validateUnpaidCancellation(event);
 const after={...before,units:before.units.map(u=>({...u,status:'cancelled' as const}))};
 let ret:ReturnType<typeof returnEffects>|null=null;
 if(data.returnStock!==null) {const option=data.returnStock;if(!option || Object.keys(option).sort().join(',')!=='expectedReturnRevision,groups,reason,sellable,unitIds') throw new Error('Opsi return tidak sah');ret=returnEffects(s,event,option.unitIds,{reason:option.reason,sellable:option.sellable,expectedReturnRevision:option.expectedReturnRevision,groups:option.groups},meta);}
 return {...envelope(meta,'cancellation.unpaid',data.orderId),payload:{data,metadata:meta,contractVersion:1},state:[{key:unpaidCancellationKey(data.orderId),expectedRevision:null,value:{recordType:'unpaid-cancellation',schemaVersion:1,cancellation:event}},{key:`serving:${data.orderId}`,expectedRevision:data.expectedServingRevision,value:{recordType:'serving',schemaVersion:2,serving:after}},...(ret?[{key:unpaidReturnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'unpaid-stock-returns',schemaVersion:1,returns:[ret.event]}},...ret.state]:[])],ledger:ret?.ledger ?? [],audit:[{id:`unpaid-cancel-audit:${meta.operationId}`,operationId:meta.operationId,value:{cancellation:event,stockReturn:ret?.event ?? null,before,after,policyVersion:meta.policyVersion}}],outbox:{id:`unpaid-cancel-outbox:${meta.operationId}`,operationId:meta.operationId,value:{orderId:data.orderId}},result:{cancellation:event,stockReturn:ret?.event ?? null,serving:after,cancellationRevision:0,servingRevision:(data.expectedServingRevision ?? -1)+1,returnRevision:ret?0:null}};
}
export function makeUnpaidReturnChange(s:UnpaidSources,data:ReturnUnpaidInput,meta:StockMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).sort().join(',')!=='expectedBatchRevision,expectedCancellationRevision,expectedReturnRevision,expectedServingRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds' || !text(data.orderId) || data.expectedBatchRevision!==0 || data.expectedCancellationRevision!==0 || !rev(data.expectedServingRevision) || !rev(data.expectedSessionRevision)) throw new Error('Intent return unpaid tidak sah');
 checkSources(s,data.orderId,meta,data.expectedServingRevision);if(!s.cancellation) throw new Error('Pembatalan asal tidak ditemukan');
 const ret=returnEffects(s,s.cancellation,data.unitIds,{reason:data.reason,sellable:data.sellable,expectedReturnRevision:data.expectedReturnRevision,groups:data.groups},meta);
 return {...envelope(meta,'return.unpaid',data.orderId),payload:{data,metadata:meta,contractVersion:1},state:[{key:unpaidReturnKey(data.orderId),expectedRevision:data.expectedReturnRevision,value:{recordType:'unpaid-stock-returns',schemaVersion:1,returns:[...s.returns,ret.event]}},...ret.state],ledger:ret.ledger,audit:[{id:`unpaid-return-audit:${meta.operationId}`,operationId:meta.operationId,value:{stockReturn:ret.event,policyVersion:meta.policyVersion}}],outbox:{id:`unpaid-return-outbox:${meta.operationId}`,operationId:meta.operationId,value:{orderId:data.orderId}},result:{stockReturn:ret.event,returnRevision:s.returns.length}};
}
function get(snapshot:Snapshot,key:string,type:BusinessRecord['recordType'],expected:number|null):BusinessRecord|undefined {
 const row=snapshot.state.find(r=>r.key===key);if((row?.revision ?? null)!==expected) throw new Error(`Revisi ${key} berubah`);if(!row)return;validateBusinessRecord(row.value);const value=row.value as BusinessRecord;if(value?.recordType!==type) throw new Error(`Sumber ${key} tidak sah`);return value;
}
const forbidden=['settlement','payment','customer-job','refund-history','paid-cancellations','served-refunds','stock-returns','free-cancellations','free-stock-returns','payment-corrections'];
function load(snapshot:Snapshot,orderId:string,storeId:string,servingRevision:number|null,cancellationRevision:number|null,returnRevision:number|null,sessionRevision:number,groups:GroupSource[]):UnpaidSources {
 const batch=get(snapshot,`first-batch:${orderId}`,'first-batch',0);
 if(batch?.recordType!=='first-batch' || batch.batch.storeId!==storeId || forbidden.some(prefix=>snapshot.state.some(r=>r.key===`${prefix}:${orderId}`))) throw new Error('Sumber unpaid tidak sah');
 const source=snapshot.receipts.find(r=>{const c=JSON.parse(r.payload) as AtomicChange;return c.state.some(x=>x.key===`first-batch:${orderId}`);});
 if(!source || (JSON.parse(source.payload) as AtomicChange).kind!=='batch.confirm-first') throw new Error('Asal batch tidak didukung');
 const session=get(snapshot,`cash-session:${batch.batch.draft.cashSessionId}`,'cash-session',sessionRevision),serving=get(snapshot,`serving:${orderId}`,'serving',servingRevision),cancellation=get(snapshot,unpaidCancellationKey(orderId),'unpaid-cancellation',cancellationRevision),returns=get(snapshot,unpaidReturnKey(orderId),'unpaid-stock-returns',returnRevision);
 if(session?.recordType!=='cash-session' || (serving && serving.recordType!=='serving') || (cancellation && cancellation.recordType!=='unpaid-cancellation') || (returns && returns.recordType!=='unpaid-stock-returns') || !Array.isArray(groups)) throw new Error('Histori unpaid tidak sah');
 return {batch:batch.batch,session:session.session,serving:serving?.serving ?? null,cancellation:cancellation?.cancellation ?? null,returns:returns?.returns ?? [],groups:groups.map(g=>{const row=get(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision);if(row?.recordType!=='stock-group') throw new Error('Grup tidak sah');return row.stockGroup;})};
}
/** Internal only. T-04 must authorize actor, device and policy before integration. */
export function cancelUnpaidFirstBatch(db:BerrieDatabase,input:CancelUnpaidInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CancelUnpaidInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{const prior=await db.receipts.get(meta.operationId);if(prior){const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='cancellation.unpaid' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId)) throw new Error('Pesanan tidak sah');const snapshot=await checkpoint(db);validateCheckpoint(snapshot);const ret=data.returnStock;if(ret!==null && (!ret || !Array.isArray(ret.groups))) throw new Error('Sumber return tidak sah');
  return commit(makeUnpaidCancellationChange(load(snapshot,data.orderId,meta.storeId,data.expectedServingRevision,null,ret?.expectedReturnRevision ?? null,data.expectedSessionRevision,ret?.groups ?? []),data,meta));});
}
export function returnUnpaidStock(db:BerrieDatabase,input:ReturnUnpaidInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ReturnUnpaidInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{const prior=await db.receipts.get(meta.operationId);if(prior){const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='return.unpaid' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  if(!data || !text(data.orderId) || !Array.isArray(data.groups)) throw new Error('Sumber return tidak sah');const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  return commit(makeUnpaidReturnChange(load(snapshot,data.orderId,meta.storeId,data.expectedServingRevision,data.expectedCancellationRevision,data.expectedReturnRevision,data.expectedSessionRevision,data.groups),data,meta));});
}
export async function readUnpaidCancellationStatus(db:BerrieDatabase,storeId:string,orderId:string) {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);const batch=snapshot.state.find(r=>r.key===`first-batch:${orderId}`),sessionId=(batch?.value as Extract<BusinessRecord,{recordType:'first-batch'}>)?.batch?.draft.cashSessionId;
 const session=snapshot.state.find(r=>r.key===`cash-session:${sessionId}`),serving=snapshot.state.find(r=>r.key===`serving:${orderId}`),c=snapshot.state.find(r=>r.key===unpaidCancellationKey(orderId)),r=snapshot.state.find(row=>row.key===unpaidReturnKey(orderId));if(!session) throw new Error('Sesi tidak ditemukan');
 const s=load(snapshot,orderId,storeId,serving?.revision ?? null,c?.revision ?? null,r?.revision ?? null,session.revision,[]);checkSources(s,orderId,{storeId} as StockMetadata,serving?.revision ?? null);
 return structuredClone({batch:s.batch,serving:s.serving ?? initialServing(s.batch),cancellation:s.cancellation,returns:s.returns,batchRevision:0,servingRevision:serving?.revision ?? null,cancellationRevision:c?.revision ?? null,returnRevision:r?.revision ?? null,sessionRevision:session.revision});
}
