import type { AtomicChange } from './commit';
import type { ConfirmFirstBatchInput } from './confirm-first-batch';

export interface DraftCashInput extends ConfirmFirstBatchInput { expectedSessionRevision:number; received:number }

export function batchIntent(data:DraftCashInput):ConfirmFirstBatchInput { return {orderId:data.orderId,expectedDraftRevision:data.expectedDraftRevision,mappings:data.mappings,groups:data.groups}; }

/** The combined envelope has one receipt and one outbox entry. The sale precedes stock debits in the ledger. */
export function combineDraftCashChange(batch:AtomicChange,payment:AtomicChange,data:DraftCashInput):AtomicChange {
 return {...batch,kind:'payment.draft-cash',payload:{...(batch.payload as object),data},
  state:[...batch.state,...payment.state],ledger:[...payment.ledger,...batch.ledger],audit:[...batch.audit,...payment.audit],
  outbox:{id:`draft-cash-outbox:${batch.operationId}`,operationId:batch.operationId,value:{orderId:data.orderId,paymentId:`payment:${data.orderId}`}},
  result:{...(payment.result as object),batchNumber:1}};
}

/** Extract the batch portion for the same source and effect validation used by the original command. */
export function draftCashBatchPart(change:AtomicChange):AtomicChange {
 const p=change.payload as {data:DraftCashInput;metadata:unknown;contractVersion:number;sessionSource:unknown};
 const data=batchIntent(p.data);
 return {...change,kind:'batch.confirm-first',payload:{...p,data},
  state:change.state.filter(s=>s.key.startsWith('first-batch:') || s.key.startsWith('kitchen-job:') || s.key.startsWith('stock-group:')),
  ledger:change.ledger.slice(1),audit:change.audit.slice(0,1),outbox:{id:`batch-outbox:${change.operationId}`,operationId:change.operationId,value:{orderId:change.targetId}},result:{orderId:change.targetId,batchNumber:1}};
}
