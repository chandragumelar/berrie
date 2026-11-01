import { validateDraft, type OrderDraft } from './draft';
import { validateRefundHistory, validateSettlementSnapshot, type RefundRecord, type SettlementSnapshot } from './settlement';

export const SETTLEMENT_RECORD = 'settlement' as const;
export const REFUND_HISTORY_RECORD = 'refund-history' as const;
export const DRAFT_RECORD = 'draft' as const;
export type BusinessRecord =
 | { recordType: typeof DRAFT_RECORD; schemaVersion: 1; draft: OrderDraft }
 | { recordType: typeof SETTLEMENT_RECORD; schemaVersion: 1; settlement: SettlementSnapshot }
 | { recordType: typeof REFUND_HISTORY_RECORD; schemaVersion: 1; settlement: SettlementSnapshot; refunds: RefundRecord[] };

/** Only the dedicated marker opts a value into this contract. */
export function validateBusinessRecord(value: unknown): void {
 if (value === null || typeof value !== 'object' || !Object.hasOwn(value, 'recordType')) return;
 if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Record bisnis tidak sah');
 const record = value as Record<string, unknown>;
 if (record.schemaVersion !== 1) throw new Error('Versi record bisnis tidak didukung');
 if (record.recordType === DRAFT_RECORD) validateDraft(record.draft);
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
