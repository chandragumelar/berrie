import type { BusinessRecord } from '../domain/business-record';
import { reduceOrderStatus, type OperationalStatus, type SettlementStatus } from '../domain/order-status';
import { initialServing } from '../domain/serving';
import { validateRefundHistory, type RefundRecord } from '../domain/settlement';
import { canonical, type AtomicChange } from './commit';
import type { BerrieDatabase } from './database';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

export interface IncompleteSource { key:string; reason:string }
export interface OrderStatusRead { status:OperationalStatus|null; incomplete:IncompleteSource[] }
export interface SessionBlockersRead { blockers:OperationalStatus[]; incomplete:IncompleteSource[] }
const relevant=['order','draft','first-batch','serving','draft-cancellation','unpaid-cancellation','paid-cancellations','free-cancellations','settlement','payment','served-refunds','refund-history','stock-returns','free-stock-returns','unpaid-stock-returns','customer-job','kitchen-job','payment-corrections'];
const batchKinds=['batch.confirm-first','payment.draft-cash','payment.draft-noncash','settlement.draft-free'];
const settlementKinds=['payment.confirmed-cash','payment.draft-cash','payment.confirmed-noncash','payment.draft-noncash','settlement.confirmed-free','settlement.draft-free'];
function assertId(id:string) {if(typeof id!=='string' || !id.trim() || id.length>200) throw new Error('ID tidak sah');}
function changes(snapshot:Snapshot):AtomicChange[] {return snapshot.receipts.map(row=>JSON.parse(row.payload) as AtomicChange);}
function source(changes:AtomicChange[],key:string) {return changes.find(c=>c.state.some(row=>row.key===key && row.expectedRevision===null));}
function row(snapshot:Snapshot,key:string):BusinessRecord|undefined {return snapshot.state.find(r=>r.key===key)?.value as BusinessRecord|undefined;}
function typed(snapshot:Snapshot,key:string,type:BusinessRecord['recordType']):BusinessRecord|undefined {
 const value=row(snapshot,key);if(value===undefined)return undefined;
 if(!value || typeof value!=='object' || value.recordType!==type) throw new Error(`Sumber ${key} rusak`);
 return value;
}
function read(snapshot:Snapshot, cs:AtomicChange[],storeId:string,orderId:string):OrderStatusRead {
 const draftKey=`draft:${orderId}`, bkey=`first-batch:${orderId}`;
 for(const key of [draftKey,bkey]) {const value=row(snapshot,key);if(value!==undefined && (!value || typeof value!=='object' || !('recordType' in value))) return {status:null,incomplete:[{key,reason:'Record generik belum didukung'}]};}
 const draft=typed(snapshot,draftKey,'draft'),batch=typed(snapshot,bkey,'first-batch');
 if(!draft || draft.recordType!=='draft') {
  if(batch) throw new Error('Draft sumber hilang');
  const foreign=cs.some(c=>c.targetId===orderId && c.storeId===storeId);
  return {status:null,incomplete:foreign?[{key:draftKey,reason:'Sumber pesanan tidak didukung'}]:[]};
 }
 const origin=source(cs,draftKey);if(!origin) throw new Error('Asal draft hilang');
 if(origin.storeId!==storeId) return {status:null,incomplete:[]};
 const d=draft.draft;if(d.orderId!==orderId) throw new Error('ID draft tidak sesuai');
 const session=typed(snapshot,`cash-session:${d.cashSessionId}`,'cash-session');
 if(!session || session.recordType!=='cash-session' || session.session.id!==d.cashSessionId || session.session.storeId!==storeId) throw new Error('Sesi pesanan tidak sesuai');
 const incomplete:IncompleteSource[]=[];
 for(const r of snapshot.state) {const v=r.value as BusinessRecord;const origin=source(cs,r.key);if(origin?.storeId===storeId && v && typeof v==='object' && (v.recordType==='settlement' || v.recordType==='refund-history') && v.settlement.orderId===orderId && r.key!==`${v.recordType}:${orderId}`) incomplete.push({key:r.key,reason:'Sumber finansial generik belum didukung'});}
 if(draft.schemaVersion!==2 || !['draft.create'].includes(origin.kind) || d.channel!=='store') incomplete.push({key:draftKey,reason:'Sumber draft legacy atau platform belum didukung'});
 for(const prefix of relevant) {
  const key=`${prefix}:${orderId}`,value=row(snapshot,key), creator=source(cs,key);
  if(value!==undefined && (!creator || creator.storeId!==storeId)) throw new Error(`Asal ${key} tidak sesuai`);
  if(value!==undefined && (!value || typeof value!=='object' || !('recordType' in value))) incomplete.push({key,reason:'Record generik belum didukung'});
 }
 if(incomplete.length) return {status:null,incomplete};
 const cancellation=typed(snapshot,`draft-cancellation:${orderId}`,'draft-cancellation');
 if(batch && batch.recordType!=='first-batch') throw new Error('Batch tidak sah');
 if(batch && (batch.schemaVersion!==2 || !batchKinds.includes(source(cs,bkey)?.kind ?? ''))) return {status:null,incomplete:[{key:bkey,reason:'Asal batch belum didukung'}]};
 if(batch && (batch.batch.storeId!==storeId || batch.batch.draft.orderId!==orderId || batch.batch.draft.cashSessionId!==d.cashSessionId || batch.batch.draft.displayNumber!==d.displayNumber)) throw new Error('Referensi batch tidak sesuai');
 if(batch && cancellation) throw new Error('Draft batal memiliki batch');
 const servingRow=typed(snapshot,`serving:${orderId}`,'serving');
 if(servingRow && servingRow.recordType!=='serving') throw new Error('Penyajian tidak sah');
 if(servingRow && !batch) throw new Error('Penyajian tanpa batch');
 const serving=batch ? servingRow?.serving ?? initialServing(batch.batch) : null;
 if(serving && batch) {
  const expected=initialServing(batch.batch);
  if(serving.storeId!==storeId || serving.orderId!==orderId || serving.cashSessionId!==d.cashSessionId || canonical(serving.units.map(u=>u.id).sort())!==canonical(expected.units.map(u=>u.id).sort())) throw new Error('Unit penyajian tidak sesuai');
 }
 const sr=typed(snapshot,`settlement:${orderId}`,'settlement'),pr=typed(snapshot,`payment:${orderId}`,'payment');
 if(sr && sr.recordType!=='settlement' || pr && pr.recordType!=='payment') throw new Error('Settlement tidak sah');
 if(sr && (!batch || sr.settlement.orderId!==orderId)) throw new Error('Settlement tanpa sumber');
 if(sr && (!settlementKinds.includes(source(cs,`settlement:${orderId}`)?.kind ?? '') || sr.settlement.source==='platform')) return {status:null,incomplete:[{key:`settlement:${orderId}`,reason:'Settlement belum didukung'}]};
 if(pr && (!sr || sr.settlement.source!=='payment' || pr.payment.storeId!==storeId || pr.payment.orderId!==orderId || pr.payment.cashSessionId!==d.cashSessionId || pr.payment.amount!==sr.settlement.paymentAmount)) throw new Error('Payment tidak sesuai');
 if(sr && ((sr.settlement.source==='payment')!==!!pr)) throw new Error('Payment hilang');
 if(sr && batch && canonical(sr.settlement.units.map(u=>u.id).sort())!==canonical(initialServing(batch.batch).units.map(u=>u.id).sort())) throw new Error('Unit settlement tidak sesuai');
 const paid=typed(snapshot,`paid-cancellations:${orderId}`,'paid-cancellations'),free=typed(snapshot,`free-cancellations:${orderId}`,'free-cancellations'),unpaid=typed(snapshot,`unpaid-cancellation:${orderId}`,'unpaid-cancellation'),refund=typed(snapshot,`served-refunds:${orderId}`,'served-refunds');
 if(paid && paid.recordType!=='paid-cancellations' || free && free.recordType!=='free-cancellations' || unpaid && unpaid.recordType!=='unpaid-cancellation' || refund && refund.recordType!=='served-refunds') throw new Error('Histori tidak sah');
 const settlement:SettlementStatus=sr?.settlement.source==='payment'?'paid':sr?.settlement.source==='free'?'free':'unpaid';
 if((paid || refund) && settlement!=='paid' || free && settlement!=='free' || unpaid && settlement!=='unpaid') throw new Error('Histori tidak sesuai settlement');
 const cancellations=paid?.cancellations ?? [],refunds:RefundRecord[]=(refund?.refunds ?? []).map(r=>({unitIds:r.units.map(u=>u.id),amount:r.amount,source:'payment'}));
 if(refunds.length && sr) validateRefundHistory(sr.settlement,refunds);
 const cancelledIds=[...cancellations.flatMap(c=>c.units.map(u=>u.id)),...(free?.cancellations.flatMap(c=>c.unitIds) ?? []),...(unpaid?.cancellation.unitIds ?? [])];
 if(serving && canonical([...cancelledIds].sort())!==canonical(serving.units.filter(u=>u.status==='cancelled').map(u=>u.id).sort())) throw new Error('Unit pembatalan tidak sesuai');
 if(cancellations.some(c=>c.orderId!==orderId || c.storeId!==storeId || c.cashSessionId!==d.cashSessionId || c.units.some(u=>sr?.settlement.totals.allocations.find(a=>a.id===u.id)?.total!==u.amount))) throw new Error('Alokasi pembatalan tidak sesuai');
 if(row(snapshot,`refund-history:${orderId}`)) return {status:null,incomplete:[{key:`refund-history:${orderId}`,reason:'Histori refund generik belum didukung'}]};
 return {status:reduceOrderStatus({orderId,displayNumber:d.displayNumber,cashSessionId:d.cashSessionId,draftUnits:d.items.reduce((n,i)=>n+i.unitIds.length,0),draftCancelled:!!cancellation,serving,settlement,cancellations,refunds}),incomplete:[]};
}
async function snapshot(db:BerrieDatabase) {return validateCheckpoint(await checkpoint(db));}
/** Internal read only; T-04 must authorize access. */
export async function readOrderOperationalStatus(db:BerrieDatabase,storeId:string,orderId:string):Promise<OrderStatusRead> {
 assertId(storeId);assertId(orderId);const s=await snapshot(db);return structuredClone(read(s,changes(s),storeId,orderId));
}
/** Empty blockers are not authorization to close; the future close command must revalidate atomically. */
export async function readSessionCloseBlockers(db:BerrieDatabase,storeId:string,sessionId:string):Promise<SessionBlockersRead> {
 assertId(storeId);assertId(sessionId);const s=await snapshot(db),cs=changes(s),session=typed(s,`cash-session:${sessionId}`,'cash-session');
 if(!session || session.recordType!=='cash-session' || session.session.storeId!==storeId || session.session.id!==sessionId) throw new Error('Sesi tidak ditemukan');
 const ids=new Set<string>();const incomplete:IncompleteSource[]=[];
 for(const r of s.state) {
  const origin=source(cs,r.key);if(origin?.storeId!==storeId)continue;
  const value=r.value as BusinessRecord;
  if(value && typeof value==='object' && (value.recordType==='settlement' || value.recordType==='refund-history')) ids.add(value.settlement.orderId);
  const prefix=relevant.find(p=>r.key.startsWith(`${p}:`));
  if(!prefix) {if(!value || typeof value!=='object' || !('recordType' in value)) incomplete.push({key:r.key,reason:'Record generik belum didukung'});continue;}
  const id=r.key.slice(prefix.length+1);
  if(!r.value || typeof r.value!=='object' || !('recordType' in r.value)) {incomplete.push({key:r.key,reason:'Record generik belum didukung'});continue;}
  ids.add(id);
 }
 const blockers:OperationalStatus[]=[];
 for(const id of [...ids].sort()) {const candidate=row(s,`draft:${id}`);if(candidate?.recordType==='draft' && candidate.draft.cashSessionId!==sessionId) continue;const result=read(s,cs,storeId,id);incomplete.push(...result.incomplete);if(result.status?.cashSessionId===sessionId && result.status.reasons.length) blockers.push(result.status);}
 blockers.sort((a,b)=>a.displayNumber.localeCompare(b.displayNumber) || a.orderId.localeCompare(b.orderId));
 incomplete.sort((a,b)=>a.key.localeCompare(b.key) || a.reason.localeCompare(b.reason));
 return structuredClone({blockers,incomplete:incomplete.filter((v,i)=>i===0 || v.key!==incomplete[i-1].key || v.reason!==incomplete[i-1].reason)});
}
