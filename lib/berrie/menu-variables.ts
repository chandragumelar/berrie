import {integer,type State,type SKU} from './domain.ts';
import {stockKey} from './shared-stock.ts';

export interface MenuVariable {id:string;name:string;multiple:boolean;pricing:'combination'|'free'|'extra';options:string[];defaults:string[];prices?:Record<string,number>;}
export type VariableValues=Record<string,string[]>;
export function validateVariables(input:unknown):MenuVariable[]{
 if(!Array.isArray(input)||input.length>12)throw Error('Maksimal 12 variabel per menu.');
 const ids=new Set<string>(),names=new Set<string>();
 return input.map(raw=>{
  if(!raw||typeof raw!=='object')throw Error('Periksa variabel menu.');const v=raw as MenuVariable;
  if(typeof v.id!=='string'||!v.id||ids.has(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>40||names.has(v.name.trim().toLowerCase()))throw Error('Nama variabel wajib, unik, maks. 40 karakter.');
  if(typeof v.multiple!=='boolean'||!['combination','free','extra'].includes(v.pricing)||!Array.isArray(v.options)||!v.options.length||v.options.length>30||v.options.some(x=>typeof x!=='string'||!x.trim()||x.trim()==='-'||x.trim().length>40))throw Error('Isi 1–30 pilihan untuk setiap variabel; kosong memakai -.');
  const options=v.options.map(x=>x.trim());if(new Set(options.map(x=>x.toLowerCase())).size!==options.length)throw Error('Pilihan variabel harus berbeda.');
  const defaults=v.defaults??[];if(!Array.isArray(defaults)||defaults.some(x=>!options.includes(x))||new Set(defaults).size!==defaults.length||!v.multiple&&defaults.length>1)throw Error('Periksa pilihan bawaan.');
  const prices=v.pricing==='extra'?Object.fromEntries(options.map(x=>[x,integer(v.prices?.[x]??0)])):undefined;
  ids.add(v.id);names.add(v.name.trim().toLowerCase());return {...v,name:v.name.trim(),options,defaults:[...defaults],prices};
 });
}
export function validateValues(variables:MenuVariable[],input:unknown):VariableValues {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Periksa pilihan variabel.');const values=input as VariableValues;
 if(Object.keys(values).some(key=>!variables.some(v=>v.id===key)))throw Error('Variabel tidak ditemukan.');
 return Object.fromEntries(variables.map(v=>{const selected=values[v.id]??[];if(!Array.isArray(selected)||new Set(selected).size!==selected.length||!v.multiple&&selected.length>1||selected.some(x=>!v.options.includes(x)))throw Error(`Pilihan ${v.name} tidak tersedia.`);return [v.id,v.options.filter(x=>selected.includes(x))];}));
}
export const combinationKey=(variables:MenuVariable[],values:VariableValues)=>JSON.stringify(variables.filter(v=>v.pricing==='combination').map(v=>[v.id,v.options.filter(x=>values[v.id]?.includes(x))]));
export const combinationLabel=(variables:MenuVariable[],values:VariableValues)=>variables.filter(v=>v.pricing==='combination').map(v=>values[v.id]?.join(' + ')||'-').join(' · ')||'Reguler';
// Read compatibility for the prototype's existing sample catalog. Historical units stay unchanged.
export function variablesForSKU(s:Pick<State,'catalog'|'toppings'>,sku:SKU):MenuVariable[]{
 if(sku.variables)return structuredClone(sku.variables);
 const members=s.catalog.filter(x=>stockKey(x)===stockKey(sku)),prefix=stockKey(sku),vars:MenuVariable[]=[];
 for(const [field,name] of [['flavour','Rasa'],['size','Ukuran']] as const){const options=[...new Set(members.map(x=>x[field]??'').filter(Boolean))];if(options.length)vars.push({id:prefix+':'+field,name,multiple:false,pricing:'combination',options,defaults:[]});}
 for(const r of sku.recipes??[])vars.push({id:prefix+':recipe:'+r.name,name:r.name,multiple:false,pricing:'free',options:[...r.options],defaults:[r.default]});
 const tops=s.toppings.filter(x=>sku.toppings.includes(x.id));if(tops.length)vars.push({id:prefix+':toppings',name:'Topping',multiple:true,pricing:'extra',options:tops.map(x=>x.name),defaults:[],prices:Object.fromEntries(tops.map(x=>[x.name,x.price]))});
 return vars;
}
export function valuesForSKU(sku:SKU):VariableValues {return structuredClone(sku.variables?Object.fromEntries(sku.variables.filter(v=>v.pricing==='combination').map(v=>[v.id,sku.variableValues?.[v.id]??[]])):sku.variableValues??Object.fromEntries([['flavour',sku.flavour],['size',sku.size]].filter(([,v])=>v).map(([field,v])=>[stockKey(sku)+':'+field,[v!]])));}
export function variableSnapshot(variables:MenuVariable[],values:VariableValues){return variables.map(v=>`${v.name}: ${values[v.id]?.join(' + ')||'-'}`);}
