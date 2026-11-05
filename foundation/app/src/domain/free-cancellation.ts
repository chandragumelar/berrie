import { validateFirstBatch, type FirstBatch } from './first-batch';
import { validateServingState, type ServingState } from './serving';
import { freezeSettlement, validateSettlementSnapshot, type SettlementSnapshot } from './settlement';
import type { RefundSelection } from './served-refund';
import { draftDateCode } from './draft';

export interface FreeCancellationEvent {
 id:string; settlementId:string; orderId:string; storeId:string; cashSessionId:string;
 unitIds:string[]; reason:string; kitchenConfirmed:true; actorId:string; recordedAt:string;
}
export interface FreeStockReturnEvent {
 id:string; settlementId:string; orderId:string; storeId:string; cashSessionId:string;
 source:'cancellation'|'served'; cancellationId:string|null; units:{id:string;groupId:string}[];
 reason:string; sellable:true; actorId:string; recordedAt:string;
}
const id=(value:unknown):value is string=>typeof value==='string' && !!value.trim() && value.length<=200;
const reason=(value:unknown)=>typeof value==='string' && !!value.trim() && value.length<=500;
function plain(value:unknown):value is Record<string,unknown> { return !!value && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype; }
export function validateFreeCancellationEvent(value:unknown):asserts value is FreeCancellationEvent {
 if(!plain(value) || Object.keys(value).sort().join(',')!=='actorId,cashSessionId,id,kitchenConfirmed,orderId,reason,recordedAt,settlementId,storeId,unitIds' || ![value.actorId,value.cashSessionId,value.id,value.orderId,value.settlementId,value.storeId].every(id) || !reason(value.reason) || value.kitchenConfirmed!==true || typeof value.recordedAt!=='string' || !Array.isArray(value.unitIds) || !value.unitIds.length || !value.unitIds.every(id) || new Set(value.unitIds).size!==value.unitIds.length) throw new Error('Pembatalan gratis tidak sah');
 draftDateCode(value.recordedAt,'UTC');
}
export function validateFreeStockReturnEvent(value:unknown):asserts value is FreeStockReturnEvent {
 if(!plain(value) || Object.keys(value).sort().join(',')!=='actorId,cancellationId,cashSessionId,id,orderId,reason,recordedAt,sellable,settlementId,source,storeId,units' || ![value.actorId,value.cashSessionId,value.id,value.orderId,value.settlementId,value.storeId].every(id) || !reason(value.reason) || value.sellable!==true || typeof value.recordedAt!=='string' || !((value.source==='served' && value.cancellationId===null) || (value.source==='cancellation' && id(value.cancellationId))) || !Array.isArray(value.units) || !value.units.length) throw new Error('Return gratis tidak sah');
 draftDateCode(value.recordedAt,'UTC');
 const seen=new Set<string>();
 for(const unit of value.units) {
  if(!plain(unit) || Object.keys(unit).sort().join(',')!=='groupId,id' || !id(unit.id) || !id(unit.groupId) || seen.has(unit.id)) throw new Error('Unit return gratis tidak sah');
  seen.add(unit.id);
 }
}

function normalized(value:unknown):unknown {
 if(Array.isArray(value)) return value.map(normalized);
 if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,normalized(item)]));
 return value;
}

/** Verifies all three immutable sources, including the exact settlement snapshot. */
export function validateFreeSources(batch:FirstBatch, settlement:SettlementSnapshot, serving:ServingState):void {
 validateFirstBatch(batch); validateSettlementSnapshot(settlement); validateServingState(serving,true);
 const d=batch.draft;
 const expected=freezeSettlement(d.orderId,d.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo,identity:{choices:i.choices.map(c=>c.id),toppings:i.toppings.map(t=>t.id),serving:i.serving,note:i.note}})),d.discount,d.taxBp,d.serviceBp,'free');
 if(settlement.source!=='free' || JSON.stringify(normalized(settlement))!==JSON.stringify(normalized(expected)) || serving.orderId!==d.orderId || serving.storeId!==batch.storeId || serving.cashSessionId!==d.cashSessionId) throw new Error('Sumber pembatalan gratis tidak sesuai');
 const ids=d.items.flatMap(i=>i.unitIds).sort();
 if(JSON.stringify(ids)!==JSON.stringify(serving.units.map(u=>u.id).sort())) throw new Error('Unit penyajian tidak sesuai');
}

/** Selects only processed units of an immutable, free first-batch settlement. */
export function planFreeCancellation(batch:FirstBatch, settlement:SettlementSnapshot, serving:ServingState, selection:RefundSelection[]):string[] {
 validateFreeSources(batch,settlement,serving);
 const d=batch.draft;
 if(!Array.isArray(selection) || !selection.length) throw new Error('Pilihan pembatalan tidak sah');
 const selected:string[]=[], items=new Set<string>();
 for(const row of selection) {
  if(!row || typeof row!=='object' || Array.isArray(row) || Object.keys(row).sort().join(',')!=='itemId,quantity' || typeof row.itemId!=='string' || items.has(row.itemId) || !Number.isSafeInteger(row.quantity) || row.quantity<1 || row.quantity>999) throw new Error('Pilihan pembatalan tidak sah');
  items.add(row.itemId);
  const item=d.items.find(i=>i.id===row.itemId);
  if(!item) throw new Error('Item tidak ditemukan');
  const eligible=item.unitIds.filter(id=>serving.units.some(u=>u.id===id && u.status==='processed')).sort();
  if(eligible.length<row.quantity) throw new Error('Unit tidak tersedia');
  selected.push(...eligible.slice(0,row.quantity));
 }
 return selected;
}
