import { draftDateCode, validateDraft, type OrderDraft } from './draft';
import { planDraftStockDebits } from './draft-stock';

/**
 * The durable head for additions.  Its absence intentionally means a legacy
 * order with just batch one; once written it is never removed, including when
 * the working addition is empty.
 */
export interface OrderAdditions {
  storeId:string;
  orderId:string;
  cashSessionId:string;
  batchCount:number;
  pending:OrderDraft['items'];
}

/** A batch after the original batch.  Only the newly confirmed units live here. */
export interface AdditionalBatch {
  storeId:string;
  orderId:string;
  cashSessionId:string;
  number:number;
  confirmedAt:string;
  draft:OrderDraft;
  skuGroups:{skuId:string;groupId:string}[];
}

const id=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=200;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

function validateLines(lines:unknown): asserts lines is OrderDraft['items'] {
  if(!Array.isArray(lines)) throw new Error('Baris tambahan tidak sah');
  if(!lines.length) return;
  // Let the existing immutable draft validator remain the single source of
  // truth for unit, price, promotion and serving-line validation.
  validateDraft({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'260101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000002',customer:'Pelanggan',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-01-01T00:00:00.000Z',items:lines,discount:{kind:'none'},taxBp:0,serviceBp:0});
}

export function validateOrderAdditions(value:unknown): asserts value is OrderAdditions {
  if(!record(value)||Object.keys(value).sort().join(',')!=='batchCount,cashSessionId,orderId,pending,storeId'||!id(value.storeId)||!id(value.orderId)||!id(value.cashSessionId)||!Number.isSafeInteger(value.batchCount)||(value.batchCount as number)<1) throw new Error('Head tambahan tidak sah');
  validateLines(value.pending);
  const units=value.pending.flatMap(item=>item.unitIds);
  if(new Set(units).size!==units.length) throw new Error('Unit tambahan ganda');
}

export function validateAdditionalBatch(value:unknown): asserts value is AdditionalBatch {
  if(!record(value)||Object.keys(value).sort().join(',')!=='cashSessionId,confirmedAt,draft,number,orderId,skuGroups,storeId'||!id(value.storeId)||!id(value.orderId)||!id(value.cashSessionId)||!Number.isSafeInteger(value.number)||(value.number as number)<2||typeof value.confirmedAt!=='string'||!Number.isFinite(Date.parse(value.confirmedAt))) throw new Error('Batch tambahan tidak sah');
  draftDateCode(value.confirmedAt,'UTC');validateDraft(value.draft);
  if(value.draft.orderId!==value.orderId||value.draft.cashSessionId!==value.cashSessionId||!Array.isArray(value.skuGroups)) throw new Error('Batch tambahan tidak sah');
  const skuIds=new Set(value.draft.items.map(item=>item.skuId)),seen=new Set<string>();
  for(const mapping of value.skuGroups){if(!record(mapping)||Object.keys(mapping).sort().join(',')!=='groupId,skuId'||!id(mapping.skuId)||!id(mapping.groupId)||!skuIds.has(mapping.skuId)||seen.has(mapping.skuId)) throw new Error('Pemetaan batch tambahan tidak sah');seen.add(mapping.skuId);}
  if(seen.size!==skuIds.size) throw new Error('Pemetaan batch tambahan tidak lengkap');
  const units=value.draft.items.flatMap(item=>item.unitIds);
  if(new Set(units).size!==units.length) throw new Error('Unit batch tambahan ganda');
}

/** Builds a fully validated immutable batch snapshot from a pending edit. */
export function makeAdditionalBatch(head:OrderAdditions,base:OrderDraft,number:number,confirmedAt:string,items:OrderDraft['items'],skuGroups:AdditionalBatch['skuGroups']):AdditionalBatch {
  validateOrderAdditions(head);validateDraft(base);
  if(base.orderId!==head.orderId||base.cashSessionId!==head.cashSessionId||number!==head.batchCount+1) throw new Error('Urutan batch tambahan tidak sah');
  const prior=new Set(base.items.flatMap(item=>item.unitIds));
  if(items.flatMap(item=>item.unitIds).some(unitId=>prior.has(unitId))) throw new Error('Unit tambahan sudah ada pada pesanan');
  const draft:OrderDraft={...structuredClone(base),savedAt:confirmedAt,items:structuredClone(items)};
  const batch={storeId:head.storeId,orderId:head.orderId,cashSessionId:head.cashSessionId,number,confirmedAt,draft,skuGroups:structuredClone(skuGroups)};
  validateAdditionalBatch(batch);return batch;
}

export function planAdditionalBatchDebits(batch:AdditionalBatch,balances:{groupId:string;balance:number}[]) {
  validateAdditionalBatch(batch);
  return planDraftStockDebits({draft:batch.draft,skuGroups:batch.skuGroups,balances});
}
