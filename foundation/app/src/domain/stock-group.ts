export interface StockGroup { groupId:string; storeId:string; baseline:number; balance:number; minimum:number }
export function validateStockGroup(value:unknown): asserts value is StockGroup {
 if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Grup stok tidak sah');
 const v=value as Record<string,unknown>;
 if (Object.keys(v).sort().join(',')!=='balance,baseline,groupId,minimum,storeId' || ![v.groupId,v.storeId].every(id=>typeof id==='string' && !!id.trim() && id.length<=200) || ![v.baseline,v.balance,v.minimum].every(n=>typeof n==='number' && Number.isSafeInteger(n) && n>=0)) throw new Error('Grup stok tidak sah');
}
