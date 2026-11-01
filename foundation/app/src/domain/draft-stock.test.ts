import { describe, expect, it } from 'vitest';
import { planDraftStockDebits } from './draft-stock';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = (n: number, sku: number, qty = 1) => ({ id: id(n), skuId: id(sku), unitIds: Array.from({ length: qty }, (_, i) => id(n * 10000 + i)), name: 'Menu', skuPrice: 100, toppingPrice: 0, promo: { kind: 'none' as const, revision: 0 }, choices: [], toppings: [], serving: 'takeaway' as const, note: '' });
const input = () => ({ draft: { orderId: id(1), displayNumber: '261101-E1-0001', cashSessionId: id(2), customer: 'A', channel: 'store' as const, channelAccountId: '', externalOrderId: '', serving: 'takeaway' as const, note: '', savedAt: '2026-11-01T00:00:00Z', items: [item(3, 6), item(4, 7)], discount: { kind: 'none' as const }, taxBp: 0, serviceBp: 0 }, skuGroups: [{ skuId: id(6), groupId: 'g' }, { skuId: id(7), groupId: 'g' }], balances: [{ groupId: 'g', balance: 50 }] });

describe('planDraftStockDebits', () => {
  it('menggabungkan SKU dan baris berulang, serta memisahkan grup', () => {
    const d = input();
    expect(planDraftStockDebits(d)).toMatchObject({ ok: true, debits: [{ required: 2, after: 48 }] });
    d.draft.items.push(item(5, 6), item(8, 9)); d.skuGroups.push({ skuId: id(9), groupId: 'h' }); d.balances.push({ groupId: 'h', balance: 10 });
    expect(planDraftStockDebits(d)).toMatchObject({ ok: true, debits: [{ groupId: 'g', required: 3, after: 47 }, { groupId: 'h', required: 1, after: 9 }] });
  });
  it.each([[1, 1, 0], [200, 1000, 800], [999, 999, 0]])('menghitung qty %i dari saldo %i', (qty, balance, after) => {
    const d = input(); d.draft.items = [item(3, 6, qty)]; d.balances[0]!.balance = balance;
    expect(planDraftStockDebits(d)).toMatchObject({ ok: true, debits: [{ required: qty, after }] });
  });
  it('menghitung seluruh unit promo dan gratis tanpa debit topping atau pilihan', () => {
    const d = input();
    const rich = { ...item(3, 6, 3), skuPrice: 0, promo: { kind: 'buyXGetY' as const, buy: 2, free: 1, promotionId: 'p', revision: 1 }, choices: [{ id: id(10), name: 'Pilihan' }], toppings: [{ id: id(11), name: 'Jeli', price: 0 }] };
    expect(planDraftStockDebits({ ...d, draft: { ...d.draft, items: [rich] } })).toMatchObject({ ok: true, debits: [{ required: 3, after: 47 }] });
  });
  it('mengembalikan kekurangan tanpa rencana parsial termasuk saldo nol', () => {
    const d = input(); d.balances[0]!.balance = 0;
    expect(planDraftStockDebits(d)).toEqual({ ok: false, shortages: [{ groupId: 'g', required: 2, available: 0 }] });
    d.balances[0]!.balance = 1; expect(planDraftStockDebits(d)).toMatchObject({ ok: false, shortages: [{ required: 2, available: 1 }] });
  });
  it('menolak mapping, saldo, draft dan unit tidak sah', () => {
    const cases: unknown[] = [null, {}, { ...input(), skuGroups: null }, { ...input(), balances: [] }, { ...input(), skuGroups: [] }];
    const duplicate = input(); duplicate.skuGroups.push({ skuId: id(6), groupId: 'other' }); cases.push(duplicate);
    const same = input(); same.skuGroups.push({ ...same.skuGroups[0]! }); cases.push(same);
    for (const invalid of ['', '  ', null, 1]) cases.push({ ...input(), skuGroups: [{ skuId: id(6), groupId: invalid }] }, { ...input(), skuGroups: [{ skuId: invalid, groupId: 'g' }] });
    for (const balance of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) cases.push({ ...input(), balances: [{ groupId: 'g', balance }] });
    cases.push({ ...input(), balances: [{ groupId: 'g', balance: 2 }, { groupId: 'g', balance: 2 }] });
    const empty = input(); empty.draft.items[0]!.unitIds = []; cases.push(empty);
    const tooMany = input(); tooMany.draft.items[0] = item(3, 6, 1000); cases.push(tooMany);
    const duplicateUnit = input(); duplicateUnit.draft.items[1]!.unitIds = [...duplicateUnit.draft.items[0]!.unitIds]; cases.push(duplicateUnit);
    const badDraft = input(); badDraft.draft.customer = ' '; cases.push(badDraft);
    for (const value of cases) expect(() => planDraftStockDebits(value)).toThrow();
  });
  it('deterministik dan mengisolasi input serta output', () => {
    const d = input(), original = structuredClone(d), result = planDraftStockDebits(d);
    expect(d).toEqual(original);
    expect(planDraftStockDebits({ ...d, draft: { ...d.draft, items: [...d.draft.items].reverse() }, skuGroups: [...d.skuGroups].reverse() })).toEqual(result);
    if (!result.ok) throw new Error('expected success');
    result.debits[0]!.sources[0]!.qty = 99; expect(d).toEqual(original);
    d.balances[0]!.balance = 1; expect(result.debits[0]!.before).toBe(50);
  });
});
