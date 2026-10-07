import type {SKU} from './domain.ts';

export const fixedMenuTabs=['Semua','Habis','Promo'] as const;
export function validateMenuCategories(value:unknown):string[] {
 if(!Array.isArray(value)||value.some(x=>typeof x!=='string'))throw Error('Kategori harus berupa daftar nama.');
 const names=value.map(x=>(x as string).trim());
 if(names.some(x=>!x||x.length>40))throw Error('Isi nama kategori 1–40 karakter.');
 const keys=names.map(x=>x.toLocaleLowerCase('id'));
 if(new Set(keys).size!==keys.length)throw Error('Nama kategori harus unik.');
 if(keys.some(x=>fixedMenuTabs.some(tab=>tab.toLocaleLowerCase('id')===x)))throw Error('Semua, Habis, dan Promo adalah tab tetap. Pilih nama kategori lain.');
 return names;
}
export const menuTabs=(categories:string[])=>['Semua',...categories,'Habis','Promo'];
export const isOutOfStock=(sku:SKU)=>sku.stock===0;
export const matchesMenuTab=(sku:SKU,tab:string,discount:number)=>tab==='Habis'?isOutOfStock(sku):!isOutOfStock(sku)&&(tab==='Semua'||tab==='Promo'&&discount>0||sku.category===tab);
export function skuDisplayName(sku:SKU,catalog:SKU[]):string {
 const same=catalog.filter(x=>!x.archived&&x.name===sku.name&&(x.type??'Normal')===(sku.type??'Normal'));
 const variant=sku.variant&&!(sku.variant==='Reguler'&&same.length===1)?' · '+sku.variant:'';
 const code=same.some(x=>x.id!==sku.id&&x.variant===sku.variant)?' · '+sku.code:'';
 return sku.name+variant+code;
}
