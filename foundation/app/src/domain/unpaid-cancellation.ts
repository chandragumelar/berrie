import { draftDateCode } from './draft';

export interface UnpaidCancellationEvent {
 id:string; orderId:string; storeId:string; cashSessionId:string; unitIds:string[];
 reason:string; kitchenConfirmed:true; actorId:string; recordedAt:string;
}
export interface UnpaidReturnEvent {
 id:string; cancellationId:string; orderId:string; storeId:string; cashSessionId:string;
 units:{id:string;groupId:string}[]; reason:string; sellable:true; actorId:string; recordedAt:string;
}
const id=(v:unknown):v is string=>typeof v==='string' && !!v.trim() && v.length<=200;
const reason=(v:unknown)=>typeof v==='string' && !!v.trim() && v.length<=500;
const plain=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
export function validateUnpaidCancellation(value:unknown):asserts value is UnpaidCancellationEvent {
 if(!plain(value) || Object.keys(value).sort().join(',')!=='actorId,cashSessionId,id,kitchenConfirmed,orderId,reason,recordedAt,storeId,unitIds' || ![value.id,value.orderId,value.storeId,value.cashSessionId,value.actorId].every(id) || !reason(value.reason) || value.kitchenConfirmed!==true || typeof value.recordedAt!=='string' || !Array.isArray(value.unitIds) || !value.unitIds.length || !value.unitIds.every(id) || new Set(value.unitIds).size!==value.unitIds.length) throw new Error('Pembatalan unpaid tidak sah');
 draftDateCode(value.recordedAt,'UTC');
}
export function validateUnpaidReturn(value:unknown):asserts value is UnpaidReturnEvent {
 if(!plain(value) || Object.keys(value).sort().join(',')!=='actorId,cancellationId,cashSessionId,id,orderId,reason,recordedAt,sellable,storeId,units' || ![value.id,value.cancellationId,value.orderId,value.storeId,value.cashSessionId,value.actorId].every(id) || !reason(value.reason) || value.sellable!==true || typeof value.recordedAt!=='string' || !Array.isArray(value.units) || !value.units.length) throw new Error('Return unpaid tidak sah');
 draftDateCode(value.recordedAt,'UTC');
 const seen=new Set<string>();for(const unit of value.units) {if(!plain(unit) || Object.keys(unit).sort().join(',')!=='groupId,id' || !id(unit.id) || !id(unit.groupId) || seen.has(unit.id)) throw new Error('Unit return tidak sah');seen.add(unit.id);}
}
