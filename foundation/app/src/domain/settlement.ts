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
export function refund(snapshot: SettlementSnapshot, previous: RefundRecord[], unitIds: string[]): RefundRecord {
 if (snapshot.source === 'free') throw new Error('Settlement gratis tidak memiliki refund moneter');
 if (!Array.isArray(unitIds) || !unitIds.length || new Set(unitIds).size !== unitIds.length) throw new Error('Unit refund tidak sah');
 const allocations=new Map(snapshot.totals.allocations.map(a=>[a.id,a.total]));
 const used=new Set<string>(); let total=0;
 for (const record of previous) {
  if (record.source!==snapshot.source || !Array.isArray(record.unitIds) || !record.unitIds.length) throw new Error('Histori refund tidak sah');
  let expected=0; for(const id of record.unitIds) { const value=allocations.get(id); if(value===undefined || used.has(id)) throw new Error('Unit refund ganda'); used.add(id); expected+=value; }
  if(record.amount!==expected) throw new Error('Nilai refund tidak sesuai snapshot'); total+=expected;
 }
 let amount=0; for(const id of unitIds) { const value=allocations.get(id); if(value===undefined || used.has(id)) throw new Error('Unit tidak tersedia untuk refund'); amount+=value; }
 if (!Number.isSafeInteger(total+amount) || total+amount>snapshot.totals.total) throw new Error('Refund melebihi settlement');
 return {unitIds:[...unitIds],amount,source:snapshot.source};
}
