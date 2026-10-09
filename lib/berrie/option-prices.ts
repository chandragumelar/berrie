import {id,integer,type Channel} from './domain.ts';
import {combinationKey,validateVariables,type MenuVariable,type VariableValues} from './menu-variables.ts';
import {type MenuRow} from './workshop.ts';

// Convert legacy combination prices only when option increments explain every price.
export function optionPriceDraft(value:MenuVariable[],existing:MenuRow[]){
 const active=existing.filter(r=>!r.archived),base=Math.min(...active.map(r=>integer(r.price,1)));
 const variables=structuredClone(value).map(v=>{
  const prices=v.pricing==='combination'?Object.fromEntries(v.options.map(option=>{
   const matches=active.filter(r=>r.variableValues?.[v.id]?.includes(option));
   return [option,matches.length?Math.min(...matches.map(r=>Number(r.price)))-base:0];
  })):v.prices??Object.fromEntries(v.options.map(x=>[x,0]));
  return {...v,prices,defaults:v.options.length?[v.options[0]]:[]};
 });
 let error=value.some(v=>v.pricing==='combination'&&v.multiple)?'Harga gabungan lama belum dapat diubah menjadi tambahan per pilihan. Pertahankan harga di tabel untuk menu ini.':'';
 for(const r of active){const calculated=base+variables.filter(v=>v.pricing==='combination').reduce((sum,v)=>sum+(r.variableValues?.[v.id]??[]).reduce((n,x)=>n+(v.prices?.[x]??0),0),0);if(calculated!==Number(r.price))error='Harga lama tidak cocok dengan tambahan per pilihan. Samakan harga kombinasi di tabel sebelum mengubah varian.';}
 return {base:String(base),variables,error};
}

export function applyOptionPrices(input:MenuVariable[],baseInput:string,existing:MenuRow[],channels:string[]):{variables:MenuVariable[];prices:MenuRow[]}{
 const base=integer(baseInput,1),source=existing.find(r=>!r.archived);if(!source)throw Error('Menu tidak ditemukan.');
 const variables=validateVariables(input.map(v=>{
  const prices=Object.fromEntries(v.options.map(raw=>[raw.trim(),integer(v.prices?.[raw]??'')]));
  const priced=Object.values(prices).some(x=>x>0);
  return {...v,options:v.options.map(x=>x.trim()),defaults:v.options.length?[v.options[0].trim()]:[],pricing:priced?(v.multiple?'extra':'combination'):'free',prices};
 })).map((v,i)=>({...v,prices:Object.fromEntries(input[i].options.map(raw=>[raw.trim(),integer(input[i].prices?.[raw]??'')]))}));
 let choices:VariableValues[]=[{}];
 for(const v of variables.filter(v=>v.pricing==='combination')){
  if(choices.length*v.options.length>30)throw Error('Maksimal 30 kombinasi harga per menu. Kurangi pilihan varian.');
  choices=choices.flatMap(values=>v.options.map(x=>({...values,[v.id]:[x]})));
 }
 const originalBase=Math.min(...existing.filter(r=>!r.archived).map(r=>integer(r.price,1)));
 const channelBases=Object.fromEntries(channels.map(ch=>{
  const values=existing.filter(r=>!r.archived).map(r=>integer(r.channelPrices?.[ch as Channel],1));
  return [ch,Math.min(...values)];
 }));
 const used=new Set<string>();
 const prices=choices.map(values=>{
  const increment=variables.filter(v=>v.pricing==='combination').reduce((sum,v)=>sum+(v.prices?.[values[v.id][0]]??0),0);
  const key=combinationKey(variables,values);
  const matches=existing.filter(r=>!r.archived&&combinationKey(variables,r.variableValues??{})===key);
  if(matches.some(r=>r.available!==matches[0].available||r.type!==matches[0].type||r.category!==matches[0].category||JSON.stringify(r.promos??{})!==JSON.stringify(matches[0].promos??{})))throw Error('Pilihan lama memiliki status, kategori, tipe atau diskon berbeda. Samakan di tabel sebelum menggabungkan pilihan.');
  const old=matches.find(r=>!used.has(r.key));
  if(old)used.add(old.key);
  const row=old??{...structuredClone(source),key:id(),sku:undefined};
  const price=integer(base+increment,1);
  // Preserve channel differences; do not silently collapse a legacy channel matrix.
  for(const ch of channels)if(old&&Number(old.price)-originalBase!==integer(old.channelPrices?.[ch as Channel],1)-channelBases[ch])throw Error('Tambahan harga channel lama berbeda. Samakan selisih harga channel di tabel dahulu.');
  return {...row,variables:structuredClone(variables),variableValues:values,flavour:'',size:'',recipes:[],toppings:[],price:String(price),channelPrices:{...row.channelPrices,Toko:price,...Object.fromEntries(channels.map(ch=>[ch,integer(channelBases[ch]+increment,1)]))}};
 });
 return {variables,prices};
}
