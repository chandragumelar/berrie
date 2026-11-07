import { validateDraft } from './draft';
import { planStockDebits, type StockPlanResult } from './stock';

/** Plans all physical units of a never-confirmed draft; the caller supplies current mapping and balances. */
export function planDraftStockDebits(input: unknown): StockPlanResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input stok draft tidak sah');
  const data = input as Record<string, unknown>;
  validateDraft(data.draft);
  if (!Array.isArray(data.skuGroups) || !Array.isArray(data.balances)) throw new Error('Daftar stok draft tidak sah');
  const groups = new Map<string, string>();
  for (const value of data.skuGroups) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pemetaan SKU tidak sah');
    const { skuId, groupId } = value as Record<string, unknown>;
    if (typeof skuId !== 'string' || !skuId.trim() || typeof groupId !== 'string' || !groupId.trim()) throw new Error('Identitas pemetaan tidak sah');
    if (groups.has(skuId)) throw new Error('Pemetaan SKU duplikat');
    groups.set(skuId, groupId);
  }
  const rows = data.draft.items.map((item) => {
    const groupId = groups.get(item.skuId);
    if (groupId === undefined) throw new Error('Pemetaan SKU tidak ditemukan');
    return { rowId: item.id, skuId: item.skuId, groupId, qty: item.unitIds.length };
  });
  return planStockDebits({ rows, balances: data.balances });
}
