import { validateDraftCancellation, type DraftCancellation } from './draft-cancellation';
import { validateUnpaidCancellation, validateUnpaidReturn, type UnpaidCancellationEvent, type UnpaidReturnEvent } from './unpaid-cancellation';
import { validatePaidCancellationEvent, type PaidCancellationEvent } from './paid-cancellation';
import { validateFreeCancellationEvent, validateFreeStockReturnEvent, type FreeCancellationEvent, type FreeStockReturnEvent } from './free-cancellation';
import { validateCashPayment, validateNoncashPayment, validateMethodCorrection, type MethodCorrection, type CashPayment, type NoncashPayment } from './payment';
import { validatePaymentMethods, type PaymentMethods } from './payment-methods';
import { validateCashSession, type CashSession } from './cash-session';
import { validateServingState, type ServingState } from './serving';
import { validateStockGroup, type StockGroup } from './stock-group';
import { validateFirstBatch, type FirstBatch } from './first-batch';
import { validateDraft, type OrderDraft } from './draft';
import { validateRefundHistory, validateSettlementSnapshot, type RefundRecord, type SettlementSnapshot } from './settlement';
import { validateServedRefundEvent, validateStockReturnEvent, type ServedRefundEvent, type StockReturnEvent } from './served-refund';

export const SETTLEMENT_RECORD = 'settlement' as const;
export const REFUND_HISTORY_RECORD = 'refund-history' as const;
export const DRAFT_RECORD = 'draft' as const;
export const STOCK_GROUP_RECORD = 'stock-group' as const;
export interface SkuStockMapping { storeId:string; skuId:string; groupId:string }
export function validateSkuStockMapping(value:unknown): asserts value is SkuStockMapping {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pemetaan tidak sah');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='groupId,skuId,storeId' || ![v.storeId,v.skuId,v.groupId].every(x=>typeof x==='string' && !!x.trim() && x.length<=200)) throw new Error('Pemetaan tidak sah');
}
export type BusinessRecord =
 | { recordType:'unpaid-cancellation'; schemaVersion:1; cancellation:UnpaidCancellationEvent }
 | { recordType:'unpaid-stock-returns'; schemaVersion:1; returns:UnpaidReturnEvent[] }
 | { recordType:'draft-cancellation'; schemaVersion:1; cancellation:DraftCancellation }
 | { recordType:'free-cancellations'; schemaVersion:1; cancellations:FreeCancellationEvent[] }
 | { recordType:'free-stock-returns'; schemaVersion:1; returns:FreeStockReturnEvent[] }
 | { recordType:'served-refunds'; schemaVersion:1|2; refunds:ServedRefundEvent[] }
 | { recordType:'stock-returns'; schemaVersion:1|2; returns:StockReturnEvent[] }
 | { recordType:'payment-corrections'; schemaVersion:1; corrections:MethodCorrection[] }
 | { recordType:'payment-methods'; schemaVersion:1; methods:PaymentMethods }
 | { recordType:'payment'; schemaVersion:2; payment:NoncashPayment }
 | { recordType:'customer-job'; schemaVersion:3; payment:NoncashPayment; settlement:SettlementSnapshot; batch:FirstBatch }
 | { recordType:'payment'; schemaVersion:1; payment:CashPayment }
 | { recordType:'customer-job'; schemaVersion:1; payment:CashPayment; settlement:SettlementSnapshot; batch:FirstBatch }
 | { recordType:'customer-job'; schemaVersion:2; reason:string; settlement:SettlementSnapshot; batch:FirstBatch }
 | { recordType:'serving'; schemaVersion:1|2; serving:ServingState }
 | { recordType:'paid-cancellations'; schemaVersion:1; cancellations:PaidCancellationEvent[] }
 | { recordType:'cash-session'; schemaVersion:1; session:CashSession }
 | { recordType:'first-batch'; schemaVersion:1|2; batch:FirstBatch }
 | { recordType:'kitchen-job'; schemaVersion:1|2; batch:FirstBatch }
 | { recordType:'sku-stock-mapping'; schemaVersion:1; mapping:SkuStockMapping }
 | { recordType: typeof STOCK_GROUP_RECORD; schemaVersion: 1; stockGroup: StockGroup }
 | { recordType: typeof DRAFT_RECORD; schemaVersion: 1|2; draft: OrderDraft }
 | { recordType: typeof SETTLEMENT_RECORD; schemaVersion: 1; settlement: SettlementSnapshot }
 | { recordType: typeof REFUND_HISTORY_RECORD; schemaVersion: 1; settlement: SettlementSnapshot; refunds: RefundRecord[] };

