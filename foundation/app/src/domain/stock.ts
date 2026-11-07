/** A candidate confirmation only: callers select unconfirmed draft rows and
 * revalidate balances and revisions inside the eventual atomic transaction. */
export type StockRow = { rowId: string; skuId: string; groupId: string; qty: number };
export type StockBalance = { groupId: string; balance: number };
export type StockPlanInput = { rows: StockRow[]; balances: StockBalance[] };
export type StockSource = { rowId: string; skuId: string; qty: number };
export type StockDebit = { groupId: string; required: number; before: number; after: number; sources: StockSource[] };
export type StockShortage = { groupId: string; required: number; available: number };
export type StockPlanResult =
  | { ok: true; debits: StockDebit[] }
  | { ok: false; shortages: StockShortage[] };

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Input stok tidak sah');
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error('Identitas stok tidak sah');
  return value;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error('Angka stok tidak sah');
  return value;
}
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** Calculates physical quantities, including free units; never writes stock. */
export function planStockDebits(input: unknown): StockPlanResult {
  const data = object(input);
  if (!Array.isArray(data.rows) || !Array.isArray(data.balances)) throw new Error('Daftar stok tidak sah');
  const balances = new Map<string, number>();
  for (const value of data.balances) {
    const item = object(value);
    const groupId = id(item.groupId);
    if (balances.has(groupId)) throw new Error('Grup stok duplikat');
    balances.set(groupId, integer(item.balance, 0, Number.MAX_SAFE_INTEGER));
  }
  const rows = new Set<string>();
  const groups = new Map<string, { required: number; sources: StockSource[] }>();
  for (const value of data.rows) {
    const item = object(value);
    const rowId = id(item.rowId);
    const skuId = id(item.skuId);
    const groupId = id(item.groupId);
    const qty = integer(item.qty, 1, 999);
    if (rows.has(rowId)) throw new Error('Baris stok duplikat');
    rows.add(rowId);
    if (!balances.has(groupId)) throw new Error('Grup stok tidak dikenal');
    const group = groups.get(groupId) ?? { required: 0, sources: [] };
    const required = group.required + qty;
    if (!Number.isSafeInteger(required)) throw new Error('Kebutuhan stok melampaui batas aman');
    group.required = required;
    group.sources.push({ rowId, skuId, qty });
    groups.set(groupId, group);
  }
  const debits: StockDebit[] = [...groups.entries()].sort(([a], [b]) => compare(a, b)).map(([groupId, group]) => {
    const before = balances.get(groupId)!;
    return { groupId, required: group.required, before, after: before - group.required,
      sources: group.sources.sort((a, b) => compare(a.rowId, b.rowId)) };
  });
  const shortages = debits.filter((debit) => debit.after < 0).map(({ groupId, required, before }) => ({ groupId, required, available: before }));
  return shortages.length ? { ok: false, shortages } : { ok: true, debits };
}
