import { draftDateCode, validateDraft, type OrderDraft } from './draft';
import { planDraftStockDebits } from './draft-stock';

export interface FirstBatch {
  storeId: string;
  number: 1;
  confirmedAt: string;
  draft: OrderDraft;
  skuGroups: { skuId: string; groupId: string }[];
}

/** Copies only draft fields belonging to this snapshot contract. */
export function snapshotBatchDraft(draft:OrderDraft):OrderDraft {
 const {orderId,displayNumber,cashSessionId,customer,channel,channelAccountId,externalOrderId,serving,note,savedAt,sourceOrderId,items,discount,taxBp,serviceBp}=draft;
 const lines=items.map(({id,unitIds,skuId,name,skuPrice,toppingPrice,promo,choices,toppings,serving,note})=>({id,unitIds,skuId,name,skuPrice,toppingPrice,promo,choices:choices.map(({id,name})=>({id,name})),toppings:toppings.map(({id,name,price})=>({id,name,price})),serving,note}));
 return structuredClone({orderId,displayNumber,cashSessionId,customer,channel,channelAccountId,externalOrderId,serving,note,savedAt,...(sourceOrderId===undefined?{}:{sourceOrderId}),items:lines,discount,taxBp,serviceBp});
}

/** Validates a self-contained first-batch snapshot without consulting mutable catalog data. */
export function validateFirstBatch(value: unknown): asserts value is FirstBatch {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Batch tidak sah');
  const batch = value as Record<string, unknown>;
  if (Object.keys(batch).sort().join(',') !== 'confirmedAt,draft,number,skuGroups,storeId' || typeof batch.storeId !== 'string' || !batch.storeId.trim() || batch.storeId.length > 200 || batch.number !== 1 || typeof batch.confirmedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(batch.confirmedAt) || !Number.isFinite(Date.parse(batch.confirmedAt))) throw new Error('Batch tidak sah');
  draftDateCode(batch.confirmedAt,'UTC');
  validateDraft(batch.draft);
  if(Object.keys(batch.draft).some(key=>!['orderId','displayNumber','cashSessionId','customer','channel','channelAccountId','externalOrderId','serving','note','savedAt','sourceOrderId','items','discount','taxBp','serviceBp'].includes(key))) throw new Error('Isi draft batch tidak sah');
  if (!Array.isArray(batch.skuGroups)) throw new Error('Pemetaan batch tidak sah');
  const skus = new Set(batch.draft.items.map(item => item.skuId));
  const seen = new Set<string>();
  for (const value of batch.skuGroups) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Pemetaan batch tidak sah');
    const mapping = value as Record<string, unknown>;
    if (Object.keys(mapping).sort().join(',') !== 'groupId,skuId' || typeof mapping.skuId !== 'string' || !skus.has(mapping.skuId) || seen.has(mapping.skuId) || typeof mapping.groupId !== 'string' || !mapping.groupId.trim() || mapping.groupId.length > 200) throw new Error('Pemetaan batch tidak sah');
    seen.add(mapping.skuId);
  }
  if (seen.size !== skus.size) throw new Error('Pemetaan batch tidak lengkap');
}

/** Derives physical debits from immutable batch contents and current balances. */
export function planFirstBatch(value: unknown, balances: unknown) {
  validateFirstBatch(value);
  return planDraftStockDebits({ draft: value.draft, skuGroups: value.skuGroups, balances });
}