/** Only the dedicated marker opts a value into this contract. */
export function validateBusinessRecord(value: unknown): void {
 if (value === null || typeof value !== 'object' || !Object.hasOwn(value, 'recordType')) return;
 if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Record bisnis tidak sah');
 const record = value as Record<string, unknown>;
 if (record.schemaVersion !== 1 && !(record.schemaVersion===2 && ['draft','first-batch','kitchen-job','customer-job','payment','serving','stock-returns','served-refunds'].includes(record.recordType as string)) && !(record.schemaVersion===3 && record.recordType==='customer-job')) throw new Error('Versi record bisnis tidak didukung');
 if (record.recordType === 'unpaid-cancellation') { if(Object.keys(record).sort().join(',')!=='cancellation,recordType,schemaVersion') throw new Error('Record pembatalan unpaid tidak sah'); validateUnpaidCancellation(record.cancellation); }
 else if (record.recordType === 'unpaid-stock-returns') { if(Object.keys(record).sort().join(',')!=='recordType,returns,schemaVersion' || !Array.isArray(record.returns) || !record.returns.length) throw new Error('Histori return unpaid tidak sah'); for(const r of record.returns) validateUnpaidReturn(r); }
 else if (record.recordType === 'draft-cancellation') { if(Object.keys(record).sort().join(',')!=='cancellation,recordType,schemaVersion') throw new Error('Record pembatalan draft tidak sah'); validateDraftCancellation(record.cancellation); }
 else if (record.recordType === 'free-cancellations') { if(Object.keys(record).sort().join(',')!=='cancellations,recordType,schemaVersion' || !Array.isArray(record.cancellations) || !record.cancellations.length) throw new Error('Histori pembatalan gratis tidak sah'); for(const c of record.cancellations) validateFreeCancellationEvent(c); }
 else if (record.recordType === 'free-stock-returns') { if(Object.keys(record).sort().join(',')!=='recordType,returns,schemaVersion' || !Array.isArray(record.returns) || !record.returns.length) throw new Error('Histori return gratis tidak sah'); for(const r of record.returns) validateFreeStockReturnEvent(r); }
 else if (record.recordType === 'paid-cancellations') { if(Object.keys(record).sort().join(',')!=='cancellations,recordType,schemaVersion' || !Array.isArray(record.cancellations) || !record.cancellations.length) throw new Error('Histori pembatalan tidak sah'); for(const c of record.cancellations) validatePaidCancellationEvent(c); }
 else if (record.recordType === 'served-refunds') { if(Object.keys(record).sort().join(',')!=='recordType,refunds,schemaVersion' || !Array.isArray(record.refunds) || !record.refunds.length) throw new Error('Histori refund tidak sah'); for(const r of record.refunds) validateServedRefundEvent(r); }
 else if (record.recordType === 'stock-returns') { if(Object.keys(record).sort().join(',')!=='recordType,returns,schemaVersion' || !Array.isArray(record.returns) || !record.returns.length) throw new Error('Histori return tidak sah'); for(const r of record.returns) validateStockReturnEvent(r,record.schemaVersion===2); }
 else if (record.recordType === 'payment-corrections') { if(Object.keys(record).sort().join(',')!=='corrections,recordType,schemaVersion' || !Array.isArray(record.corrections) || !record.corrections.length) throw new Error('Histori koreksi tidak sah'); for(const c of record.corrections) validateMethodCorrection(c); }
 else if (record.recordType === 'payment-methods') { if(Object.keys(record).sort().join(',')!=='methods,recordType,schemaVersion') throw new Error('Record metode tidak sah'); validatePaymentMethods(record.methods); }
 else if (record.recordType === 'payment') { if(Object.keys(record).sort().join(',')!=='payment,recordType,schemaVersion') throw new Error('Record payment tidak sah'); if(record.schemaVersion===1) validateCashPayment(record.payment);else validateNoncashPayment(record.payment); }
 else if (record.recordType === 'customer-job') { if(record.schemaVersion===1 || record.schemaVersion===3) { if(Object.keys(record).sort().join(',')!=='batch,payment,recordType,schemaVersion,settlement') throw new Error('Job pelanggan tidak sah'); if(record.schemaVersion===1) validateCashPayment(record.payment);else validateNoncashPayment(record.payment); } else if(Object.keys(record).sort().join(',')!=='batch,reason,recordType,schemaVersion,settlement' || typeof record.reason!=='string' || !record.reason.trim() || record.reason.length>500) throw new Error('Job pelanggan gratis tidak sah'); validateSettlementSnapshot(record.settlement); if(record.schemaVersion===2 && (record.settlement as SettlementSnapshot).source!=='free') throw new Error('Job pelanggan gratis tidak sah'); validateFirstBatch(record.batch); }
 else if (record.recordType === 'serving') { if(Object.keys(record).sort().join(',')!=='recordType,schemaVersion,serving') throw new Error('Record penyajian tidak sah'); validateServingState(record.serving,record.schemaVersion===2); }
 else if (record.recordType === 'cash-session') { if(Object.keys(record).sort().join(',')!=='recordType,schemaVersion,session') throw new Error('Record kas tidak sah'); validateCashSession(record.session); }
 else if (record.recordType === 'first-batch' || record.recordType === 'kitchen-job') {
  if (Object.keys(record).sort().join(',') !== 'batch,recordType,schemaVersion') throw new Error('Record batch tidak sah');
  validateFirstBatch(record.batch);
 }
 else if (record.recordType === 'sku-stock-mapping') validateSkuStockMapping(record.mapping);
 else if (record.recordType === STOCK_GROUP_RECORD) validateStockGroup(record.stockGroup);
 else if (record.recordType === DRAFT_RECORD) validateDraft(record.draft);
 else if (record.recordType === SETTLEMENT_RECORD) validateSettlementSnapshot(record.settlement);
 else if (record.recordType === REFUND_HISTORY_RECORD) validateRefundHistory(record.settlement, record.refunds);
 else throw new Error('Jenis record bisnis tidak dikenal');
}
export function createSettlementRecord(settlement: unknown): Extract<BusinessRecord, {recordType: typeof SETTLEMENT_RECORD}> {
 validateSettlementSnapshot(settlement);
 return {recordType:SETTLEMENT_RECORD, schemaVersion:1, settlement:structuredClone(settlement)};
}
export function createRefundHistoryRecord(settlement: unknown, refunds: unknown): Extract<BusinessRecord, {recordType: typeof REFUND_HISTORY_RECORD}> {
 validateRefundHistory(settlement, refunds);
 validateSettlementSnapshot(settlement);
 return {recordType:REFUND_HISTORY_RECORD, schemaVersion:1, settlement:structuredClone(settlement), refunds:structuredClone(refunds)};
}

export function createDraftRecord(draft:unknown): Extract<BusinessRecord, {recordType: typeof DRAFT_RECORD}> {
 validateDraft(draft); return {recordType:DRAFT_RECORD,schemaVersion:1,draft:structuredClone(draft)};
}

export function createStockGroupRecord(stockGroup:unknown): Extract<BusinessRecord, {recordType: typeof STOCK_GROUP_RECORD}> {
 validateStockGroup(stockGroup); return {recordType:STOCK_GROUP_RECORD,schemaVersion:1,stockGroup:structuredClone(stockGroup)};
}

export function createSkuStockMappingRecord(mapping:unknown): Extract<BusinessRecord,{recordType:'sku-stock-mapping'}> { validateSkuStockMapping(mapping); return {recordType:'sku-stock-mapping',schemaVersion:1,mapping:structuredClone(mapping)}; }
