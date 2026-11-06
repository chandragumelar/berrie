import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { cashBalance, type CashSession } from '../domain/cash-session';
import { type FirstBatch } from '../domain/first-batch';
import { effectivePaymentMethod, type MethodCorrection, type Payment, type PaymentMethod } from '../domain/payment';
import { planServedRefund, validateServedRefundEvent, validateStockReturnEvent, type RefundSelection, type ServedRefundEvent, type StockReturnEvent } from '../domain/served-refund';
import type { ServingState } from '../domain/serving';
import type { SettlementSnapshot } from '../domain/settlement';
import type { StockGroup } from '../domain/stock-group';
import { cashMovements } from './cash-sessions';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import type { StockMetadata } from './stock-groups';
import { validateCheckpoint } from './validate-checkpoint';

export interface GroupSource { groupId:string; revision:number; balance:number }
export interface ReturnOption { reason:string; sellable:true; expectedReturnRevision:number|null; groups:GroupSource[] }
export interface ServedRefundInput { orderId:string; expectedRefundRevision:number|null; expectedServingRevision:number; expectedCorrectionRevision:number|null; expectedSessionRevision:number; selection:RefundSelection[]; method:PaymentMethod|null; reason:string; moneyReturned:true; returnStock:ReturnOption|null }
export interface ReturnRefundInput { orderId:string; refundId:string; unitIds:string[]; expectedRefundRevision:number; expectedReturnRevision:number|null; groups:GroupSource[]; reason:string; sellable:true }
export interface RefundSources { batch:FirstBatch; payment:Payment; settlement:SettlementSnapshot; serving:ServingState; corrections:MethodCorrection[]; session:CashSession; refunds:ServedRefundEvent[]; returns:StockReturnEvent[]; groups:StockGroup[]; before:number; refundSchemaVersion?:1|2; sessionRevision?:number }
export const refundKey=(orderId:string)=>`served-refunds:${orderId}`;
export const returnKey=(orderId:string)=>`stock-returns:${orderId}`;
const validRevision=(n:unknown,nullable=false)=>nullable && n===null || typeof n==='number' && Number.isSafeInteger(n) && n>=0 && n<Number.MAX_SAFE_INTEGER;
const text=(s:unknown,max=500)=>typeof s==='string' && !!s.trim() && s.length<=max;
function history(refunds:ServedRefundEvent[]) { return refunds.map(r=>({unitIds:r.units.map(u=>u.id),amount:r.amount,source:'payment' as const})); }
function sourceChecks(s:RefundSources,orderId:string,meta:StockMetadata):void {
 if(!s || s.batch.draft.orderId!==orderId || s.payment.orderId!==orderId || s.batch.storeId!==meta.storeId || s.session.storeId!==meta.storeId || s.session.id!==s.payment.cashSessionId || !Array.isArray(s.refunds) || !Array.isArray(s.returns) || !Array.isArray(s.groups)) throw new Error('Sumber refund tidak sah');
 for(const r of s.refunds) {validateServedRefundEvent(r);if(r.orderId!==orderId || r.storeId!==meta.storeId || r.paymentId!==s.payment.id) throw new Error('Histori refund asing');}
 for(const r of s.returns) {validateStockReturnEvent(r,true);if(r.orderId!==orderId || r.storeId!==meta.storeId || r.paymentId!==s.payment.id) throw new Error('Histori return asing');}
}
export function returnEffects(s:Pick<RefundSources,'batch'|'returns'|'groups'>, source:ServedRefundEvent|import('../domain/paid-cancellation').PaidCancellationEvent, unitIds:string[], option:ReturnOption, meta:StockMetadata) {
 const {units,state,groupIds}=planStockReturn(s.batch,s.returns.flatMap(r=>r.units.map(u=>u.id)),s.groups,source.units.map(u=>u.id),unitIds,option,meta,s.returns.length);
 const event:StockReturnEvent={id:`return:${meta.operationId}`,...('kitchenConfirmed' in source?{cancellationId:source.id}:{refundId:source.id}),paymentId:source.paymentId,orderId:source.orderId,storeId:source.storeId,units,reason:option.reason,actorId:meta.actorId,recordedAt:meta.recordedAt,sellable:true};validateStockReturnEvent(event,true);
 const ledger=groupIds.map(groupId=>({id:`return-ledger:${meta.operationId}:${groupId}`,operationId:meta.operationId,value:{kind:'stock-return',event,groupId,delta:units.filter(u=>u.groupId===groupId).length}}));
 return {event,state,ledger};
}
/** Shared physical stock planning; event identity and authorization stay with each caller. */
export function planStockReturn(batch:FirstBatch,alreadyReturned:string[],groups:StockGroup[],eligibleIds:string[],unitIds:string[],option:ReturnOption,meta:StockMetadata,returnCount:number) {
 if(!option || Object.keys(option).sort().join(',')!=='expectedReturnRevision,groups,reason,sellable' || option.sellable!==true || !text(option.reason) || !validRevision(option.expectedReturnRevision,true) || option.expectedReturnRevision!== (returnCount?returnCount-1:null) || !Array.isArray(unitIds) || !unitIds.length || unitIds.some(id=>!text(id,200)) || new Set(unitIds).size!==unitIds.length || !Array.isArray(option.groups)) throw new Error('Pilihan return tidak sah');
 const already=new Set(alreadyReturned), eligible=new Set(eligibleIds);
 const units=unitIds.map(id=>{
  if(!eligible.has(id) || already.has(id)) throw new Error('Unit return tidak tersedia');
  const item=batch.draft.items.find(i=>i.unitIds.includes(id)), mapping=batch.skuGroups.find(m=>m.skuId===item?.skuId);
  if(!item || !mapping) throw new Error('Grup asal tidak ditemukan');
  return {id,groupId:mapping.groupId};
 });
 const groupIds=[...new Set(units.map(u=>u.groupId))].sort();
 if(option.groups.length!==groupIds.length || groups.length!==groupIds.length || new Set(option.groups.map(g=>g.groupId)).size!==groupIds.length) throw new Error('Sumber grup return tidak lengkap');
 const state=groupIds.map(groupId=>{
  const source=option.groups.find(g=>g.groupId===groupId),group=groups.find(g=>g.groupId===groupId),qty=units.filter(u=>u.groupId===groupId).length;
  if(!source || Object.keys(source).sort().join(',')!=='balance,groupId,revision' || !validRevision(source.revision) || !Number.isSafeInteger(source.balance) || !group || group.storeId!==meta.storeId || source.balance!==group.balance || !Number.isSafeInteger(group.balance+qty)) throw new Error('Sumber grup return berubah');
  return {key:`stock-group:${groupId}`,expectedRevision:source.revision,value:{recordType:'stock-group',schemaVersion:1,stockGroup:{...group,balance:group.balance+qty}}};
 });
 return {units,state,groupIds};
}
/** Deterministic operation, reconstructed from historical revisions by validateTransitions. */
export function makeServedRefundChange(s:RefundSources,data:ServedRefundInput,meta:StockMetadata):AtomicChange {
 if(!data || Object.keys(data).sort().join(',')!=='expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,method,moneyReturned,orderId,reason,returnStock,selection' || !text(data.orderId,200) || !validRevision(data.expectedRefundRevision,true) || !validRevision(data.expectedServingRevision) || !validRevision(data.expectedCorrectionRevision,true) || !validRevision(data.expectedSessionRevision) || !text(data.reason) || data.moneyReturned!==true || !(data.method===null || ['cash','qris','transfer','ewallet'].includes(data.method))) throw new Error('Intent refund tidak sah');
 sourceChecks(s,data.orderId,meta);
 if(data.expectedRefundRevision!==(s.refunds.length?s.refunds.length-1:null) || data.expectedCorrectionRevision!==(s.corrections.length?s.corrections.length-1:null)) throw new Error('Revisi histori berubah');
 const selected=planServedRefund(s.batch,s.payment,s.settlement,s.serving,history(s.refunds),data.selection),method=data.method ?? effectivePaymentMethod(s.payment,s.corrections);
 const event:ServedRefundEvent={id:`refund:${meta.operationId}`,paymentId:s.payment.id,orderId:data.orderId,storeId:meta.storeId,cashSessionId:s.session.id,units:selected.unitIds.map(id=>({id,amount:s.settlement.totals.allocations.find(a=>a.id===id)!.total})),amount:selected.amount,method,reason:data.reason,actorId:meta.actorId,recordedAt:meta.recordedAt,moneyReturned:true};validateServedRefundEvent(event);
 const balance=s.before-(method==='cash'?event.amount:0);if(!Number.isSafeInteger(s.before) || s.before<0 || !Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak cukup');
 const ret=data.returnStock===null?null:returnEffects(s,event,event.units.map(u=>u.id),data.returnStock,meta),operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'refund.served',targetId:data.orderId,payload:{data,metadata:meta,contractVersion:s.refundSchemaVersion===2 || (data.returnStock!==null && s.returns.some(r=>'cancellationId' in r))?2:1},state:[{key:refundKey(data.orderId),expectedRevision:data.expectedRefundRevision,value:{recordType:'served-refunds',schemaVersion:s.refundSchemaVersion===2?2:1,refunds:[...s.refunds,event]}},{key:`cash-session:${s.session.id}`,expectedRevision:data.expectedSessionRevision,value:{recordType:'cash-session',schemaVersion:1,session:s.session}},...(ret?[{key:returnKey(data.orderId),expectedRevision:data.returnStock!.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:s.returns.some(r=>'cancellationId' in r)?2:1,returns:[...s.returns,ret.event]}},...ret.state]:[])],ledger:[{id:`refund-ledger:${operationId}`,operationId,value:{kind:'refund',sessionId:s.session.id,storeId:meta.storeId,refund:event}},...(ret?.ledger ?? [])],audit:[{id:`refund-audit:${operationId}`,operationId,value:{refund:event,stockReturn:ret?.event ?? null,before:s.before,after:balance,policyVersion:meta.policyVersion}}],outbox:{id:`refund-outbox:${operationId}`,operationId,value:{orderId:data.orderId,paymentId:s.payment.id}},result:{refund:event,stockReturn:ret?.event ?? null,balance,sessionRevision:data.expectedSessionRevision+1,refundRevision:s.refunds.length}};
}
export function makeStockReturnChange(s:RefundSources,data:ReturnRefundInput,meta:StockMetadata,forceSessionSource=false):AtomicChange {
 if(!data || Object.keys(data).sort().join(',')!=='expectedRefundRevision,expectedReturnRevision,groups,orderId,reason,refundId,sellable,unitIds' || !text(data.orderId,200) || !text(data.refundId,200) || !validRevision(data.expectedRefundRevision) || data.expectedRefundRevision!==s.refunds.length-1) throw new Error('Intent return tidak sah');
 sourceChecks(s,data.orderId,meta);const refund=s.refunds.find(r=>r.id===data.refundId);if(!refund) throw new Error('Refund asal tidak ditemukan');
 const ret=returnEffects(s,refund,data.unitIds,{reason:data.reason,sellable:data.sellable,expectedReturnRevision:data.expectedReturnRevision,groups:data.groups},meta),operationId=meta.operationId;
 const contractVersion=forceSessionSource || s.refundSchemaVersion===2 || s.returns.some(r=>'cancellationId' in r)?2:1;
 if(contractVersion===2 && !validRevision(s.sessionRevision)) throw new Error('Revisi sesi return tidak sah');
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'refund.return-stock',targetId:data.orderId,payload:contractVersion===2?{data,metadata:meta,contractVersion,sessionSource:{id:s.session.id,revision:s.sessionRevision}}:{data,metadata:meta,contractVersion},state:[{key:returnKey(data.orderId),expectedRevision:data.expectedReturnRevision,value:{recordType:'stock-returns',schemaVersion:s.returns.some(r=>'cancellationId' in r)?2:1,returns:[...s.returns,ret.event]}},...ret.state],ledger:ret.ledger,audit:[{id:`return-audit:${operationId}`,operationId,value:{stockReturn:ret.event,policyVersion:meta.policyVersion}}],outbox:{id:`return-outbox:${operationId}`,operationId,value:{orderId:data.orderId,refundId:refund.id}},result:{stockReturn:ret.event,returnRevision:s.returns.length}};
}

