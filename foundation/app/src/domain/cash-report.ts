import { cashBalance, type CashMovement, type CashSession } from './cash-session';
import { custodySegments, type CashCountHistory, type CustodySegment, type CountBoundary } from './cash-count';

export interface CashReportEntry {
 ledgerId:string; operationId:string; sourceId:string; paymentId:string|null; refundId:string|null; originSessionId:string|null; actorId:string; occurredAt:string;
 reason:string|null; reference:string|null; movement:CashMovement;
}
export interface CashReportSummary {
 opening:number; sales:number; refunds:number; cashIn:number; cashOut:number;
 methodCorrection:number; administrativeAdjustment:number; expected:number;
 closingCount:number|null; closingDifference:number|null;
}
export type CashReportSegment = CustodySegment & { closingActor:string|null; closingAt:string|null; reason:string|null; countOperationId:string|null };
export interface CashReportData { summary:CashReportSummary; ledger:CashReportEntry[]; segments:CashReportSegment[] }
export interface CashReport { storeId:string; session:CashSession; checkpoint:{schema:1;boundary:CountBoundary[]}; status:'complete'|'incomplete'; incomplete:{key:string;reason:string}[]; report:CashReportData }
function safe(n:bigint):number {const v=Number(n);if(!Number.isSafeInteger(v)) throw new Error('Total laporan melampaui batas aman');return v;}
/** Classification deltas are shown separately from physical cash movement. */
export function reduceCashReport(session:CashSession,history:CashCountHistory|null,ledger:CashReportEntry[]):CashReportData {
 const expected=cashBalance(ledger.map(e=>e.movement),session);
 let sales=0n,refunds=0n,cashIn=0n,cashOut=0n,methodCorrection=0n,administrativeAdjustment=0n;
 for(const {movement:m} of ledger) {
  if(m.kind==='sale') sales+=BigInt(m.amount);
  else if(m.kind==='in') cashIn+=BigInt(m.amount);
  else if(m.kind==='out') cashOut+=BigInt(m.amount);
  else if(m.kind==='refund' && m.refund.method==='cash') refunds+=BigInt(m.refund.amount);
  else if(m.kind==='method-correction' || m.kind==='method-adjustment') {
   const delta=m.legs.filter(l=>l.method==='cash').reduce((sum,l)=>sum+BigInt(l.delta),0n);
   if(m.kind==='method-correction') methodCorrection+=delta;else administrativeAdjustment+=delta;
  }
 }
 const values=[sales,refunds,cashIn,cashOut,methodCorrection,administrativeAdjustment].map(safe);
 if(safe(BigInt(session.openingAmount)+sales-refunds+cashIn-cashOut+methodCorrection+administrativeAdjustment)!==expected) throw new Error('Total ledger tidak sesuai saldo');
 const segments=custodySegments(session,history).map(segment=>{const event=history?.events.find(e=>e.operationId===segment.closingOperationId);return {...segment,closingActor:event?.actorId ?? null,closingAt:event?.occurredAt ?? null,reason:event?.reason ?? null,countOperationId:event?.countOperationId ?? null};}),last=history?.events.at(-1),close=last?.action==='close'?last:null;
 if(close && (close.expected!==expected || segments.at(-1)?.closingExpected!==expected)) throw new Error('Snapshot penutupan tidak sesuai ledger');
 return {summary:{opening:session.openingAmount,sales:values[0],refunds:values[1],cashIn:values[2],cashOut:values[3],methodCorrection:values[4],administrativeAdjustment:values[5],expected,closingCount:close?.amount ?? null,closingDifference:close?.difference ?? null},ledger,segments};
}
