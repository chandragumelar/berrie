import { cashBalance, type CashSession } from '../domain/cash-session';
import { custodySegments, validateCashCountHistory, type CashCountHistory, type CountEvent } from '../domain/cash-count';
import { draftDateCode } from '../domain/draft';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { cashMovements, type CashMetadata } from './cash-sessions';
import { sessionCloseBlockers } from './order-status';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { BerrieDatabase } from './database';

export type CountAction='save'|'revise'|'cancel'|'close'|'handover';
export interface CountInput { sessionId:string; expectedSessionRevision:number; expectedCountRevision:number|null; amount?:number; reason?:string|null; purpose?:'handover'; incoming?:string; received?:number; withoutOutgoingReason?:string|null }
const countKey=(id:string)=>`cash-count:${id}`;
const sessionKey=(id:string)=>`cash-session:${id}`;
export function countBoundary(snapshot:Snapshot) {return snapshot.sequences.map(s=>({key:s.key,sequence:s.sequence})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);}
export function makeCashCountChange(snapshot:Snapshot,action:CountAction,data:CountInput,meta:CashMetadata):AtomicChange {
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Intent hitungan tidak sah');
 const purpose=data.purpose ?? 'close';
 const base=['expectedCountRevision','expectedSessionRevision','sessionId'];
 const validKeys=(required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(data,k)) && Object.keys(data).every(k=>required.includes(k) || optional.includes(k));
 const validReason=(v:unknown)=>v===undefined || v===null || typeof v==='string' && !!v.trim() && v.length<=500;
 if(data.purpose!==undefined && data.purpose!=='handover') throw new Error('Tujuan hitungan tidak sah');
 const purposeKey=purpose==='handover'?['purpose']:[];
 if(action==='save' || action==='revise') {if(!validKeys([...base,...purposeKey,'amount']) || !Number.isSafeInteger(data.amount) || (data.amount as number)<0) throw new Error('Nilai hitungan tidak sah');}
 else if(action==='cancel') {if(!validKeys([...base,...purposeKey])) throw new Error('Intent batal tidak sah');}
 else if(action==='close') {if(purpose!=='close' || !validKeys(base,['reason']) || !validReason(data.reason)) throw new Error('Alasan tidak sah');}
 else if(action==='handover') {if(purpose!=='handover' || !validKeys([...base,'purpose','incoming','received'],['reason','withoutOutgoingReason']) || typeof data.incoming!=='string' || !data.incoming.trim() || data.incoming.length>200 || !Number.isSafeInteger(data.received) || data.received!<0 || !validReason(data.reason) || !validReason(data.withoutOutgoingReason)) throw new Error('Intent serah-terima tidak sah');}
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
 if(last?.action==='close' || (action==='save' ? !!active : !active) || (active && active.purpose!==purpose)) throw new Error('Status hitungan tidak sesuai');
 if(purpose==='close' && action!=='cancel') {const result=sessionCloseBlockers(snapshot,meta.storeId,data.sessionId);if(result.blockers.length || result.incomplete.length) throw new Error('Blocker atau sumber sesi belum lengkap');}
 const current=custodySegments(record.session,history.events.length?history:null).at(-1)!;
 if(current.closingOperationId!==null) throw new Error('Sesi sudah ditutup');
 const final=action==='close' || action==='handover';
 const expected=final?cashBalance(cashMovements(snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange),data.sessionId),record.session):null;
 const amount=final?active!.amount:action==='save' || action==='revise'?data.amount as number:null;
 const difference=expected===null?null:Number(BigInt(amount!)-BigInt(expected));
 if(difference!==null && !Number.isSafeInteger(difference)) throw new Error('Selisih melampaui batas aman');
 const reason=final?data.reason ?? null:null;
 const segmentExpected=expected===null?null:Number(BigInt(current.openingPhysical)+BigInt(expected)-BigInt(current.openingExpected));
 const segmentDifference=segmentExpected===null?null:Number(BigInt(amount!)-BigInt(segmentExpected));
 if(final && (!Number.isSafeInteger(segmentExpected) || !Number.isSafeInteger(segmentDifference))) throw new Error('Segmen melampaui batas aman');
 if(action==='close' && ((difference!==0 || segmentDifference!==0) && reason===null)) throw new Error('Alasan selisih wajib');
 if(action==='close' && history.events.some(e=>e.action==='handover') && meta.actorId!==current.custodian) throw new Error('Penanggung jawab tutup tidak sesuai');
 let handover:CountEvent['handover'];
 if(action==='handover') {
  const without=data.withoutOutgoingReason ?? null;
  if(data.incoming===current.custodian || data.received!==amount || meta.actorId!==data.incoming || (segmentDifference!==0 && reason===null)) throw new Error('Konfirmasi serah-terima tidak sesuai');
  const start=history.events.length-1-[...history.events].reverse().findIndex(e=>e.action==='save');
  const countActors=history.events.slice(start).filter(e=>e.action==='save' || e.action==='revise').map(e=>e.actorId);
  if(without===null ? countActors.some(id=>id!==current.custodian) : countActors.some(id=>id!==meta.actorId)) throw new Error('Actor hitungan tidak sesuai');
  handover={outgoing:current.custodian,incoming:data.incoming!,received:data.received!,withoutOutgoingReason:without,segmentExpected:segmentExpected!,segmentDifference:segmentDifference!};
 }
 const event:CountEvent={action,purpose,operationId:meta.operationId,actorId:meta.actorId,occurredAt:meta.recordedAt,sessionRevision:row.revision,boundary:countBoundary(snapshot),amount,reason,countOperationId:final?active!.operationId:null,expected,difference,blockers:[],incomplete:[],...(handover?{handover}:{})};
 const next={...history,events:[...history.events,event]};validateCashCountHistory(next);custodySegments(record.session,next);
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

/** Internal read: full evidence is sensitive; T-04 must authorize and enforce blind counts. */
export async function readCustodySegments(db:BerrieDatabase,storeId:string,sessionId:string) {
 const snapshot=validateCheckpoint(await checkpoint(db));
 const record=snapshot.state.find(r=>r.key===sessionKey(sessionId))?.value as {recordType?:string;session?:CashSession}|undefined;
 if(record?.recordType!=='cash-session' || record.session?.id!==sessionId || record.session.storeId!==storeId) throw new Error('Sesi tidak ditemukan');
 const count=snapshot.state.find(r=>r.key===countKey(sessionId))?.value as {history?:CashCountHistory}|undefined;
 return structuredClone(custodySegments(record.session,count?.history ?? null));
}
