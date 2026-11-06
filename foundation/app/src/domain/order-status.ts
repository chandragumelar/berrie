import { paidRefundDue, type PaidCancellationEvent } from './paid-cancellation';
import type { RefundRecord } from './settlement';
import type { ServingState } from './serving';

export type SettlementStatus = 'unpaid'|'paid'|'free';
export type OrderClassification = 'stored'|'active'|'history'|'cancelled_without_settlement';
export type BlockerReason = 'draft'|'processed'|'unsettled'|'refund_due';
export interface OperationalStatus {
 orderId:string; displayNumber:string; cashSessionId:string;
 counts:{draft:number;processed:number;served:number;cancelled:number};
 settlement:SettlementStatus; refundDue:number; classification:OrderClassification; reasons:BlockerReason[];
}
export interface StatusSource {
 orderId:string; displayNumber:string; cashSessionId:string;
 draftUnits:number; draftCancelled:boolean; serving:ServingState|null;
 settlement:SettlementStatus; cancellations:PaidCancellationEvent[]; refunds:RefundRecord[];
}
/** Pure aggregation; inputs must already have been validated against their persisted sources. */
export function reduceOrderStatus(source:StatusSource):OperationalStatus {
 const counts={draft:0,processed:0,served:0,cancelled:0};
 if(source.serving) for(const unit of source.serving.units) counts[unit.status]++;
 else if(source.draftCancelled) counts.cancelled=source.draftUnits;
 else counts.draft=source.draftUnits;
 const refundDue=paidRefundDue(source.cancellations,source.refunds);
 const terminal=counts.draft===0 && counts.processed===0;
 const cancelledWithoutSettlement=source.settlement==='unpaid' && terminal && counts.cancelled>0 && counts.served===0;
 const classification:OrderClassification=cancelledWithoutSettlement?'cancelled_without_settlement':counts.draft?'stored':source.settlement!=='unpaid' && terminal && refundDue===0?'history':'active';
 const reasons:BlockerReason[]=[];
 if(counts.draft) reasons.push('draft');
 if(counts.processed) reasons.push('processed');
 if(source.settlement==='unpaid' && !cancelledWithoutSettlement) reasons.push('unsettled');
 if(refundDue>0) reasons.push('refund_due');
 return {orderId:source.orderId,displayNumber:source.displayNumber,cashSessionId:source.cashSessionId,counts,settlement:source.settlement,refundDue,classification,reasons};
}
