/** Nilai rupiah dan tarif diperiksa pada batas domain. */
export function integer(value: unknown, min = 0, max = 999_999_999): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error('Nilai bilangan bulat di luar batas');
  return value;
}
const safe = (n: bigint): number => { if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < 0n) throw new Error('Total di luar batas'); return Number(n); };
export function halfUp(n: bigint, d: bigint): number {
  if (n < 0n || d <= 0n) throw new Error('Pembulatan tidak sah');
  return safe((2n * n + d) / (2n * d));
}
export function allocate(total: number, weights: { id: string; weight: number }[]): Map<string, number> {
  integer(total, 0, Number.MAX_SAFE_INTEGER);
  if (new Set(weights.map(x => x.id)).size !== weights.length || weights.some(x => !x.id)) throw new Error('ID unit tidak sah');
  const sum = weights.reduce((n, x) => n + BigInt(integer(x.weight, 0, Number.MAX_SAFE_INTEGER)), 0n);
  if (sum === 0n) { if (total !== 0) throw new Error('Tidak dapat mengalokasikan nilai'); return new Map(weights.map(x => [x.id, 0])); }
  const rows = weights.map(x => { const n = BigInt(total) * BigInt(x.weight); return { id: x.id, value: safe(n / sum), remainder: n % sum }; });
  let remaining = total - rows.reduce((n, x) => n + x.value, 0);
  rows.sort((a,b) => a.remainder === b.remainder ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.remainder > b.remainder ? -1 : 1);
  for (const row of rows) { if (remaining <= 0) break; row.value++; remaining--; }
  return new Map(rows.map(x => [x.id, x.value]));
}
export interface UnitSnapshot { id: string; skuPrice: number; toppingPrice: number; promo: number }
export function settlement(units: UnitSnapshot[], discount: number, taxBp: number, serviceBp: number) {
  if (!units.length || new Set(units.map(u => u.id)).size !== units.length || units.some(u => !u.id)) throw new Error('Unit tidak sah');
  integer(discount); integer(taxBp, 0, 10_000); integer(serviceBp, 0, 10_000);
  const rows = units.map(u => { integer(u.skuPrice); integer(u.toppingPrice); integer(u.promo, 0, u.skuPrice); return {...u, gross: safe(BigInt(u.skuPrice) + BigInt(u.toppingPrice))}; });
  const subtotal = safe(rows.reduce((n,u) => n + BigInt(u.gross),0n));
  const promo = safe(rows.reduce((n,u) => n + BigInt(u.promo),0n));
  if ((promo > 0 && discount > 0) || discount > subtotal - promo) throw new Error('Diskon tidak sah');
  const discounts = allocate(discount, rows.map(u => ({id:u.id,weight:u.gross})));
  const bases = rows.map(u => ({id:u.id,weight:u.gross-u.promo-discounts.get(u.id)!}));
  const base = subtotal-promo-discount;
  const tax = halfUp(BigInt(base)*BigInt(taxBp),10_000n), service = halfUp(BigInt(base)*BigInt(serviceBp),10_000n);
  const taxes = allocate(tax,bases), services = allocate(service,bases);
  const allocations = bases.map(u => ({id:u.id,discount:discounts.get(u.id)!,base:u.weight,tax:taxes.get(u.id)!,service:services.get(u.id)!,total:safe(BigInt(u.weight)+BigInt(taxes.get(u.id)!)+BigInt(services.get(u.id)!))}));
  return {subtotal,promo,discount,base,tax,service,total:safe(BigInt(base)+BigInt(tax)+BigInt(service)),allocations};
}
