import { validateStockGroup, type StockGroup } from './stock-group';
import { validateDraft, type OrderDraft } from './draft';
import { validateRefundHistory, validateSettlementSnapshot, type RefundRecord, type SettlementSnapshot } from './settlement';

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
 | { recordType:'sku-stock-mapping'; schemaVersion:1; mapping:SkuStockMapping }
 | { recordType: typeof STOCK_GROUP_RECORD; schemaVersion: 1; stockGroup: StockGroup }
 | { recordType: typeof DRAFT_RECORD; schemaVersion: 1; draft: OrderDraft }
 | { recordType: typeof SETTLEMENT_RECORD; schemaVersion: 1; settlement: SettlementSnapshot }
 | { recordType: typeof REFUND_HISTORY_RECORD; schemaVersion: 1; settlement: SettlementSnapshot; refunds: RefundRecord[] };

/** Only the dedicated marker opts a value into this contract. */
export function validateBusinessRecord(value: unknown): void {
 if (value === null || typeof value !== 'object' || !Object.hasOwn(value, 'recordType')) return;
 if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Record bisnis tidak sah');
 const record = value as Record<string, unknown>;
 if (record.schemaVersion !== 1) throw new Error('Versi record bisnis tidak didukung');
 if (record.recordType === 'sku-stock-mapping') validateSkuStockMapping(record.mapping);
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
