import {integer,type SKU} from './domain.ts';
import {stockKey} from './shared-stock.ts';

export function recapValue(value:string|undefined, stock:number):number|null {
 try { const n=integer(value); return n<=stock?n:null; } catch { return null; }
}
export function fillUnchecked(groups:SKU[], values:Record<string,string>):Record<string,string> {
 const next={...values}; for(const group of groups){const key=stockKey(group);if((next[key]??'')==='')next[key]='0';} return next;
}
export function recapReady(groups:SKU[],values:Record<string,string>):boolean {
 return groups.every(group=>recapValue(values[stockKey(group)],group.stock)!==null);
}
