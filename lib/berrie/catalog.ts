import {quoteSKU,hasCountedStock,type SKU,type Channel} from './domain.ts';
import {matchesMenuTab} from './menu-filters.ts';
export const typeName=(sku:SKU)=>sku.type??'Normal';
export const saleReason=(sku:SKU)=>sku.stock===0?'Stok habis':!sku.available?'Tidak dijual sementara':'';
export {validateAliases} from './aliases.ts';
export function catalogRows(catalog:SKU[],channel:Channel,search='',tab='Semua'){
 const filtered=catalog.filter(s=>!s.archived&&s.available&&hasCountedStock(s)&&matchesMenuTab(s,tab,quoteSKU(s,channel).discount)&&`${s.name} ${s.variant} ${s.code}`.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id'))).sort((a,b)=>typeName(a).localeCompare(typeName(b),'id')||a.name.localeCompare(b.name,'id')||a.variant.localeCompare(b.variant,'id')||a.code.localeCompare(b.code,'id'));
 const names=new Map<string,number>();for(const sku of catalog.filter(x=>!x.archived)){const key=JSON.stringify([typeName(sku),sku.name]);names.set(key,(names.get(key)??0)+1);}
 return filtered.map(sku=>{const q=quoteSKU(sku,channel),ambiguous=(names.get(JSON.stringify([typeName(sku),sku.name]))??0)>1;return {key:sku.id,name:sku.name+(ambiguous?' · '+sku.variant:'')+(catalog.some(x=>x.id!==sku.id&&!x.archived&&typeName(x)===typeName(sku)&&x.name===sku.name&&x.variant===sku.variant)?' · '+sku.code:''),type:typeName(sku),skus:[sku],stock:String(sku.stock),stockLabel:`${sku.variant}: ${sku.stock}${saleReason(sku)?', '+saleReason(sku):''}`,price:q.final.toLocaleString('id-ID'),discount:q.discount?(q.promoMode==='percent'?q.promoValue/100:q.discount).toLocaleString('id-ID'):'0',unavailable:!!saleReason(sku),reason:saleReason(sku)};});
}
