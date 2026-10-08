import type {SKU,State} from './domain.ts';
export const defaultTypes=['Normal','Paket','Promo'];
export const configuredTypes=(s:State)=>[...new Set([...defaultTypes,...(s.settings.menuTypes??[]),...s.catalog.map(x=>x.type??'Normal')])];
export function typeLabel(value:unknown){const name=String(value??'Normal').trim();if(!name||name.length>40||!/^[\p{L}\p{N}][\p{L}\p{N} .&-]*$/u.test(name))throw Error('Nama tipe wajib 1–40 huruf/angka, tanpa simbol khusus.');return name;}
export function autoAliases(types:string[],existing:Record<string,string>={}){
 const result={...existing},used=new Set(Object.values(existing).map(x=>x.toUpperCase()));
 for(const type of types){if(result[type])continue;const letters=type.normalize('NFKD').replace(/[^a-z0-9]/gi,'').toUpperCase()||'T';let alias=letters[0];for(let length=2;used.has(alias)&&length<=Math.min(3,letters.length);length++)alias=letters.slice(0,length);if(used.has(alias)){let suffix=2;while(used.has(letters[0]+suffix)&&suffix<=99)suffix++;if(suffix>99)throw Error('Kode tipe sudah penuh. Gunakan nama tipe dengan huruf depan lain.');alias=letters[0]+suffix;}result[type]=alias;used.add(alias);}
 return result;
}
export function nextSKUCode(catalog:SKU[],alias:string){let sequence=1;while(catalog.some(x=>x.code.toUpperCase()===`${alias}-${String(sequence).padStart(3,'0')}`))sequence++;return `${alias}-${String(sequence).padStart(3,'0')}`;}
export const lowStockItems=(catalog:SKU[])=>catalog.filter(x=>!x.archived&&Number.isSafeInteger(x.stock)&&x.stock>=0&&x.stock<=x.threshold);
