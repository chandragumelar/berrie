import { describe, expect, it } from 'vitest';
import { allocate } from './money';
import { freezeSettlement, refund, validateRefundHistory, validateSettlementSnapshot } from './settlement';

const fixture = () => freezeSettlement('order', [
 {unitIds:['A'],skuId:'a',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:1}},
 {unitIds:['B'],skuId:'b',skuPrice:20000,toppingPrice:0,promo:{kind:'none',revision:1}},
], {kind:'amount',value:1000}, 1000, 500, 'payment');

describe('validasi snapshot dan histori eksternal', () => {
 it('menerima JSON dan contoh spesifikasi dengan komponen lengkap', () => {
  const s = JSON.parse(JSON.stringify(fixture()));
  validateSettlementSnapshot(s);
  expect(s.totals).toEqual({subtotal:30000,promo:0,discount:1000,base:29000,tax:2900,service:1450,total:33350,allocations:[
   {id:'A',discount:333,base:9667,tax:967,service:483,total:11117},
   {id:'B',discount:667,base:19333,tax:1933,service:967,total:22233},
  ]});
  const a=refund(s,[],['A']); const b=refund(s,[a],['B']);
  expect([a.amount,b.amount]).toEqual([11117,22233]); validateRefundHistory(s,[a,b]);
 });
 it('menolak struktur, field, enum, identitas dan angka tidak sah tanpa mengubah input', () => {
  const edits: ((s: ReturnType<typeof fixture>) => void)[] = [
   s=>{s.orderId=' ';}, s=>{s.units[0].id='';}, s=>{s.units[1].id='A';},
   s=>{s.units[0].skuId=' ';}, s=>{s.units[0].skuPrice=1.5;}, s=>{s.units[0].skuPrice=-1;},
   s=>{s.units[0].skuPrice=NaN;}, s=>{s.units[0].skuPrice=Infinity;}, s=>{s.units[0].skuPrice=1_000_000_000;},
   s=>{s.taxBp=10001;}, s=>{s.serviceBp=-1;}, s=>{s.units[0].promo.revision=-1;},
   s=>{(s.units[0].promo as {kind:string}).kind='invalid';}, s=>{(s.discount as {kind:string}).kind='invalid';},
   s=>{(s as unknown as Record<string,unknown>).source='invalid';},
   s=>{delete (s as unknown as Record<string,unknown>).paymentAmount;},
   s=>{delete (s.totals as unknown as Record<string,unknown>).base;},
   s=>{(s.units[0] as unknown as Record<string,unknown>).skuPrice='10000';},
   s=>{(s as unknown as Record<string,unknown>).units=[null];},
  ];
  for (const invalid of [null, [], {}, {units:[]}, ...edits.map(edit=>{const s=fixture();edit(s);return s;})]) {
   const before=structuredClone(invalid);
   expect(()=>validateSettlementSnapshot(invalid)).toThrow(Error);
   expect(()=>refund(invalid,[],['A'])).toThrow(Error);
   expect(invalid).toEqual(before);
  }
 });
 it('menolak manipulasi promo, total, alokasi dan sumber', () => {
  const edits: ((s: ReturnType<typeof fixture>)=>void)[] = [
   s=>{s.units[0].promoAmount=1;}, s=>{s.totals.promo=1;}, s=>{s.totals.total++;},
   s=>{s.totals.allocations[0].total++;}, s=>{s.totals.allocations[1].id='A';},
   s=>{s.source='platform';}, s=>{s.paymentAmount--;}, s=>{s.source='free';},
  ];
  for(const edit of edits) { const s=fixture();edit(s); const before=structuredClone(s);expect(()=>validateSettlementSnapshot(s)).toThrow();expect(s).toEqual(before); }
 });
 it('menolak histori asing, ganda, sumber dan nominal salah serta refund berlebih', () => {
  const s=fixture(); const a=refund(s,[],['A']);
  const bad: unknown[] = [null, {}, [null], [{...a,unitIds:['X']}], [{...a,unitIds:['A','A']}], [a,a], [{...a,amount:a.amount+1}], [{...a,amount:-1}], [{...a,amount:NaN}], [{...a,source:'platform'}]];
  for(const h of bad) {const before=structuredClone(h);expect(()=>validateRefundHistory(s,h)).toThrow(Error);expect(()=>refund(s,h,['B'])).toThrow(Error);expect(h).toEqual(before);}
  expect(()=>refund(s,[a],['A'])).toThrow(); expect(()=>refund(s,[],['A','A'])).toThrow(); expect(()=>refund(s,[],['X'])).toThrow();
  const before=structuredClone(s); refund(s,[a],['B']); expect(s).toEqual(before);
 });
 it('gratis tanpa refund moneter', () => {
  const s=freezeSettlement('o',[{unitIds:['a'],skuId:'s',skuPrice:100,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'percent',value:10000},0,0,'free');
  validateSettlementSnapshot(s); validateRefundHistory(s,[]); expect(()=>refund(s,[],['a'])).toThrow(); expect(()=>validateRefundHistory(s,[{unitIds:['a'],amount:0,source:'payment'}])).toThrow();
 });
 it('unit bernilai nol tidak membuat refund moneter', () => {
  const s=freezeSettlement('o',[{unitIds:['zero'],skuId:'z',skuPrice:0,toppingPrice:0,promo:{kind:'none',revision:0}},{unitIds:['paid'],skuId:'p',skuPrice:10,toppingPrice:0,promo:{kind:'none',revision:0}}],{kind:'none'},0,0,'payment');
  expect(()=>refund(s,[],['zero'])).toThrow(); expect(()=>refund(s,[],['zero','paid'])).toThrow();
  expect(()=>validateRefundHistory(s,[{unitIds:['zero','paid'],amount:10,source:'payment'}])).toThrow();
 });
 it('generatif seed tetap: konservasi, urutan alokasi dan refund penuh', () => {
  let seed=78123; const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let n=0;n<200;n++) {
   const prices=Array.from({length:3},()=>1+next()%100000);
   const s=freezeSettlement('o',prices.map((price,i)=>({unitIds:[String(i)],skuId:String(i),skuPrice:price,toppingPrice:0,promo:{kind:'none',revision:1}})),{kind:'amount',value:next()%Math.min(...prices)},next()%10001,next()%10001,'payment');
   const t=s.totals; const rows=t.allocations;
   expect(t.subtotal).toBe(prices.reduce((a,b)=>a+b,0)); expect(t.base).toBe(t.subtotal-t.discount-t.promo); expect(t.total).toBe(t.base+t.tax+t.service);
   for(const k of ['discount','base','tax','service','total'] as const) expect(rows.reduce((a,b)=>a+b[k],0)).toBe(t[k]);
   const records=rows.map(row=>refund(s,[],[row.id])); validateRefundHistory(s,records); expect(records.reduce((a,b)=>a+b.amount,0)).toBe(s.paymentAmount);
   const weights=prices.map((weight,i)=>({id:String(i),weight}));
   expect(Object.fromEntries(allocate(t.discount,weights))).toEqual(Object.fromEntries(allocate(t.discount,[...weights].reverse())));
  }
  expect(Object.fromEntries(allocate(2,[{id:'c',weight:1},{id:'b',weight:1},{id:'a',weight:1}]))).toEqual({a:1,b:1,c:0});
 });
});
