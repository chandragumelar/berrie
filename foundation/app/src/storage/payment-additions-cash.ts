import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { validateDraft, type OrderDraft } from '../domain/draft';
import { freezeSettlement } from '../domain/settlement';
import { validateCashPayment, type CashPayment } from '../domain/payment';
import { initialServing, validateServingState, type ServingState } from '../domain/serving';
import type { FirstBatch } from '../domain/first-batch';
import { cashBalance, type CashSession } from '../domain/cash-session';
import { makeAdditionalBatch, planAdditionalBatchDebits, type AdditionalBatch, type OrderAdditions } from '../domain/order-additions';
import { additionsKey, additionalBatchKey, additionalKitchenJobKey } from './order-additions';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import { catalogKey } from './simple-catalog';
import { mappingKey, mappingRecord } from './sku-stock-mappings';
import { cashMovements } from './cash-sessions';
import type { CatalogDraftInput } from './authorized-drafts';
import type { StockMetadata } from './stock-groups';

export interface AdditionsCashInput {
 orderId:string; expectedBatchRevision:number; expectedServingRevision:number|null; expectedSessionRevision:number; expectedCatalogRevision:number; expectedTotal:number; received:number; items:CatalogDraftInput['items'];
}

const itemLines=(draft:OrderDraft)=>draft.items.map(item=>({unitIds:item.unitIds,skuId:item.skuId,skuPrice:item.skuPrice,toppingPrice:item.toppingPrice,promo:item.promo,identity:{choices:item.choices.map(c=>c.id),toppings:item.toppings.map(t=>t.id),serving:item.serving,note:item.note}}));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const id=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=200;
const int=(v:unknown,min=0):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
const exact=(v:unknown,keys:string[])=>object(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');

function validateInput(value:unknown): asserts value is AdditionsCashInput {
 if(!exact(value,['expectedBatchRevision','expectedCatalogRevision','expectedServingRevision','expectedSessionRevision','expectedTotal','items','orderId','received'])) throw new Error('Input tambahan tidak sah');
 const v=value as AdditionsCashInput;
 if(!id(v.orderId)||!int(v.expectedBatchRevision)||!(v.expectedServingRevision===null||int(v.expectedServingRevision))||!int(v.expectedSessionRevision)||!int(v.expectedCatalogRevision)||!int(v.expectedTotal,1)||!int(v.received,1)||!Array.isArray(v.items)||!v.items.length||!v.items.every(x=>exact(x,['expectedUnitPrice','itemId','note','serving','skuId','unitIds'])&&id(x.itemId)&&id(x.skuId)&&int(x.expectedUnitPrice,1)&&['dine_in','takeaway'].includes(x.serving)&&typeof x.note==='string'&&x.note.length<=200&&Array.isArray(x.unitIds)&&x.unitIds.length>=1&&x.unitIds.length<=999&&x.unitIds.every(id))||new Set(v.items.map(x=>x.itemId)).size!==v.items.length||new Set(v.items.flatMap(x=>x.unitIds)).size!==v.items.reduce((n,x)=>n+x.unitIds.length,0)) throw new Error('Input tambahan tidak sah');
}

/** Deterministic builder: all catalog, stock and historic sources are already validated by the caller transaction. */
export function makeAdditionsCashChange(firstBatch:FirstBatch, batch:AdditionalBatch, additions:OrderAdditions, beforeServing:ServingState|null, session:CashSession, data:AdditionsCashInput, meta:StockMetadata, groups:{row:{key:string;revision:number};stock:{groupId:string;storeId:string;balance:number;baseline:number;minimum:number}}[], before:number):AtomicChange {
 const first=firstBatch.draft;validateDraft(first);validateInput(data);validateBusinessRecord({recordType:'order-additions',schemaVersion:1,additions});
 if(first.orderId!==data.orderId||batch.orderId!==data.orderId||batch.number!==2||additions.batchCount!==1||batch.cashSessionId!==session.id||first.cashSessionId!==session.id||session.storeId!==meta.storeId) throw new Error('Sumber tambahan tidak sah');
 const firstServing=initialServing(firstBatch);
 const previous=beforeServing??firstServing;validateServingState(previous);
 const oldIds=new Set(firstServing.units.map(u=>u.id));if(batch.draft.items.flatMap(i=>i.unitIds).some(unit=>oldIds.has(unit))) throw new Error('Unit tambahan digunakan ulang');
 const allUnits=[...firstServing.units,...batch.draft.items.flatMap(i=>i.unitIds.map(id=>({id,status:'processed' as const})) )];
 if(previous.storeId!==meta.storeId||previous.orderId!==data.orderId||previous.cashSessionId!==session.id||previous.units.some(u=>!oldIds.has(u.id))||new Set(previous.units.map(u=>u.id)).size!==previous.units.length) throw new Error('Sumber penyajian tidak sah');
 const serving:ServingState={...previous,units:[...previous.units,...allUnits.filter(unit=>!oldIds.has(unit.id))]};
 const settlement=freezeSettlement(data.orderId,[...itemLines(first),...itemLines(batch.draft)],{kind:'none'},0,0,'payment');
 if(settlement.totals.total!==data.expectedTotal||data.received<settlement.totals.total) throw new Error('Total atau uang diterima tidak sesuai');
 const payment:CashPayment={id:`payment:${data.orderId}`,orderId:data.orderId,storeId:meta.storeId,cashSessionId:session.id,settlementId:`settlement:${data.orderId}`,paidAt:meta.recordedAt,method:'cash',amount:settlement.totals.total,received:data.received,change:data.received-settlement.totals.total};validateCashPayment(payment);
 const plan=planAdditionalBatchDebits(batch,groups.map(g=>({groupId:g.stock.groupId,balance:g.stock.balance})));if(!plan.ok) throw new Error('Stok tidak cukup');
 const balance=before+payment.amount;if(!int(balance))throw new Error('Saldo kas tidak sah');
 const op=meta.operationId;
 return {operationId:op,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:'payment.multi-batch-cash',targetId:data.orderId,
  payload:{data,metadata:meta,contractVersion:1,sources:{firstBatchRevision:data.expectedBatchRevision,servingRevision:data.expectedServingRevision,sessionRevision:data.expectedSessionRevision,catalogRevision:data.expectedCatalogRevision,groups:groups.map(g=>({groupId:g.stock.groupId,revision:g.row.revision,balance:g.stock.balance})),mappings:batch.skuGroups}},
  state:[{key:additionsKey(data.orderId),expectedRevision:null,value:{recordType:'order-additions',schemaVersion:1,additions:{...additions,batchCount:2,pending:[]}}},{key:additionalBatchKey(data.orderId,2),expectedRevision:null,value:{recordType:'order-batch',schemaVersion:1,batch}},{key:additionalKitchenJobKey(data.orderId,2),expectedRevision:null,value:{recordType:'kitchen-job-addition',schemaVersion:1,batch}},...groups.map(g=>({key:g.row.key,expectedRevision:g.row.revision,value:{recordType:'stock-group' as const,schemaVersion:1 as const,stockGroup:{...g.stock,balance:plan.debits.find(d=>d.groupId===g.stock.groupId)!.after}}})),{key:`serving:${data.orderId}`,expectedRevision:data.expectedServingRevision,value:{recordType:'serving',schemaVersion:1,serving}},{key:`cash-session:${session.id}`,expectedRevision:data.expectedSessionRevision,value:{recordType:'cash-session',schemaVersion:1,session}},{key:payment.settlementId,expectedRevision:null,value:{recordType:'settlement',schemaVersion:1,settlement}},{key:payment.id,expectedRevision:null,value:{recordType:'payment',schemaVersion:1,payment}},{key:`customer-job:${data.orderId}`,expectedRevision:null,value:{recordType:'customer-job',schemaVersion:4,payment,settlement,batches:[firstBatch,batch]}}],
  ledger:[{id:`payment-ledger:${op}`,operationId:op,value:{kind:'sale',sessionId:session.id,storeId:meta.storeId,amount:payment.amount,category:'',description:''}},...plan.debits.map(debit=>({id:`batch-debit:${op}:${debit.groupId}`,operationId:op,value:{storeId:meta.storeId,orderId:data.orderId,...debit}}))],
  audit:[{id:`payment-additions-audit:${op}`,operationId:op,value:{payment,settlement,batch,actorId:meta.actorId,policyVersion:meta.policyVersion,before,after:balance}}],outbox:{id:`payment-additions-outbox:${op}`,operationId:op,value:{orderId:data.orderId,paymentId:payment.id}},result:{orderId:data.orderId,batchNumber:2,payment,settlement,balance,sessionRevision:data.expectedSessionRevision+1}};
}

export async function payAdditionsCash(db:BerrieDatabase,input:AdditionsCashInput,metadata:StockMetadata,locks:LockProvider=navigator.locks,now:()=>string=()=>new Date().toISOString(),guard?:()=>void):Promise<unknown> {
 const data=copyInput(input) as AdditionsCashInput,meta=copyInput(metadata) as StockMetadata;validateInput(data);const intent={data,metadata:meta};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);if(prior){const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as typeof intent;if(c.kind!=='payment.multi-batch-cash'||canonical({data:p.data,metadata:p.metadata})!==canonical(intent))throw new Error('Konflik operation ID');return prior.result;}
  const firstRow=await db.state.get(`first-batch:${data.orderId}`),firstRecord=firstRow?.value as BusinessRecord|undefined;validateBusinessRecord(firstRecord);
  if(!firstRow||firstRow.revision!==data.expectedBatchRevision||firstRecord?.recordType!=='first-batch'||firstRecord.batch.storeId!==meta.storeId||firstRecord.batch.draft.orderId!==data.orderId)throw new Error('Batch pertama berubah');
  const first=firstRecord.batch.draft;if(first.channel!=='store'||first.discount.kind!=='none'||first.taxBp!==0||first.serviceBp!==0||first.items.some(i=>i.skuPrice<=0||i.toppingPrice!==0||i.promo.kind!=='none'||i.choices.length||i.toppings.length))throw new Error('Pesanan di luar cakupan tambahan tunai');
  for(const key of [`settlement:${data.orderId}`,`payment:${data.orderId}`,`customer-job:${data.orderId}`,additionalBatchKey(data.orderId,2),additionalKitchenJobKey(data.orderId,2)])if(await db.state.get(key))throw new Error('Pesanan sudah memiliki hasil tambahan atau pembayaran');
  const headRow=await db.state.get(additionsKey(data.orderId));if(headRow){validateBusinessRecord(headRow.value);throw new Error('Head tambahan sudah ada');}
  const sessionRow=await db.state.get(`cash-session:${first.cashSessionId}`),sessionRecord=sessionRow?.value as BusinessRecord|undefined;validateBusinessRecord(sessionRecord);
  if(!sessionRow||sessionRow.revision!==data.expectedSessionRevision||sessionRecord?.recordType!=='cash-session'||sessionRecord.session.storeId!==meta.storeId)throw new Error('Sesi berubah');
  const catalogRow=await db.state.get(catalogKey(meta.storeId)),catalogRecord=catalogRow?.value as Extract<BusinessRecord,{recordType:'simple-catalog'}>|undefined;
  if(!catalogRow||catalogRow.revision!==data.expectedCatalogRevision||catalogRecord?.recordType!=='simple-catalog')throw new Error('Katalog berubah');
  const oldUnits=new Set(first.items.flatMap(i=>i.unitIds));const items=data.items.map(i=>{const menu=catalogRecord.catalog.menus.find(m=>m.skuId===i.skuId&&m.active);if(!menu||menu.price!==i.expectedUnitPrice||i.unitIds.some(unit=>oldUnits.has(unit)))throw new Error('SKU, harga atau unit berubah');return {id:i.itemId,skuId:i.skuId,unitIds:i.unitIds,name:menu.name,skuPrice:menu.price,toppingPrice:0,promo:{kind:'none' as const,revision:0},choices:[],toppings:[],serving:i.serving,note:i.note};});
  const head:OrderAdditions={storeId:meta.storeId,orderId:data.orderId,cashSessionId:first.cashSessionId,batchCount:1,pending:[]};
  const mappings=[] as {skuId:string;groupId:string}[];for(const skuId of [...new Set(items.map(i=>i.skuId))]){const mapRow=await db.state.get(mappingKey(meta.storeId,skuId));if(!mapRow)throw new Error('Pemetaan stok tidak ditemukan');const map=mappingRecord(mapRow.value).mapping;if(map.storeId!==meta.storeId||map.skuId!==skuId)mappings.push({skuId,groupId:''});else mappings.push({skuId,groupId:map.groupId});}
  const batch=makeAdditionalBatch(head,first,2,now(),items,mappings);
  const groups=[] as {row:{key:string;revision:number};stock:{groupId:string;storeId:string;balance:number;baseline:number;minimum:number}}[];for(const gid of [...new Set(mappings.map(m=>m.groupId))]){const row=await db.state.get(`stock-group:${gid}`),record=row?.value as BusinessRecord|undefined;validateBusinessRecord(record);if(!row||record?.recordType!=='stock-group'||record.stockGroup.storeId!==meta.storeId)throw new Error('Saldo stok berubah');groups.push({row,stock:record.stockGroup});}
  const servingRow=await db.state.get(`serving:${data.orderId}`);if((servingRow?.revision??null)!==data.expectedServingRevision)throw new Error('Penyajian berubah');let serving:ServingState|null=null;if(servingRow){validateBusinessRecord(servingRow.value);const r=servingRow.value as BusinessRecord;if(r.recordType!=='serving')throw new Error('Penyajian tidak sah');serving=r.serving;}
  const count=await db.state.get(`cash-count:${first.cashSessionId}`);const countRecord=count?.value as BusinessRecord|undefined;if(countRecord?.recordType==='cash-count'&&['save','revise','close'].includes(countRecord.history.events.at(-1)?.action??''))throw new Error('Sesi tidak tersedia');
  guard?.();const before=cashBalance(cashMovements((await db.receipts.toArray()).map(r=>JSON.parse(r.payload) as AtomicChange),first.cashSessionId),sessionRecord.session);
  return commit(makeAdditionsCashChange(firstRecord.batch,batch,head,serving,sessionRecord.session,data,meta,groups,before));
 },guard);
}
