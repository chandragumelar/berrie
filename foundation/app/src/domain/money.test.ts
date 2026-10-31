import { describe, expect, it } from 'vitest';
import { allocate, integer, settlement } from './money';
describe('uang', () => {
  it('membekukan alokasi contoh dan refund penuh', () => {
    const s = settlement([{id:'A',skuPrice:10000,toppingPrice:0,promo:0},{id:'B',skuPrice:20000,toppingPrice:0,promo:0}],1000,1000,500);
    expect(s.total).toBe(33350); expect(s.allocations.map(x=>x.total)).toEqual([11117,22233]);
    expect(s.allocations.reduce((n,x)=>n+x.total,0)).toBe(s.total);
  });
  it('mengalokasikan sisa deterministik dan mempertahankan total', () => {
    for (let total=0;total<300;total++) { const a=allocate(total,[{id:'b',weight:1},{id:'a',weight:1},{id:'c',weight:1}]); expect([...a.values()].reduce((x,y)=>x+y,0)).toBe(total); if(total===1) expect(a.get('a')).toBe(1); }
  });
  it('promo SKU tidak memotong topping dan tidak bercampur diskon order', () => {
    const u=[{id:'a',skuPrice:20000,toppingPrice:5000,promo:2000}]; expect(settlement(u,0,0,0).total).toBe(23000); expect(()=>settlement(u,1,0,0)).toThrow();
  });
  it('menolak pecahan, overflow dan promo berlebih',()=>{expect(()=>integer(1.5)).toThrow();expect(()=>integer(Number.MAX_SAFE_INTEGER+1)).toThrow();expect(()=>settlement([{id:'a',skuPrice:1,toppingPrice:0,promo:2}],0,0,0)).toThrow();});
});
