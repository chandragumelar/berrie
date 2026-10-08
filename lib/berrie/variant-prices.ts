import {id} from './domain.ts';
import {combinationKey,validateValues,type MenuVariable,type VariableValues} from './menu-variables.ts';
import {type MenuRow} from './workshop.ts';

// Suggest price entries without multiplying multi-select sets exponentially.
// Existing identities/prices survive; genuinely new selections need a price.
export function suggestPriceRows(variables:MenuVariable[],existing:MenuRow[]):MenuRow[]{
 const source=existing.find(r=>!r.archived);if(!source)throw Error('Menu tidak ditemukan.');
 const priced=variables.filter(v=>v.pricing==='combination');
 const kept=existing.filter(r=>!r.archived).flatMap(r=>{
  if(!r.sku&&priced.some(v=>!r.variables?.some(old=>old.id===v.id&&old.pricing==='combination')))return [];
  if(priced.some(v=>(r.variableValues?.[v.id]??[]).some(x=>!v.options.includes(x))))return [];
  const values=validateValues(variables,Object.fromEntries(variables.map(v=>[v.id,r.variableValues?.[v.id]??[]])));
  return [{...structuredClone(r),variables,variableValues:values}];
 });
 const unique=new Map<string,MenuRow>();
 for(const r of kept){const key=r.type+combinationKey(variables,r.variableValues!),previous=unique.get(key);if(previous&&(previous.price!==r.price||JSON.stringify(previous.channelPrices)!==JSON.stringify(r.channelPrices)))throw Error('Perubahan varian menyatukan pilihan dengan harga berbeda. Samakan harga di tabel sebelum mengubah pilihan.');if(!previous)unique.set(key,r);}
 let suggestions:VariableValues[]=[{}];
 for(const v of priced){
  const options=v.multiple?[[],...v.options.map(x=>[x])]:v.options.map(x=>[x]);
  if(suggestions.length*options.length>30)return [...unique.values()];
  suggestions=suggestions.flatMap(values=>options.map(choice=>({...values,[v.id]:choice})));
 }
 for(const values of suggestions){const key=source.type+combinationKey(variables,values);if(!unique.has(key))unique.set(key,{...structuredClone(source),key:id(),sku:undefined,variables,variableValues:values,price:'',channelPrices:{}});}
 if(unique.size>30)throw Error('Maksimal 30 pilihan harga per menu. Kurangi pilihan atau atur harga pilihan lain satu per satu.');
 return [...unique.values()];
}
