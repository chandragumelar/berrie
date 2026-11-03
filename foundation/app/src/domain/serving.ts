import type { FirstBatch } from './first-batch';

export interface ServingState {
 storeId:string; orderId:string; cashSessionId:string;
 units:{id:string;status:'processed'|'served'}[];
}
export function validateServingState(value:unknown): asserts value is ServingState {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('State penyajian tidak sah');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='cashSessionId,orderId,storeId,units' || ![v.storeId,v.orderId,v.cashSessionId].every(x=>typeof x==='string' && !!x.trim() && x.length<=200) || !Array.isArray(v.units) || !v.units.length) throw new Error('State penyajian tidak sah');
 const ids=new Set<string>();
 for(const unit of v.units) {
  if(!unit || typeof unit!=='object' || Array.isArray(unit) || Object.getPrototypeOf(unit)!==Object.prototype || Object.keys(unit).sort().join(',')!=='id,status' || typeof unit.id!=='string' || !unit.id.trim() || unit.id.length>200 || ids.has(unit.id) || !['processed','served'].includes(unit.status)) throw new Error('Unit penyajian tidak sah');
  ids.add(unit.id);
 }
}
export function initialServing(batch:FirstBatch):ServingState {
 return {storeId:batch.storeId,orderId:batch.draft.orderId,cashSessionId:batch.draft.cashSessionId,units:batch.draft.items.flatMap(item=>item.unitIds.map(id=>({id,status:'processed' as const})))};
}
export function changeServing(before:ServingState,unitIds:unknown,action:'serve'|'correct',reason:unknown):ServingState {
 validateServingState(before);
 if(!Array.isArray(unitIds) || !unitIds.length || unitIds.some(id=>typeof id!=='string' || !id.trim()) || new Set(unitIds).size!==unitIds.length) throw new Error('Pilihan unit tidak sah');
 if(action==='correct' ? typeof reason!=='string' || !reason.trim() || reason.length>500 : reason!==null) throw new Error('Alasan koreksi wajib');
 const selected=new Set(unitIds), from=action==='serve'?'processed':'served',to=action==='serve'?'served':'processed';
 if([...selected].some(id=>!before.units.some(unit=>unit.id===id && unit.status===from))) throw new Error('Unit asing atau status penyajian tidak sesuai');
 return {...before,units:before.units.map(unit=>selected.has(unit.id)?{...unit,status:to}:unit)};
}
