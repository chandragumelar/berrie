import { reduceCashReport, type CashReportEntry, type CashReport } from '../domain/cash-report';
import type { CashCountHistory } from '../domain/cash-count';
import type { CashMovement, CashSession } from '../domain/cash-session';
import { cashMovements } from './cash-sessions';
import { countBoundary } from './cash-count';
import type { AtomicChange } from './commit';
import type { BerrieDatabase } from './database';
import { sessionCloseBlockers } from './order-status';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

const valid=(x:unknown):x is string=>typeof x==='string' && !!x.trim() && x.length<=200;
/** Internal sensitive read. T-04 must authorize access and enforce blind counts. */
export async function readInternalCashReport(db:BerrieDatabase,storeId:string,sessionId:string):Promise<CashReport> {
 if(!valid(storeId) || !valid(sessionId)) throw new Error('ID tidak sah');
 const snapshot=validateCheckpoint(await checkpoint(db));
 const record=snapshot.state.find(r=>r.key===`cash-session:${sessionId}`)?.value as {recordType?:string;session?:CashSession}|undefined;
 if(record?.recordType!=='cash-session' || record.session?.id!==sessionId || record.session.storeId!==storeId) throw new Error('Sesi tidak ditemukan');
 const session=record.session,history=snapshot.state.find(r=>r.key===`cash-count:${sessionId}`)?.value as {history?:CashCountHistory}|undefined;
 const changes=snapshot.receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
 const movements=cashMovements(changes,sessionId);
 const cashKinds=new Set(['cash.open','cash.move','payment.draft-cash','payment.confirmed-cash','payment.correct-method','payment.adjust-closed-method','refund.served','refund.cancelled','cancellation.refund-paid']);
 const relevant=changes.filter(c=>cashKinds.has(c.kind) && c.state.some(s=>s.key===`cash-session:${sessionId}`) && c.ledger.length && c.ledger[0].value && typeof c.ledger[0].value==='object' && 'kind' in c.ledger[0].value && ['opening','in','out','sale','refund','method-correction','method-adjustment'].includes((c.ledger[0].value as {kind:string}).kind)).sort((a,b)=>(a.state.find(s=>s.key===`cash-session:${sessionId}`)!.expectedRevision ?? -1)-(b.state.find(s=>s.key===`cash-session:${sessionId}`)!.expectedRevision ?? -1));
 if(relevant.length!==movements.length) throw new Error('Ledger sesi tidak sesuai');
 const incomplete=sessionCloseBlockers(snapshot,storeId,sessionId).incomplete;
 const supported=new Set(['cash.open','cash.move','cash-count.save','cash-count.revise','cash-count.cancel','cash-count.handover','cash-count.close','payment.draft-cash','payment.confirmed-cash','payment.correct-method','payment.adjust-closed-method','refund.served','refund.cancelled','cancellation.refund-paid']);
 for(const c of changes.filter(c=>c.state.some(s=>s.key===`cash-session:${sessionId}`))) if(!supported.has(c.kind)) incomplete.push({key:c.operationId,reason:'Operasi sesi belum didukung'});
 incomplete.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:a.reason<b.reason?-1:a.reason>b.reason?1:0);
 const ledger:CashReportEntry[]=relevant.map(c=>{
  const movement=c.ledger[0].value as CashMovement,metadata=(c.payload as {metadata?:{recordedAt?:unknown}}).metadata;
  if(typeof metadata?.recordedAt!=='string') throw new Error('Waktu ledger tidak tersedia');
  const reason=movement.kind==='refund'?movement.refund.reason:movement.kind==='method-correction' || movement.kind==='method-adjustment'?movement.correction.reason:movement.kind==='in' || movement.kind==='out'?movement.description:null;
  const reference=movement.kind==='refund'?movement.refund.paymentId:movement.kind==='method-correction' || movement.kind==='method-adjustment'?movement.correction.evidenceReference ?? movement.correction.paymentId:movement.kind==='in' || movement.kind==='out'?movement.category:null;
  const paymentId=movement.kind==='refund'?movement.refund.paymentId:movement.kind==='method-correction' || movement.kind==='method-adjustment'?movement.correction.paymentId:movement.kind==='sale'?(c.result as {payment?:{id?:unknown}}).payment?.id:null;
  if(movement.kind==='sale' && !valid(paymentId)) throw new Error('Sumber pembayaran tidak tersedia');
  const refundId=movement.kind==='refund'?movement.refund.id:null;
  const originSessionId=movement.kind==='method-adjustment'?movement.correction.cashSessionId:null;
  return {ledgerId:c.ledger[0].id,operationId:c.operationId,sourceId:c.targetId,paymentId:paymentId as string|null,refundId,originSessionId,actorId:c.actorId,occurredAt:metadata.recordedAt,reason,reference,movement};
 });
 return structuredClone({storeId,session,checkpoint:{schema:snapshot.schema,boundary:countBoundary(snapshot)},status:incomplete.length?'incomplete' as const:'complete' as const,incomplete,report:reduceCashReport(session,history?.history ?? null,ledger)});
}
