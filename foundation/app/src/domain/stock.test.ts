import { describe, expect, it } from 'vitest';
import { planStockDebits, type StockPlanInput } from './stock';

const input = (balance: number): StockPlanInput => ({
  rows: [{ rowId: 'b', skuId: 'pisang', groupId: 'milkshake', qty: 1 }, { rowId: 'a', skuId: 'coklat', groupId: 'milkshake', qty: 1 }],
  balances: [{ groupId: 'milkshake', balance }],
});

describe('planStockDebits', () => {
  it('aggregates variants and all physical units, including free units', () => {
    expect(planStockDebits(input(50))).toEqual({ ok: true, debits: [{ groupId: 'milkshake', required: 2, before: 50, after: 48, sources: [{ rowId: 'a', skuId: 'coklat', qty: 1 }, { rowId: 'b', skuId: 'pisang', qty: 1 }] }] });
  });
  it('returns only shortages for the entire plan', () => {
    expect(planStockDebits(input(1))).toEqual({ ok: false, shortages: [{ groupId: 'milkshake', required: 2, available: 1 }] });
    const data = input(1);
    data.rows.push({ rowId: 'c', skuId: 'tea', groupId: 'tea', qty: 1 });
    data.balances.push({ groupId: 'tea', balance: 5 });
    expect(planStockDebits(data)).toEqual({ ok: false, shortages: [{ groupId: 'milkshake', required: 2, available: 1 }] });
  });
  it.each([[1, 1, 0], [999, 999, 0], [200, 1000, 800]])('uses qty %i against %i', (qty, balance, after) => {
    expect(planStockDebits({ rows: [{ rowId: 'r', skuId: 's', groupId: 'g', qty }], balances: [{ groupId: 'g', balance }] })).toMatchObject({ ok: true, debits: [{ required: qty, after }] });
  });
  it('rejects zero balance as a shortage', () => {
    expect(planStockDebits(input(0))).toEqual({ ok: false, shortages: [{ groupId: 'milkshake', required: 2, available: 0 }] });
  });
  it('rejects malformed input, identities, quantities, balances and references', () => {
    for (const bad of [undefined, null, {}, { rows: null, balances: [] }, { rows: [], balances: null }]) expect(() => planStockDebits(bad)).toThrow();
    for (const bad of [undefined, null, '', '  ', 1]) {
      for (const key of ['rowId', 'skuId', 'groupId']) {
        const data = input(50); Object.assign(data.rows[0]!, { [key]: bad });
        expect(() => planStockDebits(data)).toThrow();
      }
      const data = input(50); Object.assign(data.balances[0]!, { groupId: bad });
      expect(() => planStockDebits(data)).toThrow();
    }
    for (const bad of [undefined, null, -1, 0, 0.5, 1000, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const data = input(50); Object.assign(data.rows[0]!, { qty: bad }); expect(() => planStockDebits(data)).toThrow();
    }
    for (const bad of [undefined, null, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const data = input(50); Object.assign(data.balances[0]!, { balance: bad }); expect(() => planStockDebits(data)).toThrow();
    }
    const duplicateRow = input(50); duplicateRow.rows[1]!.rowId = duplicateRow.rows[0]!.rowId;
    expect(() => planStockDebits(duplicateRow)).toThrow();
    const duplicateGroup = input(50); duplicateGroup.balances.push({ ...duplicateGroup.balances[0]! });
    expect(() => planStockDebits(duplicateGroup)).toThrow();
    const unknown = input(50); unknown.rows[0]!.groupId = 'unknown'; expect(() => planStockDebits(unknown)).toThrow();
  });
  it('is deterministic and isolates input and output', () => {
    const data = input(50); const original = structuredClone(data);
    const result = planStockDebits(data);
    expect(data).toEqual(original);
    expect(planStockDebits({ rows: [...data.rows].reverse(), balances: [...data.balances].reverse() })).toEqual(result);
    if (!result.ok) throw new Error('expected success');
    result.debits[0]!.sources[0]!.qty = 999;
    expect(data).toEqual(original);
    data.rows[0]!.qty = 5;
    expect(result.debits[0]!.sources[1]!.qty).toBe(1);
  });
  it('preserves aggregate and conservation invariants across seeded cases', () => {
    let seed = 0x12345678;
    const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    for (let trial = 0; trial < 500; trial++) {
      const data: StockPlanInput = { rows: [], balances: [] };
      const totals = [0, 0, 0];
      for (let i = 0; i < 12; i++) {
        const group = random(3); const qty = random(999) + 1;
        totals[group]! += qty;
        data.rows.push({ rowId: `r${i}`, skuId: `s${random(4)}`, groupId: `g${group}`, qty });
      }
      for (let i = 0; i < 3; i++) data.balances.push({ groupId: `g${i}`, balance: random(6000) });
      const result = planStockDebits(data);
      const missing = totals.some((total, i) => total > data.balances[i]!.balance);
      expect(result.ok).toBe(!missing);
      if (result.ok) {
        for (const debit of result.debits) {
          const i = Number(debit.groupId.slice(1));
          expect(debit.required).toBe(totals[i]);
          expect(debit.required).toBe(debit.sources.reduce((sum, row) => sum + row.qty, 0));
          expect(debit.before - debit.after).toBe(debit.required);
          expect(debit.after).toBeGreaterThanOrEqual(0);
        }
      } else {
        expect(result).not.toHaveProperty('debits');
        expect(result.shortages.map((s) => s.groupId)).toEqual(totals.flatMap((total, i) => total > data.balances[i]!.balance ? [`g${i}`] : []));
      }
      expect(planStockDebits({ rows: [...data.rows].reverse(), balances: [...data.balances].reverse() })).toEqual(result);
    }
  });
});
