import {integer,requireCountedStock,type SKU,type State} from './domain.ts';
export const stockKey=(sku:SKU)=>sku.stockGroup??sku.id;
export const stockGroups=(catalog:SKU[])=>[...new Map(catalog.filter(x=>!x.archived).map(x=>[stockKey(x),x])).values()];
export function stockMembers(s:State,sku:SKU){return s.catalog.filter(x=>stockKey(x)===stockKey(sku));}
export function groupBalance(s:State,sku:SKU){const balance=requireCountedStock(sku);if(stockMembers(s,sku).some(x=>!Number.isSafeInteger(x.stock)||x.stock!==balance))throw Error('Saldo stok bersama tidak konsisten. isi jumlah stok melalui hitungan awal; data tidak diubah.');return balance;}
export function changeStock(s:State,sku:SKU,delta:number,reason:string,reference:string){const next=integer(groupBalance(s,sku)+delta);for(const member of stockMembers(s,sku))member.stock=next;s.stockLedger.push({sku:sku.id,group:stockKey(sku),delta,reason,time:Date.now(),reference});}
