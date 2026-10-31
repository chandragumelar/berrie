import {makeUnits,totals,groupUnits,quoteSKU,type State,type SKU,type Order} from './domain.ts';
import {stockKey} from './shared-stock.ts';
import {variablesForSKU,valuesForSKU} from './menu-variables.ts';
import {catalogRows} from './catalog.ts';
import {rebalanceQuantityPromos} from './discounts.ts';

export type AddReceipt={order:string;unit:string};
export function simpleMenu(s:State,sku:SKU):boolean {
 const members=s.catalog.filter(x=>stockKey(x)===stockKey(sku)&&!x.archived&&x.available);
 return members.length===1&&variablesForSKU({...s,toppings:s.toppings.filter(x=>x.available)},sku).every(v=>v.pricing==='combination'&&v.options.length===1)&&!(sku.recipes?.length)&&!s.toppings.some(x=>x.available&&sku.toppings.includes(x.id));
}
export function addSimple(s:State,o:Order,sku:SKU):{units:Order['units'];receipt:AddReceipt} {
 if(o.settlement||!simpleMenu(s,sku))throw Error('Menu memerlukan editor pilihan atau pesanan baru.');
 const values={...Object.fromEntries(variablesForSKU(s,sku).map(v=>[v.id,v.defaults])),...valuesForSKU(sku)};
 const unit=makeUnits(s,o,sku,1,[],o.serving,'',undefined,{},values)[0];
 const units=rebalanceQuantityPromos([...o.units,unit]);
 if(groupUnits({...o,units}).some(row=>row.length>999))throw Error('Maksimal 999 per baris pesanan.');
 totals({...o,units});
 return {units,receipt:{order:o.id,unit:unit.id}};
}
export function undoAdd(o:Order,receipt:AddReceipt):Order['units'] {
 if(o.id!==receipt.order||o.settlement||!o.units.some(u=>u.id===receipt.unit&&u.state==='draft'&&!u.debited))return o.units;
 return rebalanceQuantityPromos(o.units.filter(u=>u.id!==receipt.unit));
}
export function favoriteGroups(s:State):string[]{
 return (s.settings.favorites??[]).filter(key=>s.catalog.some(x=>stockKey(x)===key&&x.available&&!x.archived));
}
export const initialMenuTab=(s:State)=>favoriteGroups(s).length?'Favorit':'Semua';
export function moveFavorite(keys:string[],key:string,direction:-1|1):string[]{
 const next=[...keys],i=next.indexOf(key),j=i+direction;
 if(i>=0&&j>=0&&j<next.length)[next[i],next[j]]=[next[j],next[i]];
 return next;
}
export function cashierRows(s:State,channel:Order['channel'],search:string,tab:string){
 const favorites=favoriteGroups(s);
 // Include exhausted favorites without changing the owner's positions.
 const source=tab==='Favorit'?s.catalog.filter(x=>favorites.includes(stockKey(x))):s.catalog;
 const rows=catalogRows(source,channel,'',tab==='Favorit'?'Semua':tab);
 if(tab==='Favorit')rows.push(...catalogRows(source,channel,'','Habis'));
 type Row=typeof rows[number]&{promoLabel:string};
 const grouped=new Map<string,Row>();
 for(const row of rows){
  const key=stockKey(row.skus[0]),old=grouped.get(key);
  if(old){old.skus.push(...row.skus);old.unavailable=old.unavailable&&row.unavailable;if(!row.unavailable)old.reason='';}
  else grouped.set(key,{...row,key,name:row.skus[0].name,skus:[...row.skus],promoLabel:''});
 }
 const result=[...grouped.values()].filter(row=>row.skus.some(sku=>`${sku.name} ${sku.variant} ${sku.code}`.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id'))));
 for(const row of result){
  const quotes=row.skus.filter(x=>x.channelPrices[channel]>0).map(x=>quoteSKU(x,channel));
  const prices=quotes.map(q=>q.final).sort((a,b)=>a-b),min=prices[0],max=prices.at(-1);
  row.price=min===undefined?'':min===max?min.toLocaleString('id-ID'):`${min.toLocaleString('id-ID')}–${max!.toLocaleString('id-ID')}`;
  const offers=[...new Set(quotes.filter(q=>q.promoMode==='bogo').map(q=>`Beli ${q.promoBuy} gratis ${q.promoFree}`))];
  row.promoLabel=offers.join(' · ')||(quotes.some(q=>q.discount>0)?'Promo':'');
 }
 return tab==='Favorit'?result.sort((a,b)=>favorites.indexOf(a.key)-favorites.indexOf(b.key)):result;
}
