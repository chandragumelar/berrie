import { cashBalance, type CashSession } from '../domain/cash-session';
import { validateCashCountHistory, type CashCountHistory, type CountEvent } from '../domain/cash-count';
import { draftDateCode } from '../domain/draft';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { cashMovements, type CashMetadata } from './cash-sessions';
import { sessionCloseBlockers } from './order-status';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { BerrieDatabase } from './database';

export type CountAction='save'|'revise'|'cancel'|'close';
export interface CountInput { sessionId:string; expectedSessionRevision:number; expectedCountRevision:number|null; amount?:number; reason?:string|null }
const countKey=(id:string)=>`cash-count:${id}`;
const sessionKey=(id:string)=>`cash-session:${id}`;
export function countBoundary(snapshot:Snapshot) {return snapshot.sequences.map(s=>({key:s.key,sequence:s.sequence})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);}
export function makeCashCountChange(snapshot:Snapshot,action:CountAction,data:CountInput,meta:CashMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Intent hitungan tidak sah');
 const keys=Object.keys(data).sort().join(',');
 if(action==='save' || action==='revise') {if(keys!=='amount,expectedCountRevision,expectedSessionRevision,sessionId' || !Number.isSafeInteger(data.amount) || (data.amount as number)<0) throw new Error('Nilai hitungan tidak sah');}
 else if(action==='cancel') {if(keys!=='expectedCountRevision,expectedSessionRevision,sessionId') throw new Error('Intent batal tidak sah');}
 else if(action==='close') {if(!['expectedCountRevision,expectedSessionRevision,reason,sessionId','expectedCountRevision,expectedSessionRevision,sessionId'].includes(keys) || (data.reason!==undefined && data.reason!==null && (typeof data.reason!=='string' || !data.reason.trim() || data.reason.length>500))) throw new Error('Alasan tidak sah');}
 else throw new Error('Aksi hitungan tidak sah');
 if(!Number.isSafeInteger(data.expectedSessionRevision) || data.expectedSessionRevision<0 || data.expectedSessionRevision===Number.MAX_SAFE_INTEGER || !(data.expectedCountRevision===null || Number.isSafeInteger(data.expectedCountRevision) && data.expectedCountRevision>=0 && data.expectedCountRevision<Number.MAX_SAFE_INTEGER)) throw new Error('Revisi hitungan tidak sah');
 draftDateCode(meta.recordedAt,'UTC');
 const row=snapshot.state.find(r=>r.key===sessionKey(data.sessionId)),record=row?.value as {recordType?:string;session?:CashSession};
 if(!row || row.revision!==data.expectedSessionRevision || record?.recordType!=='cash-session' || !record.session || record.session.id!==data.sessionId || record.session.storeId!==meta.storeId) throw new Error('Sesi atau revisi tidak sesuai');
 const count=snapshot.state.find(r=>r.key===countKey(data.sessionId)),value=count?.value as {recordType?:string;history?:CashCountHistory};
 if((count?.revision ?? null)!==data.expectedCountRevision || (count && (value?.recordType!=='cash-count' || !value.history))) throw new Error('Revisi hitungan berubah');
 const history=value?.history ?? {sessionId:data.sessionId,storeId:meta.storeId,events:[]};
 if(count) validateCashCountHistory(history);
 if(history.sessionId!==data.sessionId || history.storeId!==meta.storeId) throw new Error('Sumber hitungan tidak sesuai');
 const last=history.events.at(-1),active=last && (last.action==='save' || last.action==='revise')?last:undefined;
 if(last?.action==='close' || (action==='save' ? !!active : !active)) throw new Error('Status hitungan tidak sesuai');
 if(action!=='cancel') {const result=sessionCloseBlockers(snapshot,meta.storeId,data.sessionId);if(result.blockers.length || result.incomplete.length) throw new Error('Blocker atau sumber sesi belum lengkap');}
 const expected=action==='close'?cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),data.sessionId),record.session):null;
 const amount=action==='close'?active!.amount:action==='save' || action==='revise'?data.amount as number:null;
 const difference=expected===null?null:(amount as number)-expected;
 const reason=action==='close'?data.reason ?? null:null;
 if(difference!==null && difference!==0 && reason===null) throw new Error('Alasan selisih wajib');
 const event:CountEvent={action,purpose:'close',operationId:meta.operationId,actorId:meta.actorId,occurredAt:meta.recordedAt,sessionRevision:row.revision,boundary:countBoundary(snapshot),amount,reason,countOperationId:action==='close'?active!.operationId:null,expected,difference,blockers:[],incomplete:[]};
 const next={...history,events:[...history.events,event]};validateCashCountHistory(next);
 const operationId=meta.operationId;
 return {operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:`cash-count.${action}`,targetId:data.sessionId,payload:{data,metadata:meta,boundary:event.boundary},state:[{key:sessionKey(data.sessionId),expectedRevision:row.revision,value:record},{key:countKey(data.sessionId),expectedRevision:count?.revision ?? null,value:{recordType:'cash-count',schemaVersion:1,history:next}}],ledger:[],audit:[{id:`cash-count-audit:${operationId}`,operationId,value:{sessionId:data.sessionId,event,policyVersion:meta.policyVersion}}],outbox:{id:`cash-count-outbox:${operationId}`,operationId,value:{sessionId:data.sessionId,action}},result:{sessionId:data.sessionId,sessionRevision:row.revision+1,countRevision:(count?.revision ?? -1)+1,event}};
}
/** Internal command; actor and policy metadata do not authorize access. */
export function changeCashCount(db:BerrieDatabase,action:CountAction,input:CountInput,metadata:CashMetadata,locks:LockProvider=navigator.locks):Promise<unknown> {
 const data=copyInput(input) as CountInput,meta=copyInput(metadata) as CashMetadata;canonical({action,data,metadata:meta});
 return withWriterTransaction(db,locks,async commit=>{
  const prior=await db.receipts.get(meta.operationId);
  if(prior) {const c=JSON.parse(prior.payload) as AtomicChange,p=c.payload as {data:unknown;metadata:unknown};if(c.kind!==`cash-count.${action}` || canonical({data:p.data,metadata:p.metadata})!==canonical({data,metadata:meta})) throw new Error('Konflik operation ID');return prior.result;}
  const snapshot=validateCheckpoint(await checkpoint(db));return commit(makeCashCountChange(snapshot,action,data,meta));
 });
}
/** Internal read only. The returned close snapshot is immutable evidence, not authorization. */
export async function readCashCount(db:BerrieDatabase,storeId:string,sessionId:string):Promise<CashCountHistory|null> {
 const s=validateCheckpoint(await checkpoint(db)),session=s.state.find(r=>r.key===sessionKey(sessionId))?.value as {recordType?:string;session?:CashSession}|undefined;
 if(session?.recordType!=='cash-session' || session.session?.id!==sessionId || session.session.storeId!==storeId) throw new Error('Sesi tidak ditemukan');
 const row=s.state.find(r=>r.key===countKey(sessionId)),value=row?.value as {recordType?:string;history?:CashCountHistory};
 if(!row) return null;
 if(value?.recordType!=='cash-count' || !value.history || value.history.storeId!==storeId || value.history.sessionId!==sessionId) throw new Error('Hitungan tidak ditemukan');
 return structuredClone(value.history);
}
