import {integer,allocate,id,type State,type SKU,type Channel,type DiscountDefinition,type Unit} from './domain.ts';
export function validateDiscount(input:Record<string,unknown>,existing?:DiscountDefinition):DiscountDefinition {
 const name=String(input.name??'').trim(),mode=input.mode as DiscountDefinition['mode'];
 if(!name||name.length>80)throw Error('Isi nama diskon 1–80 karakter.');
 if(!['percent','amount','bogo'].includes(mode))throw Error('Pilih jenis diskon.');
 const hasStart=input.startsAt!==undefined&&input.startsAt!==null&&input.startsAt!=='',hasEnd=input.endsAt!==undefined&&input.endsAt!==null&&input.endsAt!=='';
 if(hasStart!==hasEnd)throw Error('Lengkapi tanggal dan jam mulai serta selesai.');
 const startsAt=hasStart?integer(input.startsAt,0,8640000000000000):undefined,endsAt=hasEnd?integer(input.endsAt,0,8640000000000000):undefined;
 if(startsAt!==undefined&&(startsAt%60000!==0||endsAt!%60000!==0||endsAt!<=startsAt))throw Error('Waktu selesai harus setelah waktu mulai, dengan ketelitian menit.');
 return {id:existing?.id??id(),name,mode,startsAt,endsAt,value:mode==='bogo'?0:integer(input.value,1,mode==='percent'?10000:999999999),buy:mode==='bogo'?integer(input.buy,1,99):undefined,free:mode==='bogo'?integer(input.free,1,99):undefined,revision:(existing?.revision??0)+1,archived:false};
}
export function assignDiscount(s:State,sku:SKU,channel:Channel,definition:string){
 if(!['Toko','GoFood','GrabFood','ShopeeFood'].includes(channel)||typeof definition!=='string')throw Error('Pilihan diskon / channel tidak sah.');
 const d=(s.discounts??[]).find(x=>x.id===definition&&!x.archived);
 if(definition&&!d)throw Error('Diskon tidak tersedia. Pilih ulang diskon.');
 if(d)integer(sku.channelPrices[channel],1);
 if(d?.mode==='amount'&&d.value>sku.channelPrices[channel])throw Error(`${sku.name}: potongan melebihi harga ${channel}.`);
 sku.discountAssignments={...sku.discountAssignments,[channel]:definition};
 sku.promos={...sku.promos,[channel]:d?{definition:d.id,name:d.name,startsAt:d.startsAt,endsAt:d.endsAt,mode:d.mode,value:d.value,buy:d.buy,free:d.free,revision:(sku.promos?.[channel]?.revision??0)+1,active:true}:{mode:'none',name:'',value:0,revision:(sku.promos?.[channel]?.revision??0)+1,active:false}};
}
export function applyDiscountDefinition(s:State,input:Record<string,unknown>){
 const old=(s.discounts??[]).find(x=>x.id===input.id);
 if(input.id&&!old)throw Error('Diskon tidak ditemukan.');
 if(input.operation==='delete'){
  if(!old)throw Error('Diskon tidak ditemukan.');
  if(s.catalog.some(x=>!x.archived&&Object.values(x.discountAssignments??{}).includes(old.id)))throw Error('Diskon masih dipakai. Lepaskan dari menu sebelum menghapus.');
  old.archived=true;return;
 }
 const d=validateDiscount(input,old);
 if((s.discounts??[]).some(x=>!x.archived&&x.id!==d.id&&x.name.toLocaleLowerCase('id')===d.name.toLocaleLowerCase('id')))throw Error('Nama diskon sudah dipakai.');
 s.discounts??=[];
 if(old)s.discounts[s.discounts.indexOf(old)]=d;else s.discounts.push(d);
 // Updating the definition changes future quotes only; order-unit snapshots stay untouched.
 for(const sku of s.catalog.filter(x=>!x.archived))for(const [channel,assigned] of Object.entries(sku.discountAssignments??{}))if(assigned===d.id)assignDiscount(s,sku,channel as Channel,d.id);
}
export function rebalanceQuantityPromos(units:Unit[]):Unit[]{
 const result=structuredClone(units),groups=new Map<string,Unit[]>();
 for(const u of result){if(u.state!=='draft'||u.promoMode!=='bogo')continue;
  integer(u.promoBuy,1,99);integer(u.promoFree,1,99);
  const key=JSON.stringify([u.sku,u.price,u.promoName,u.promoRevision,u.promoBuy,u.promoFree,u.toppingNames,u.toppingPrice,u.serving,u.note,u.recipes,u.variableValues]);
  groups.set(key,[...(groups.get(key)??[]),u]);u.promoDiscount=0;
 }
 for(const group of groups.values()){
  const size=group[0].promoBuy!+group[0].promoFree!,complete=Math.floor(group.length/size)*size;
  // Original insertion order picks bundles; IDs deterministically allocate odd rupiah within each bundle.
  for(let start=0;start<complete;start+=size){const bundle=group.slice(start,start+size),discount=bundle[0].price*bundle[0].promoFree!,parts=allocate(discount,bundle.map(u=>u.price),bundle.map(u=>u.id));bundle.forEach((u,i)=>u.promoDiscount=parts[i]);}
 }
 return result;
}
export const discountDescription=(d:Pick<DiscountDefinition,'mode'|'value'|'buy'|'free'>)=>d.mode==='bogo'?`Beli ${d.buy} gratis ${d.free}`:d.mode==='percent'?`${d.value/100}%`:`Rp${d.value.toLocaleString('id-ID')}`;
