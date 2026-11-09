import type { CashSession } from './cash-session';

/** Internal evidence only. Authentication and blind-count access are T-04 concerns. */
export interface CountBoundary { key:string; sequence:number }
export interface CountEvent {
 action:'save'|'revise'|'cancel'|'close'|'handover'; purpose:'close'|'handover'; operationId:string; actorId:string; occurredAt:string;
 sessionRevision:number; boundary:CountBoundary[]; amount:number|null; reason:string|null;
 countOperationId:string|null; expected:number|null; difference:number|null;
 blockers:string[]; incomplete:string[];
 handover?: { outgoing:string; incoming:string; received:number; withoutOutgoingReason:string|null; segmentExpected:number; segmentDifference:number };
}
export interface CashCountHistory { sessionId:string; storeId:string; events:CountEvent[] }
export interface CustodySegment {
 custodian:string; openingPhysical:number; openingExpected:number; openingBoundary:CountBoundary[]|null;
 closingPhysical:number|null; closingExpected:number|null; closingBoundary:CountBoundary[]|null;
 segmentExpected:number|null; difference:number|null; closingOperationId:string|null;
}
const text=(x:unknown)=>typeof x==='string' && !!x.trim() && x.length<=200;
const reason=(x:unknown)=>typeof x==='string' && !!x.trim() && x.length<=500;
function safe(value:bigint):number {const n=Number(value);if(!Number.isSafeInteger(n)) throw new Error('Perhitungan segmen melampaui batas aman');return n;}
/** Reconstruct only explicit custody evidence, using ledger balances at committed boundaries. */
export function custodySegments(session:CashSession,history:CashCountHistory|null):CustodySegment[] {
 let custodian=session.initialCustodian,physical=session.openingAmount,expected=session.openingAmount,boundary:CountBoundary[]|null=null;
 const segments:CustodySegment[]=[];
 for(const event of history?.events ?? []) {
  if(event.action!=='handover' && event.action!=='close') continue;
  if(event.amount===null || event.expected===null) throw new Error('Batas segmen tidak lengkap');
  const segmentExpected=safe(BigInt(physical)+BigInt(event.expected)-BigInt(expected));
  const difference=safe(BigInt(event.amount)-BigInt(segmentExpected));
  if(event.action==='handover' && (!event.handover || event.handover.outgoing!==custodian || event.handover.received!==event.amount || event.handover.segmentExpected!==segmentExpected || event.handover.segmentDifference!==difference)) throw new Error('Segmen serah-terima tidak sesuai');
  segments.push({custodian,openingPhysical:physical,openingExpected:expected,openingBoundary:boundary,closingPhysical:event.amount,closingExpected:event.expected,closingBoundary:event.boundary,segmentExpected,difference,closingOperationId:event.operationId});
  physical=event.amount;expected=event.expected;boundary=event.boundary;
  if(event.action==='handover') custodian=event.handover!.incoming;
 }
 if(history?.events.at(-1)?.action!=='close') segments.push({custodian,openingPhysical:physical,openingExpected:expected,openingBoundary:boundary,closingPhysical:null,closingExpected:null,closingBoundary:null,segmentExpected:null,difference:null,closingOperationId:null});
 else {
  const total=segments.reduce((sum,s)=>sum+BigInt(s.difference!),0n),last=history.events.at(-1)!;
  if(safe(total)!==last.difference) throw new Error('Selisih segmen tidak merekonsiliasi sesi');
 }
 return segments;
}
export function validateCashCountHistory(input:unknown): asserts input is CashCountHistory {
 if(!input || typeof input!=='object' || Array.isArray(input) || Object.getPrototypeOf(input)!==Object.prototype) throw new Error('Histori hitungan tidak sah');
 const h=input as CashCountHistory;
 if(Object.keys(h).sort().join(',')!=='events,sessionId,storeId' || !text(h.sessionId) || !text(h.storeId) || !Array.isArray(h.events) || !h.events.length) throw new Error('Histori hitungan tidak sah');
 for(const e of h.events) {
  const keys='action,actorId,amount,blockers,boundary,countOperationId,difference,expected,incomplete,occurredAt,operationId,purpose,reason,sessionRevision';
  if(!e || typeof e!=='object' || Object.keys(e).sort().join(',')!==(e.action==='handover'?keys.replace('incomplete,','handover,incomplete,'):keys) || !['close','handover'].includes(e.purpose) || !['save','revise','cancel','close','handover'].includes(e.action) || (e.action==='close' && e.purpose!=='close') || (e.action==='handover' && e.purpose!=='handover') || !text(e.actorId) || !text(e.operationId) || !Number.isSafeInteger(e.sessionRevision) || e.sessionRevision<0 || typeof e.occurredAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(e.occurredAt) || !Number.isFinite(Date.parse(e.occurredAt)) || !Array.isArray(e.boundary) || !Array.isArray(e.blockers) || !Array.isArray(e.incomplete)) throw new Error('Event hitungan tidak sah');
  if(e.boundary.some((b,i)=>!b || Object.keys(b).sort().join(',')!=='key,sequence' || typeof b.key!=='string' || !b.key || !Number.isSafeInteger(b.sequence) || b.sequence<1 || (i>0 && e.boundary[i-1].key>=b.key))) throw new Error('Batas hitungan tidak sah');
  if(e.blockers.length || e.incomplete.length || (e.reason!==null && !reason(e.reason))) throw new Error('Bukti hitungan tidak sah');
  if(e.action==='save' || e.action==='revise') {if(!Number.isSafeInteger(e.amount) || (e.amount as number)<0 || e.reason!==null || e.countOperationId!==null || e.expected!==null || e.difference!==null) throw new Error('Nilai hitungan tidak sah');}
  else if(e.action==='cancel') {if(e.amount!==null || e.reason!==null || e.countOperationId!==null || e.expected!==null || e.difference!==null) throw new Error('Batal hitungan tidak sah');}
  else if(!Number.isSafeInteger(e.amount) || (e.amount as number)<0 || !Number.isSafeInteger(e.expected) || (e.expected as number)<0 || !Number.isSafeInteger(e.difference) || BigInt(e.difference!)!==BigInt(e.amount!)-BigInt(e.expected!) || !text(e.countOperationId) || (e.action==='close' && e.difference!==0 && e.reason===null)) throw new Error('Snapshot penutupan tidak sah');
  if(e.action==='handover') {const x=e.handover;if(!x || Object.keys(x).sort().join(',')!=='incoming,outgoing,received,segmentDifference,segmentExpected,withoutOutgoingReason' || !text(x.outgoing) || !text(x.incoming) || x.incoming===x.outgoing || !Number.isSafeInteger(x.received) || x.received!==e.amount || !Number.isSafeInteger(x.segmentExpected) || !Number.isSafeInteger(x.segmentDifference) || BigInt(x.segmentDifference)!==BigInt(x.received)-BigInt(x.segmentExpected) || (x.segmentDifference!==0 && e.reason===null) || (x.withoutOutgoingReason!==null && !reason(x.withoutOutgoingReason))) throw new Error('Bukti serah-terima tidak sah');}
 }
}
