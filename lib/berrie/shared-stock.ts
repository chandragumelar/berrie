import {integer,requireCountedStock,type SKU,type State} from './domain.ts';
export const stockKey=(sku:SKU)=>sku.stockGroup??sku.id;
export const stockGroups=(catalog:SKU[])=>[...new Map(catalog.filter(x=>!x.archived).map(x=>[stockKey(x),x])).values()];
export function stockMembers(s:State,sku:SKU){return s.catalog.filter(x=>stockKey(x)===stockKey(sku));}
export function groupBalance(s:State,sku:SKU){const balance=requireCountedStock(sku);if(stockMembers(s,sku).some(x=>!Number.isSafeInteger(x.stock)||x.stock!==balance))throw Error('Saldo stok bersama tidak konsisten. isi jumlah stok melalui hitungan awal; data tidak diubah.');return balance;}
export function stockBaseline(s:State,sku:SKU){return sku.stockBaseline??integer(groupBalance(s,sku)-s.stockLedger.filter(e=>e.group===stockKey(sku)||!e.group&&e.sku===sku.id).reduce((sum,e)=>sum+e.delta,0));}
export function changeStock(s:State,sku:SKU,delta:number,reason:string,reference:string){const before=groupBalance(s,sku),baseline=stockBaseline(s,sku),next=integer(before+delta);for(const member of stockMembers(s,sku)){member.stockBaseline??=baseline;member.stock=next;}s.stockLedger.push({sku:sku.id,group:stockKey(sku),delta,reason,time:Date.now(),reference,actor:s.actor,before,after:next});}
