import { halfUp, integer, settlement } from './money';

export type Discount = { kind: 'none' } | { kind: 'amount'; value: number } | { kind: 'percent'; value: number };
export type Promo = { kind: 'none'; revision: number } | { kind: 'amount' | 'percent'; value: number; revision: number };
export interface SaleLine { unitIds: string[]; skuId: string; skuPrice: number; toppingPrice: number; promo: Promo }
export interface FrozenUnit { id: string; skuId: string; skuPrice: number; toppingPrice: number; promo: Promo; promoAmount: number }
export interface SettlementSnapshot { orderId: string; units: FrozenUnit[]; discount: Discount; taxBp: number; serviceBp: number; source: 'free' | 'payment' | 'platform'; paymentAmount: number; totals: ReturnType<typeof settlement> }
function nonblank(value: unknown): asserts value is string { if (typeof value !== 'string' || !value.trim()) throw new Error('Identitas wajib'); }
function discountValue(discount: Discount, basis: number): number {
 if (discount.kind === 'none') return 0;
 if (discount.kind === 'amount') return integer(discount.value);
 if (discount.kind === 'percent') return halfUp(BigInt(basis) * BigInt(integer(discount.value,0,10_000)),10_000n);
 throw new Error('Jenis diskon tidak sah');
}
export function freezeSettlement(orderId: string, lines: SaleLine[], discount: Discount, taxBp: number, serviceBp: number, source: SettlementSnapshot['source']): SettlementSnapshot {
 nonblank(orderId); if (!Array.isArray(lines) || !lines.length) throw new Error('Unit wajib');
 const units: FrozenUnit[] = [];
 for (const line of lines) {
  nonblank(line.skuId); integer(line.skuPrice); integer(line.toppingPrice); integer(line.promo.revision,0,Number.MAX_SAFE_INTEGER);
  if (!Array.isArray(line.unitIds)) throw new Error('Unit tidak sah'); integer(line.unitIds.length,1,999);
  const p=line.promo.kind === 'none' ? 0 : discountValue(line.promo,line.skuPrice);
  if (p > line.skuPrice) throw new Error('Promo melebihi harga SKU');
  for (const id of line.unitIds) { nonblank(id); units.push({id,skuId:line.skuId,skuPrice:line.skuPrice,toppingPrice:line.toppingPrice,promo:structuredClone(line.promo),promoAmount:p}); }
 }
 const subtotal=units.reduce((n,u)=>n+BigInt(u.skuPrice)+BigInt(u.toppingPrice),0n);
 if (subtotal>BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Total di luar batas');
 const amount=discountValue(discount,Number(subtotal));
 const totals=settlement(units.map(u=>({id:u.id,skuPrice:u.skuPrice,toppingPrice:u.toppingPrice,promo:u.promoAmount})),amount,taxBp,serviceBp);
 if (!['free','payment','platform'].includes(source) || (totals.total===0 ? source!=='free' : source==='free')) throw new Error('Sumber settlement tidak sah');
 return {orderId,units,discount:structuredClone(discount),taxBp,serviceBp,source,paymentAmount:source==='payment'?totals.total:0,totals};
}
export interface RefundRecord { unitIds: string[]; amount: number; source: 'payment' | 'platform' }
function object(value: unknown): asserts value is Record<string, unknown> {
 if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Struktur tidak sah');
}
function validateDiscount(value: unknown, promo = false): asserts value is Promo & Discount {
 object(value);
 if (promo) integer(value.revision, 0, Number.MAX_SAFE_INTEGER);
 if (value.kind === 'none') return;
 if (value.kind === 'amount') { integer(value.value); return; }
 if (value.kind === 'percent') { integer(value.value, 0, 10_000); return; }
 throw new Error('Jenis diskon tidak sah');
}
/** Validasi snapshot eksternal tanpa mengubah atau melengkapi data asal. */
export function validateSettlementSnapshot(value: unknown): asserts value is SettlementSnapshot {
 object(value); nonblank(value.orderId);
 if (!Array.isArray(value.units) || !value.units.length) throw new Error('Unit wajib');
 validateDiscount(value.discount);
 integer(value.taxBp, 0, 10_000); integer(value.serviceBp, 0, 10_000);
 if (value.source !== 'payment' && value.source !== 'platform' && value.source !== 'free') throw new Error('Sumber settlement tidak sah');
 integer(value.paymentAmount, 0, Number.MAX_SAFE_INTEGER);
 const lines: SaleLine[] = value.units.map((unit: unknown) => {
  object(unit); nonblank(unit.id); nonblank(unit.skuId);
  integer(unit.skuPrice); integer(unit.toppingPrice); integer(unit.promoAmount);
  validateDiscount(unit.promo, true);
  return {unitIds:[unit.id], skuId:unit.skuId, skuPrice:unit.skuPrice as number, toppingPrice:unit.toppingPrice as number, promo:unit.promo};
 });
 const expected = freezeSettlement(value.orderId, lines, value.discount, value.taxBp as number, value.serviceBp as number, value.source);
 for (let i=0; i<expected.units.length; i++) {
  if (value.units[i].promoAmount !== expected.units[i].promoAmount) throw new Error('Promo snapshot tidak sesuai');
 }
 if (value.paymentAmount !== expected.paymentAmount) throw new Error('Payment snapshot tidak sesuai');
 object(value.totals);
 for (const key of ['subtotal','promo','discount','base','tax','service','total'] as const) {
  integer(value.totals[key], 0, Number.MAX_SAFE_INTEGER);
  if (value.totals[key] !== expected.totals[key]) throw new Error('Total snapshot tidak sesuai');
 }
 if (!Array.isArray(value.totals.allocations) || value.totals.allocations.length !== expected.totals.allocations.length) throw new Error('Alokasi snapshot tidak sah');
 const expectedAllocations = new Map(expected.totals.allocations.map(row => [row.id, row]));
 const seen = new Set<string>();
 for (const row of value.totals.allocations) {
  object(row); nonblank(row.id);
  const match = expectedAllocations.get(row.id);
  if (!match || seen.has(row.id)) throw new Error('ID alokasi tidak sah');
  seen.add(row.id);
  for (const key of ['discount','base','tax','service','total'] as const) {
   integer(row[key], 0, Number.MAX_SAFE_INTEGER);
   if (row[key] !== match[key]) throw new Error('Alokasi snapshot tidak sesuai');
  }
 }
}
/** Validasi histori terhadap snapshot asal; dapat digunakan pada batas API/restore. */
export function validateRefundHistory(snapshot: unknown, history: unknown): asserts history is RefundRecord[] {
 validateSettlementSnapshot(snapshot);
 if (!Array.isArray(history)) throw new Error('Histori refund tidak sah');
 const allocations = new Map(snapshot.totals.allocations.map(a => [a.id, a.total]));
 const used = new Set<string>(); let total = 0;
 for (const record of history) {
  object(record);
  if (snapshot.source === 'free' || record.source !== snapshot.source || !Array.isArray(record.unitIds) || !record.unitIds.length) throw new Error('Histori refund tidak sah');
  integer(record.amount, 1, Number.MAX_SAFE_INTEGER);
  let expected = 0;
  for (const id of record.unitIds) {
   nonblank(id); const amount = allocations.get(id);
   if (amount === undefined || amount === 0 || used.has(id)) throw new Error('Unit refund tidak tersedia');
   used.add(id); expected += amount;
  }
  if (!Number.isSafeInteger(expected) || record.amount !== expected) throw new Error('Nilai refund tidak sesuai snapshot');
  total += expected;
  if (!Number.isSafeInteger(total) || total > snapshot.totals.total) throw new Error('Refund melebihi settlement');
 }
}
export function refund(snapshot: unknown, previous: unknown, unitIds: string[]): RefundRecord {
 validateSettlementSnapshot(snapshot);
 validateRefundHistory(snapshot, previous);
 if (snapshot.source === 'free') throw new Error('Settlement gratis tidak memiliki refund moneter');
 if (!Array.isArray(unitIds) || !unitIds.length || new Set(unitIds).size !== unitIds.length) throw new Error('Unit refund tidak sah');
 const allocations = new Map(snapshot.totals.allocations.map(a => [a.id, a.total]));
 const used = new Set(previous.flatMap(record => record.unitIds));
 let amount = 0;
 for (const id of unitIds) { nonblank(id); const value=allocations.get(id); if(value===undefined || value===0 || used.has(id)) throw new Error('Unit tidak tersedia untuk refund'); amount+=value; }
 if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Refund moneter harus lebih dari nol');
 return {unitIds:[...unitIds],amount,source:snapshot.source};
}