function getTyped(snapshot:Awaited<ReturnType<typeof checkpoint>>,key:string,type:BusinessRecord['recordType'],revision?:number|null):BusinessRecord {
 const row=snapshot.state.find(r=>r.key===key);validateBusinessRecord(row?.value);const v=row?.value as BusinessRecord;
 if(!row || v?.recordType!==type || (revision!==undefined && row.revision!==revision)) throw new Error(`Sumber ${key} atau revisi tidak sesuai`);
 return v;
}
function optionalTyped(snapshot:Awaited<ReturnType<typeof checkpoint>>,key:string,type:BusinessRecord['recordType'],revision:number|null):BusinessRecord|undefined {
 const row=snapshot.state.find(r=>r.key===key);if((row?.revision ?? null)!==revision) throw new Error('Revisi histori berubah');if(!row)return undefined;
 validateBusinessRecord(row.value);const value=row.value as BusinessRecord;if(value?.recordType!==type) throw new Error('Histori tidak sah');return value;
}
function loadSources(snapshot:Awaited<ReturnType<typeof checkpoint>>,orderId:string,storeId:string,refundRevision:number|null,returnRevision:number|null,servingRevision:number|undefined,correctionRevision:number|null,sessionRevision:number|undefined,groups:GroupSource[]):RefundSources {
 const batch=getTyped(snapshot,`first-batch:${orderId}`,'first-batch',0),payment=getTyped(snapshot,`payment:${orderId}`,'payment',0),settlement=getTyped(snapshot,`settlement:${orderId}`,'settlement',0),serving=getTyped(snapshot,`serving:${orderId}`,'serving',servingRevision);
 if(batch.recordType!=='first-batch' || payment.recordType!=='payment' || settlement.recordType!=='settlement' || serving.recordType!=='serving' || batch.batch.storeId!==storeId || payment.payment.storeId!==storeId) throw new Error('Sumber refund tidak ditemukan');
 const session=getTyped(snapshot,`cash-session:${payment.payment.cashSessionId}`,'cash-session',sessionRevision);
 const refunds=optionalTyped(snapshot,refundKey(orderId),'served-refunds',refundRevision),returns=optionalTyped(snapshot,returnKey(orderId),'stock-returns',returnRevision),corrections=optionalTyped(snapshot,`payment-corrections:${orderId}`,'payment-corrections',correctionRevision);
 if(session.recordType!=='cash-session' || (refunds && refunds.recordType!=='served-refunds') || (returns && returns.recordType!=='stock-returns') || (corrections && corrections.recordType!=='payment-corrections') || !Array.isArray(groups)) throw new Error('Sumber refund tidak sah');
 const groupRows=groups.map(g=>getTyped(snapshot,`stock-group:${g.groupId}`,'stock-group',g.revision)).map(g=>{if(g.recordType!=='stock-group') throw new Error('Grup tidak sah');return g.stockGroup;});
 return {batch:batch.batch,payment:payment.payment,settlement:settlement.settlement,serving:serving.serving,session:session.session,refunds:refunds?.refunds ?? [],returns:returns?.returns ?? [],corrections:corrections?.corrections ?? [],groups:groupRows,refundSchemaVersion:refunds?.schemaVersion,sessionRevision:snapshot.state.find(r=>r.key===`cash-session:${session.session.id}`)?.revision,before:cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),session.session.id),session.session)};
}
/** Internal only. T-04 must authorize all reads and commands; metadata is not approval or proof of transfer. */
export function refundServedUnits(db:BerrieDatabase,input:ServedRefundInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ServedRefundInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange,p=change.payload as typeof intent;if(change.kind!=='refund.served' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  if(!data || typeof data.orderId!=='string') throw new Error('Pesanan tidak sah');
  const ret=data.returnStock,retRow=snapshot.state.find(r=>r.key===returnKey(data.orderId));
  const sources=loadSources(snapshot,data.orderId,meta.storeId,data.expectedRefundRevision,ret===null?(retRow?.revision ?? null):ret.expectedReturnRevision,data.expectedServingRevision,data.expectedCorrectionRevision,data.expectedSessionRevision,ret?.groups ?? []);
  return commit(makeServedRefundChange(sources,data,meta));
 });
}
/** Return may be recorded after its refund; the unit and event remain distinct. */
export function returnRefundedStock(db:BerrieDatabase,input:ReturnRefundInput,metadata:StockMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as ReturnRefundInput,meta=copyInput(metadata) as StockMetadata,intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const change=JSON.parse(prior.payload) as AtomicChange,p=change.payload as typeof intent;if(change.kind!=='refund.return-stock' || canonical({data:p.data,metadata:p.metadata})!==canonical(intent)) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
  if(!data || typeof data.orderId!=='string') throw new Error('Pesanan tidak sah');
  const correction=snapshot.state.find(r=>r.key===`payment-corrections:${data.orderId}`);
  const sources=loadSources(snapshot,data.orderId,meta.storeId,data.expectedRefundRevision,data.expectedReturnRevision,undefined,correction?.revision ?? null,undefined,data.groups);
  return commit(makeStockReturnChange(sources,data,meta,snapshot.state.some(r=>r.key===`cash-count:${sources.session.id}`)));
 });
}
/** Internal read; T-04 must authorize access. */
export async function readServedRefunds(db:BerrieDatabase,storeId:string,orderId:string):Promise<{refunds:ServedRefundEvent[];returns:StockReturnEvent[];refundRevision:number|null;returnRevision:number|null}> {
 const snapshot=await checkpoint(db);validateCheckpoint(snapshot);
 const payment=getTyped(snapshot,`payment:${orderId}`,'payment',0);if(payment.recordType!=='payment' || payment.payment.storeId!==storeId) throw new Error('Payment tidak ditemukan');
 const rr=snapshot.state.find(r=>r.key===refundKey(orderId)),sr=snapshot.state.find(r=>r.key===returnKey(orderId));
 const refunds=optionalTyped(snapshot,refundKey(orderId),'served-refunds',rr?.revision ?? null),returns=optionalTyped(snapshot,returnKey(orderId),'stock-returns',sr?.revision ?? null);
 if((refunds && refunds.recordType!=='served-refunds') || (returns && returns.recordType!=='stock-returns')) throw new Error('Histori tidak sah');
 return structuredClone({refunds:refunds?.refunds ?? [],returns:returns?.returns ?? [],refundRevision:rr?.revision ?? null,returnRevision:sr?.revision ?? null});
}
