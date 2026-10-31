import { describe, expect, it } from 'vitest';
import { freezeSettlement, refund, validateSettlementSnapshot, type SaleLine } from './settlement';
const line = (ids: string[], price=10000): SaleLine => ({unitIds:ids,skuId:'sku',skuPrice:price,toppingPrice:0,promo:{kind:'buyXGetY',buy:2,free:3,promotionId:'p',revision:1},identity:{toppings:[],choices:[],serving:'takeaway',note:''}});
const ids=(n:number)=>Array.from({length:n},(_,i)=>String(i).padStart(3,'0'));
const freeze=(lines:SaleLine[])=>freezeSettlement('order',lines,{kind:'none'},0,0,'payment');
const amounts=(s:ReturnType<typeof freeze>)=>Object.fromEntries(s.units.map(u=>[u.id,u.promoAmount]));
describe('promo jumlah',()=>{
 it('menghitung kelompok lengkap dan topping penuh',()=>{
  for(const [n,p] of [[4,0],[5,30000],[6,30000],[10,60000]]) {const s=freeze([line(ids(n))]);expect(s.totals).toMatchObject({subtotal:n*10000,promo:p,base:n*10000-p});}
  const l=line(ids(5));l.toppingPrice=2000;expect(freeze([l]).totals).toMatchObject({subtotal:60000,promo:30000,total:30000});
 });
 it('membagi sisa deterministik lintas baris dan urutan, serta refund snapshot',()=>{
  const l=line(ids(6),10001), before=structuredClone(l);const s=freeze([l]);const reversed=freeze([line([...l.unitIds].reverse(),10001)]);
  expect(amounts(s)).toEqual(amounts(reversed));expect(s.totals.promo).toBe(30003);expect(s.units.reduce((a,u)=>a+u.promoAmount,0)).toBe(30003);
  expect(amounts(freeze([line(ids(3),10001),line(ids(6).slice(3),10001)]))).toEqual(amounts(s));
  const copy=JSON.parse(JSON.stringify(s));validateSettlementSnapshot(copy);const a=refund(copy,[],ids(2));const b=refund(copy,[a],ids(6).slice(2));expect(a.amount+b.amount).toBe(s.totals.total);expect(()=>refund(copy,[a],['000'])).toThrow();expect(l).toEqual(before);
 });
 it('memisahkan setiap atribut identitas dan snapshot confirmed',()=>{
  const changes: ((l:SaleLine)=>void)[]=[l=>{l.skuId='other';},l=>{l.skuPrice++;},l=>{l.toppingPrice++;},l=>{if(l.promo.kind==='buyXGetY') l.promo.revision++;},l=>{if(l.promo.kind==='buyXGetY') l.promo.promotionId='other';},l=>{l.identity!.toppings=['t'];},l=>{l.identity!.choices=['c'];},l=>{l.identity!.serving='dine_in';},l=>{l.identity!.note='x';}];
  for(const change of changes){const a=line(ids(4)),b=line(['last']);change(b);expect(freeze([a,b]).totals.promo).toBe(0);}
  const confirmed=freeze([line(ids(5))]);const before=structuredClone(confirmed);expect(freeze([line(['new'])]).totals.promo).toBe(0);expect(confirmed).toEqual(before);validateSettlementSnapshot(confirmed);
 });
 it('menolak batas, diskon, ID duplikat dan manipulasi',()=>{
  for(const n of [0,100,1.5]) for(const key of ['buy','free'] as const){const l=line(ids(5));if(l.promo.kind==='buyXGetY') l.promo[key]=n;expect(()=>freeze([l])).toThrow();}
  expect(()=>freeze([line([])])).toThrow();expect(()=>freeze([line(ids(1000))])).toThrow();expect(()=>freeze([line(['a','a'])])).toThrow();
  expect(()=>freezeSettlement('o',[line(['a'])],{kind:'amount',value:1},0,0,'payment')).toThrow();
  const edits: ((s:ReturnType<typeof freeze>)=>void)[]=[s=>{s.units[0].identity!.note='ubah';},s=>{s.units[0].groupUnitIds!.pop();},s=>{s.units[0].promoAmount++;},s=>{s.totals.total++;},s=>{s.totals.allocations[0].total++;}];
  for(const edit of edits){const s=freeze([line(ids(5))]);edit(s);expect(()=>validateSettlementSnapshot(s)).toThrow();}
 });
 it('generatif seed tetap: konservasi dan determinisme',()=>{
  let seed=177;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<200;i++){const n=1+next()%60,p=1+next()%100000,l=line(ids(n),p);if(l.promo.kind!=='buyXGetY') throw Error();l.promo.buy=1+next()%9;l.promo.free=1+next()%9;const s=freeze([l]);const reverse=structuredClone(l);reverse.unitIds.reverse();const t=freeze([reverse]);expect(amounts(s)).toEqual(amounts(t));expect(s.totals.promo).toBe(Math.floor(n/(l.promo.buy+l.promo.free))*p*l.promo.free);expect(s.units.reduce((a,u)=>a+u.promoAmount,0)).toBe(s.totals.promo);validateSettlementSnapshot(JSON.parse(JSON.stringify(s)));}
 });
});
