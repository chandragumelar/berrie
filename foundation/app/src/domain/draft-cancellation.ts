import { draftDateCode } from './draft';
export interface DraftCancellation { orderId:string; reason:string; recordedAt:string; operationId:string; actorId:string; policyVersion:number; draftRevision:number }
export function validateDraftCancellation(value:unknown): asserts value is DraftCancellation {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Pembatalan draft tidak sah');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='actorId,draftRevision,operationId,orderId,policyVersion,reason,recordedAt' || ![v.orderId,v.operationId,v.actorId].every(x=>typeof x==='string' && !!x.trim() && x.length<=200) || typeof v.reason!=='string' || !v.reason.trim() || v.reason.length>500 || !Number.isSafeInteger(v.draftRevision) || (v.draftRevision as number)<0 || !Number.isSafeInteger(v.policyVersion) || (v.policyVersion as number)<1 || typeof v.recordedAt!=='string') throw new Error('Pembatalan draft tidak sah');
 draftDateCode(v.recordedAt,'UTC');
}
