import { combineDraftFreeChange, draftFreeBatchPart, makeConfirmedFreeChange, type ConfirmedFreeInput, type DraftFreeInput, type FreeSessionSource } from './free-settlement';
import { combineDraftCashChange, draftCashBatchPart, type DraftCashInput } from './draft-cash-contract';
import { makeConfirmedCashPaymentChange, type ConfirmedCashPaymentInput } from './confirmed-cash-payment';
import { cashBalance, type CashMovement } from '../domain/cash-session';
import { makeCashChange, type CashMetadata, type MoveCashInput, type OpenCashInput } from './cash-sessions';
import { draftDateCode } from '../domain/draft';
import { planFirstBatch, snapshotBatchDraft, validateFirstBatch } from '../domain/first-batch';
import type { BusinessRecord } from '../domain/business-record';
import type { AtomicChange } from './commit';
import { canonical } from './commit';
import type { OperationRow, RecordRow } from './database';
import { makeServingChange, type ServingAction, type ServingInput, type SessionSource } from './serving';
import type { StockMetadata } from './stock-groups';

function typed(value:unknown):BusinessRecord | undefined {
 if(value && typeof value==='object' && Object.hasOwn(value,'recordType')) return value as BusinessRecord;
 return undefined;
}
/** Validates all versions, using revisions and sequence numbers rather than receipt array order. */
export function validateTransitions(receipts:OperationRow[], state:RecordRow[]):void {
 const changes=receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
 const byKey=new Map<string,{change:AtomicChange; revision:number; value:unknown}[]>();
 for(const change of changes) for(const row of change.state) {
  if(change.kind.startsWith('cash.') && (!row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='cash-session')) throw new Error('Record kas wajib bertipe');
  if(change.kind==='mapping.create' && (!row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='sku-stock-mapping')) throw new Error('Record pemetaan wajib bertipe');
  if(change.kind.startsWith('stock.') && (!row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='stock-group')) throw new Error('Record stok wajib bertipe');
  const versions=byKey.get(row.key) ?? [];
  versions.push({change,revision:(row.expectedRevision ?? -1)+1,value:row.value});byKey.set(row.key,versions);
 }
 const cashStores=new Set<string>();
 const settlements=new Map<string,{key:string; value:BusinessRecord; operationId:string}>();
 const refunds=new Map<string,string>();
 const draftSequences=new Map<string,Set<number>>();
 const draftOrders=new Map<string,string>(), draftNumbers=new Map<string,string>(), platformIds=new Map<string,string>(), draftUnits=new Map<string,string>(), draftItems=new Map<string,string>();
 const unique=(map:Map<string,string>,identity:string,order:string)=>{const prior=map.get(identity);if(prior && prior!==order) throw new Error('Identitas draft duplikat');map.set(identity,order);};
 const edges=new Map<string,Set<string>>();
 const edge=(from:string,to:string)=>{if(from===to)return;const next=edges.get(from) ?? new Set<string>();next.add(to);edges.set(from,next);};
 const streams=new Map<string,AtomicChange[]>();
 for(const change of changes) {const key=JSON.stringify([change.storeId,change.deviceId,change.deviceEpoch]);const stream=streams.get(key) ?? [];stream.push(change);streams.set(key,stream);}
 for(const stream of streams.values()) {stream.sort((a,b)=>a.localSequence-b.localSequence);for(let i=1;i<stream.length;i++)edge(stream[i-1].operationId,stream[i].operationId);}
 const stateByKey=new Map(state.map(row=>[row.key,row]));
 const sessionSource=(change:AtomicChange,sessionId:string,version=2)=>{
  const payload=change.payload as {contractVersion?:unknown;sessionSource?:{id?:unknown;revision?:unknown}};
  if(payload?.contractVersion===undefined && version===2) return; // Historic contract did not bind a session.
  const ref=payload.sessionSource;
  if(payload.contractVersion!==version || !ref || ref.id!==sessionId || !Number.isSafeInteger(ref.revision) || (ref.revision as number)<0) throw new Error('Referensi sesi tidak sah');
  const source=byKey.get(`cash-session:${sessionId}`)?.find(v=>v.revision===ref.revision), record=typed(source?.value);
  if(!source || source.change.storeId!==change.storeId || record?.recordType!=='cash-session' || record.session.id!==sessionId || record.session.storeId!==change.storeId) throw new Error('Sumber sesi tidak sesuai');
  edge(source.change.operationId,change.operationId);
  const next=byKey.get(`cash-session:${sessionId}`)?.find(v=>v.revision===(ref.revision as number)+1);
  if(next) edge(change.operationId,next.change.operationId);
 };
 for(const original of changes.filter(c=>c.kind==='batch.confirm-first' || c.kind==='payment.draft-cash' || c.kind==='settlement.draft-free')) {
  const change=original.kind==='payment.draft-cash'?draftCashBatchPart(original):original.kind==='settlement.draft-free'?draftFreeBatchPart(original):original;
  const p=change.payload as {data?:{orderId:string;expectedDraftRevision:number;mappings:{skuId:string;groupId:string;revision:number}[];groups:{groupId:string;balance:number;revision:number}[]};metadata?:Record<string,unknown>};
  const data=p?.data, meta=p?.metadata, batchRow=change.state.find(s=>s.key===`first-batch:${change.targetId}`), job=change.state.find(s=>s.key===`kitchen-job:${change.targetId}`);
  const br=typed(batchRow?.value), jr=typed(job?.value);
  if(!data || !meta || !br || br.recordType!=='first-batch' || !jr || jr.recordType!=='kitchen-job' || batchRow?.expectedRevision!==null || job?.expectedRevision!==null || data.orderId!==change.targetId || br.batch.storeId!==change.storeId || canonical(br.batch)!==canonical(jr.batch)) throw new Error('Batch atau job tidak sesuai');
  if(br.schemaVersion!==jr.schemaVersion || (br.schemaVersion===2)!==((change.payload as {contractVersion?:unknown}).contractVersion===2)) throw new Error('Versi kontrak batch tidak sesuai');
  for(const field of ['operationId','storeId','deviceId','deviceEpoch','localSequence','actorId','policyVersion'] as const) if(meta[field]!==change[field]) throw new Error('Metadata batch tidak sesuai');
  validateFirstBatch(br.batch);
  sessionSource(change,br.batch.draft.cashSessionId);
  if(typeof meta.recordedAt!=='string' || !Number.isFinite(Date.parse(meta.recordedAt)) || br.batch.draft.orderId!==data.orderId || !Array.isArray(data.mappings) || !Array.isArray(data.groups)) throw new Error('Intent batch tidak sesuai');
  draftDateCode(meta.recordedAt,'UTC');
  const source=byKey.get(`draft:${data.orderId}`)?.find(v=>v.revision===data.expectedDraftRevision), current=stateByKey.get(`draft:${data.orderId}`);
  const sourceRecord=typed(source?.value);
  if(!source || source.change.storeId!==change.storeId || !sourceRecord || sourceRecord.recordType!=='draft' || !current || current.revision!==data.expectedDraftRevision || canonical(snapshotBatchDraft(sourceRecord.draft))!==canonical(br.batch.draft)) throw new Error('Sumber draft batch tidak sesuai');
  edge(source.change.operationId,change.operationId);
  if(data.mappings.length!==br.batch.skuGroups.length || new Set(data.mappings.map(m=>m.skuId)).size!==data.mappings.length) throw new Error('Pemetaan batch tidak sesuai');
  for(const mapping of br.batch.skuGroups) {
   const expected=data.mappings.find(m=>m.skuId===mapping.skuId), sourceMapping=byKey.get(`sku-stock-mapping:${JSON.stringify([change.storeId,mapping.skuId])}`)?.find(v=>v.revision===expected?.revision), record=typed(sourceMapping?.value);
   if(!expected || expected.groupId!==mapping.groupId || expected.revision!==0 || !sourceMapping || !record || record.recordType!=='sku-stock-mapping' || canonical(record.mapping)!==canonical({...mapping,storeId:change.storeId})) throw new Error('Sumber pemetaan batch tidak sesuai');
   edge(sourceMapping.change.operationId,change.operationId);
  }
  const groupIds=[...new Set(br.batch.skuGroups.map(m=>m.groupId))].sort();
  if(data.groups.length!==groupIds.length || new Set(data.groups.map(g=>g.groupId)).size!==groupIds.length || change.state.length!==groupIds.length+2) throw new Error('Grup batch tidak sesuai');
  const before=groupIds.map(id=>{
   const expected=data.groups.find(g=>g.groupId===id), next=change.state.find(s=>s.key===`stock-group:${id}`);
   const sourceGroup=byKey.get(`stock-group:${id}`)?.find(v=>v.revision===expected?.revision), record=typed(sourceGroup?.value), after=typed(next?.value);
   if(!expected || !next || next.expectedRevision!==expected.revision || !sourceGroup || !record || record.recordType!=='stock-group' || record.stockGroup.storeId!==change.storeId || record.stockGroup.balance!==expected.balance || !after || after.recordType!=='stock-group') throw new Error('Sumber stok batch tidak sesuai');
   edge(sourceGroup.change.operationId,change.operationId);
   return {expected,stock:record.stockGroup,after:after.stockGroup};
  });
  const plan=planFirstBatch(br.batch,before.map(x=>({groupId:x.stock.groupId,balance:x.stock.balance})));
  if(!plan.ok) throw new Error('Stok batch tidak cukup');
  for(const item of before) {const debit=plan.debits.find(d=>d.groupId===item.stock.groupId);if(!debit || canonical(item.after)!==canonical({...item.stock,balance:debit.after})) throw new Error('Saldo batch tidak sesuai');}
  const operationId=change.operationId;
  if(canonical(change.ledger)!==canonical(plan.debits.map(debit=>({id:`batch-debit:${operationId}:${debit.groupId}`,operationId,value:{storeId:change.storeId,orderId:data.orderId,...debit}}))) || canonical(change.audit)!==canonical([{id:`batch-audit:${operationId}`,operationId,value:{batch:br.batch,actorId:change.actorId,policyVersion:change.policyVersion}}]) || canonical(change.outbox)!==canonical({id:`batch-outbox:${operationId}`,operationId,value:{orderId:data.orderId}}) || canonical(change.result)!==canonical({orderId:data.orderId,batchNumber:1})) throw new Error('Efek batch tidak sesuai');
 }
 // Reconstruct the entire free operation from its historical sources. No cash effect can be added.
 for(const change of changes.filter(c=>c.kind==='settlement.confirmed-free' || c.kind==='settlement.draft-free')) {
  const p=change.payload as {data:ConfirmedFreeInput|DraftFreeInput;metadata:StockMetadata;contractVersion:number;sessionSource:FreeSessionSource};
  if(!p?.data || !p.metadata || p.contractVersion!==2 || !p.sessionSource) throw new Error('Kontrak gratis tidak sah');
  const isDraft=change.kind==='settlement.draft-free';
  if(isDraft && Object.keys(p.data).sort().join(',')!=='expectedDraftRevision,expectedSessionRevision,groups,mappings,orderId,reason') throw new Error('Intent draft gratis tidak sah');
  const source=byKey.get(`first-batch:${change.targetId}`)?.find(v=>v.revision===(isDraft?0:(p.data as ConfirmedFreeInput).expectedBatchRevision));
  const batch=typed(source?.value);
  if(!source || source.change.storeId!==change.storeId || batch?.recordType!=='first-batch' || (isDraft ? source.change.operationId!==change.operationId : source.change.operationId===change.operationId)) throw new Error('Sumber batch gratis tidak sah');
  sessionSource(change,batch.batch.draft.cashSessionId);
  edge(source.change.operationId,change.operationId);
  const data=isDraft?{orderId:p.data.orderId,expectedBatchRevision:0,expectedSessionRevision:p.data.expectedSessionRevision,reason:p.data.reason}:p.data as ConfirmedFreeInput;
  const free=makeConfirmedFreeChange(batch.batch,data,p.metadata,p.sessionSource);
  const expected=isDraft?combineDraftFreeChange(draftFreeBatchPart(change),free,p.data as DraftFreeInput):free;
  if(canonical(change)!==canonical(expected)) throw new Error('Histori gratis tidak sesuai');
 }
 const pending:{identity:string; record:Extract<BusinessRecord,{recordType:'refund-history'}>; operationId:string}[]=[];
 for(const [key,versions] of byKey) {
  versions.sort((a,b)=>a.revision-b.revision);
  let previous:BusinessRecord|undefined;let owner:string|undefined;
  const cashEntries:CashMovement[]=[];
  const retiredUnits=new Set<string>(),retiredItems=new Set<string>();
  for(let i=0;i<versions.length;i++) {
   const v=versions[i];if(i) edge(versions[i-1].change.operationId,v.change.operationId);
   const current=typed(v.value);
   if(previous && (!current || current.recordType!==previous.recordType || v.change.storeId!==owner)) throw new Error('Transisi record bisnis tidak sah');
   if(!current) continue;
   if(!owner) owner=v.change.storeId;
   if(v.change.storeId!==owner) throw new Error('Toko record berubah');
   if(current.recordType==='serving') {
    const c=v.change,p=c.payload as {data:ServingInput;metadata:StockMetadata;contractVersion:number;sessionSource:SessionSource},action=c.kind==='serving.serve'?'serve':c.kind==='serving.correct'?'correct':null;
    const source=byKey.get(`first-batch:${current.serving.orderId}`)?.find(x=>x.revision===0),batch=typed(source?.value);
    if(!action || !p?.data || !p.metadata || !source || batch?.recordType!=='first-batch' || source.change.storeId!==owner || key!==`serving:${current.serving.orderId}` || p.data.expectedRevision!==(v.revision===0?null:v.revision-1)) throw new Error('Histori penyajian tidak sah');
    const before=previous?.recordType==='serving'?previous.serving:null;
    if(v.revision>0 && !before) throw new Error('Sumber penyajian hilang');
    sessionSource(c,batch.batch.draft.cashSessionId,1);edge(source.change.operationId,c.operationId);
    if(canonical(c)!==canonical(makeServingChange(batch.batch,before,p.data,p.metadata,action as ServingAction,p.sessionSource))) throw new Error('Histori penyajian tidak sesuai');
    previous=current;continue;
   }
   if(current.recordType==='first-batch' || current.recordType==='kitchen-job') {
    if(v.revision!==0 || i!==0 || !['batch.confirm-first','payment.draft-cash','settlement.draft-free'].includes(v.change.kind) || key!==`${current.recordType}:${current.batch.draft.orderId}`) throw new Error('Histori batch tidak sah');
    previous=current;continue;
   }
   if(current.recordType==='sku-stock-mapping') {
    const m=current.mapping, c=v.change, p=c.payload as {data?:unknown;metadata?:Record<string,unknown>} | null;
    const target=stateByKey.get(`stock-group:${m.groupId}`), group=typed(target?.value);
    if(v.revision!==0 || i!==0 || key!==`sku-stock-mapping:${JSON.stringify([m.storeId,m.skuId])}` || c.kind!=='mapping.create' || c.targetId!==m.skuId || m.storeId!==owner || c.state.length!==1 || c.ledger.length!==0 || c.audit.length!==1 || !p?.metadata || canonical(p.data)!==canonical({skuId:m.skuId,groupId:m.groupId}) || !group || group.recordType!=='stock-group' || group.stockGroup.storeId!==m.storeId) throw new Error('Histori pemetaan tidak sah');
    for(const field of ['operationId','storeId','deviceId','deviceEpoch','localSequence','actorId','policyVersion'] as const) if(p.metadata[field]!==c[field]) throw new Error('Metadata pemetaan tidak sesuai');
    const audit=c.audit[0].value as Record<string,unknown>;
    if(!audit || typeof audit.recordedAt!=='string' || !Number.isFinite(Date.parse(audit.recordedAt)) || typeof p.metadata.recordedAt!=='string' || !Number.isFinite(Date.parse(p.metadata.recordedAt))) throw new Error('Waktu pemetaan tidak sah');
    if(canonical(c.audit)!==canonical([{id:`mapping-audit:${c.operationId}`,operationId:c.operationId,value:{mapping:m,actorId:c.actorId,policyVersion:c.policyVersion,occurredAt:p.metadata.recordedAt,recordedAt:audit.recordedAt}}]) || canonical(c.outbox)!==canonical({id:`mapping-outbox:${c.operationId}`,operationId:c.operationId,value:{skuId:m.skuId}}) || canonical(c.result)!==canonical({mapping:m,revision:0})) throw new Error('Histori pemetaan tidak sesuai');
    const source=byKey.get(`stock-group:${m.groupId}`)?.find(x=>x.revision===0); if(!source) throw new Error('Grup asal tidak ada'); edge(source.change.operationId,c.operationId);
    previous=current; continue;
   }
   if(current.recordType==='stock-group') {
    const g=current.stockGroup, change=v.change, prev=previous?.recordType==='stock-group'?previous.stockGroup:null;
    if(change.kind==='batch.confirm-first' || change.kind==='payment.draft-cash' || change.kind==='settlement.draft-free') {if(!prev) throw new Error('Stok batch tanpa sumber');previous=current;continue;}
    const action=v.revision===0?'opening':change.kind==='stock.correction'?'correction':change.kind==='stock.minimum'?'minimum':null;
    const p=change.payload as {action?:unknown;data?:Record<string,unknown>;metadata?:Record<string,unknown>} | null;
    const data=p?.data, meta=p?.metadata;
    if(!action || change.kind!==`stock.${action}` || change.targetId!==g.groupId || key!==`stock-group:${g.groupId}` || g.storeId!==owner || change.state.length!==1 || change.audit.length!==1 || !data || !meta || p?.action!==action || data.groupId!==g.groupId || (v.revision>0 && !prev)) throw new Error('Operasi stok tidak sah');
    for(const field of ['operationId','storeId','deviceId','deviceEpoch','localSequence','actorId','policyVersion'] as const) if(meta[field]!==change[field]) throw new Error('Metadata stok tidak sesuai');
    if(typeof meta.recordedAt!=='string' || !Number.isFinite(Date.parse(meta.recordedAt)) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(meta.recordedAt)) throw new Error('Waktu stok tidak sah');
    if(prev && (prev.storeId!==g.storeId || prev.groupId!==g.groupId || data.expectedRevision!==v.revision-1 || data.expectedBalance!==prev.balance)) throw new Error('Identitas atau versi stok berubah');
    if(action==='opening' && (g.baseline!==g.balance || data.balance!==g.balance || g.minimum!==(data.minimum ?? 5))) throw new Error('Opening stok tidak sah');
    if(action==='correction' && (!prev || typeof data.reason!=='string' || !data.reason.trim() || data.value!==g.balance || g.baseline!==g.balance || g.minimum!==prev.minimum)) throw new Error('Koreksi stok tidak sah');
    if(action==='minimum' && (!prev || data.value!==g.minimum || g.balance!==prev.balance || g.baseline!==prev.baseline)) throw new Error('Minimal stok tidak sah');
    const audit=change.audit[0].value as Record<string,unknown>;
    if(!audit || typeof audit.recordedAt!=='string' || !Number.isFinite(Date.parse(audit.recordedAt)) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(audit.recordedAt)) throw new Error('Waktu audit stok tidak sah');
    const expectedAudit={action,groupId:g.groupId,actorId:change.actorId,policyVersion:change.policyVersion,occurredAt:meta.recordedAt,recordedAt:audit.recordedAt,before:prev,after:g,reason:action==='correction'?data.reason:null};
    const expectedLedger=action==='minimum'?[]:[{id:`stock-ledger:${change.operationId}`,operationId:change.operationId,value:{action,groupId:g.groupId,storeId:g.storeId,delta:g.balance-(prev?.balance ?? 0),before:prev?.balance ?? 0,after:g.balance}}];
    if(canonical(change.audit)!==canonical([{id:`stock-audit:${change.operationId}`,operationId:change.operationId,value:expectedAudit}]) || canonical(change.ledger)!==canonical(expectedLedger) || canonical(change.outbox)!==canonical({id:`stock-outbox:${change.operationId}`,operationId:change.operationId,value:{groupId:g.groupId}}) || canonical(change.result)!==canonical({groupId:g.groupId,revision:v.revision,stockGroup:g})) throw new Error('Histori stok tidak sesuai');
    previous=current; continue;
   }
   if(current.recordType==='customer-job' && current.schemaVersion===2) {
    const c=v.change, order=current.settlement.orderId;
    if(v.revision!==0 || !['settlement.confirmed-free','settlement.draft-free'].includes(c.kind) || c.targetId!==order || key!==`customer-job:${order}` || current.batch.storeId!==owner) throw new Error('Histori job gratis tidak sah');
    previous=current;continue;
   }
   if(current.recordType==='payment' || current.recordType==='customer-job') {
    const c=v.change, order=current.payment.orderId;
    if(v.revision!==0 || !['payment.confirmed-cash','payment.draft-cash'].includes(c.kind) || c.targetId!==order || key!==`${current.recordType}:${order}` || current.payment.storeId!==owner || !c.state.some(row=>row.key===`cash-session:${current.payment.cashSessionId}` && typed(row.value)?.recordType==='cash-session')) throw new Error('Histori pembayaran tidak sah');
    previous=current;continue;
   }
   if(current.recordType==='cash-session') {
    const session=current.session, change=v.change;
    if(change.kind==='payment.draft-cash') {
     const payload=change.payload as {data:DraftCashInput;metadata:StockMetadata;contractVersion:number};
     const batchRow=change.state.find(x=>x.key===`first-batch:${change.targetId}`), batch=typed(batchRow?.value);
     if(!payload || payload.contractVersion!==2 || !payload.data || Object.keys(payload.data).sort().join(',')!=='expectedDraftRevision,expectedSessionRevision,groups,mappings,orderId,received' || !payload.metadata || batch?.recordType!=='first-batch' || previous?.recordType!=='cash-session' || canonical(previous.session)!==canonical(session) || payload.data.expectedSessionRevision!==v.revision-1 || key!==`cash-session:${session.id}`) throw new Error('Sumber pembayaran draft tidak sah');
     const before=cashBalance(cashEntries,session);
     const payment=makeConfirmedCashPaymentChange(batch.batch,session,{orderId:payload.data.orderId,expectedBatchRevision:0,expectedSessionRevision:payload.data.expectedSessionRevision,received:payload.data.received},payload.metadata,before);
     if(canonical(change)!==canonical(combineDraftCashChange(draftCashBatchPart(change),payment,payload.data))) throw new Error('Histori pembayaran draft tidak sesuai');
     cashEntries.push(change.ledger[0].value as CashMovement);cashBalance(cashEntries,session);previous=current;continue;
    }
    if(change.kind==='payment.confirmed-cash') {
     const payload=change.payload as {data:ConfirmedCashPaymentInput;metadata:StockMetadata;contractVersion:number};
     const source=byKey.get(`first-batch:${change.targetId}`)?.find(x=>x.revision===payload?.data?.expectedBatchRevision), batch=typed(source?.value);
     if(!payload || payload.contractVersion!==1 || !payload.data || !payload.metadata || !source || batch?.recordType!=='first-batch' || source.change.storeId!==owner || previous?.recordType!=='cash-session' || canonical(previous.session)!==canonical(session) || payload.data.expectedSessionRevision!==v.revision-1 || key!==`cash-session:${session.id}`) throw new Error('Sumber pembayaran tidak sah');
     edge(source.change.operationId,change.operationId);
     const before=cashBalance(cashEntries,session);
     if(canonical(change)!==canonical(makeConfirmedCashPaymentChange(batch.batch,session,payload.data,payload.metadata,before))) throw new Error('Histori pembayaran tidak sesuai');
     cashEntries.push(change.ledger[0].value as CashMovement);cashBalance(cashEntries,session);
     previous=current;continue;
    }
    const payload=change.payload as {data:OpenCashInput|MoveCashInput;metadata:CashMetadata};
    const data=payload?.data, meta=payload?.metadata, opening=v.revision===0;
    if(!data || !meta || key!==`cash-session:${session.id}` || session.storeId!==owner || change.targetId!==session.id || change.kind!==(opening?'cash.open':'cash.move') || change.state.length!==1 || (opening ? Object.keys(data).sort().join(',')!=='initialCustodian,number,openingAmount,sessionId,timeZone' : Object.keys(data).sort().join(',')!=='amount,category,description,expectedRevision,kind,sessionId') || data.sessionId!==session.id) throw new Error('Operasi kas tidak sah');
    for(const field of ['operationId','storeId','deviceId','deviceEpoch','localSequence','actorId','policyVersion'] as const) if(meta[field]!==change[field]) throw new Error('Metadata kas tidak sesuai');
    if(opening) {const d=data as OpenCashInput;if(cashStores.has(owner) || d.number!==session.number || d.initialCustodian!==session.initialCustodian || d.openingAmount!==session.openingAmount || d.timeZone!==session.timeZone || session.openedBy!==meta.actorId || session.openedAt!==meta.recordedAt) throw new Error('Pembukaan kas tidak sesuai');cashStores.add(owner);}
    else if(previous?.recordType!=='cash-session' || canonical(previous.session)!==canonical(session) || (data as MoveCashInput).expectedRevision!==v.revision-1) throw new Error('Revisi sesi kas tidak sesuai');
    const before=opening?0:cashBalance(cashEntries,session);
    if(canonical(change)!==canonical(makeCashChange(session,data,meta,opening?null:v.revision-1,before))) throw new Error('Histori kas tidak sesuai');
    cashEntries.push(change.ledger[0].value as CashMovement);cashBalance(cashEntries,session);
    previous=current;continue;
   }
   if(current.recordType==='draft') {
    const d=current.draft, order=JSON.stringify([owner,d.orderId]);
    const change=v.change;
    if((current.schemaVersion===2)!==((change.payload as {contractVersion?:unknown})?.contractVersion===2)) throw new Error('Versi kontrak draft tidak sesuai');
    if(previous?.recordType==='draft' && previous.schemaVersion===2 && current.schemaVersion!==2) throw new Error('Versi kontrak draft mundur');
    sessionSource(change,d.cashSessionId);
    if(change.kind!==(v.revision===0?'draft.create':'draft.update') || change.targetId!==d.orderId || key!==`draft:${d.orderId}` || change.state.length!==1 || change.ledger.length!==0 || change.audit.length!==1) throw new Error('Operasi draft tidak sah');
    const payload=change.payload;
    if(!payload || typeof payload!=='object' || !('metadata' in payload) || !payload.metadata || typeof payload.metadata!=='object' || !('recordedAt' in payload.metadata) || !('storeTimeZone' in payload.metadata) || typeof payload.metadata.recordedAt!=='string' || typeof payload.metadata.storeTimeZone!=='string') throw new Error('Metadata draft tidak sah');
    draftDateCode(payload.metadata.recordedAt,payload.metadata.storeTimeZone);
    const audit={action:v.revision===0?'create':'update',orderId:d.orderId,actorId:change.actorId,policyVersion:change.policyVersion,occurredAt:payload.metadata.recordedAt,recordedAt:d.savedAt,before:previous?.recordType==='draft'?previous.draft:null,after:d};
    if(canonical(change.audit[0].value)!==canonical(audit)) throw new Error('Audit draft tidak sesuai');
    if(v.revision===0) {
     const prefix=`${draftDateCode(d.savedAt,payload.metadata.storeTimeZone)}-E${change.deviceEpoch}-`;
     if(!d.displayNumber.startsWith(prefix)) throw new Error('Nomor draft tidak sesuai waktu atau epoch');
     const digits=d.displayNumber.slice(prefix.length),number=Number(digits);
     if(!Number.isSafeInteger(number) || number<1 || digits!==String(number).padStart(4,'0')) throw new Error('Nomor draft tidak sah');
     const group=JSON.stringify([owner,prefix]),numbers=draftSequences.get(group) ?? new Set<number>();numbers.add(number);draftSequences.set(group,numbers);
    }
    unique(draftOrders,order,key);
    unique(draftNumbers,JSON.stringify([owner,d.displayNumber]),order);
    if(d.channel!=='store') unique(platformIds,JSON.stringify([owner,d.channel,d.channelAccountId,d.externalOrderId]),order);
    const currentUnits=new Set(d.items.flatMap(item=>item.unitIds)), currentItems=new Set(d.items.map(item=>item.id));
    for(const item of d.items) {unique(draftItems,JSON.stringify([owner,item.id]),order);if(retiredItems.has(item.id)) throw new Error('ID item yang dihapus digunakan kembali');for(const id of item.unitIds) {unique(draftUnits,JSON.stringify([owner,id]),order);if(retiredUnits.has(id)) throw new Error('ID unit yang dihapus digunakan kembali');}}
    if(previous?.recordType==='draft') for(const item of previous.draft.items) {if(!currentItems.has(item.id)) retiredItems.add(item.id);for(const id of item.unitIds) if(!currentUnits.has(id)) retiredUnits.add(id);}

    if(previous && previous.recordType==='draft' && (current.draft.orderId!==previous.draft.orderId || current.draft.displayNumber!==previous.draft.displayNumber || current.draft.cashSessionId!==previous.draft.cashSessionId)) throw new Error('Identitas draft berubah');
    if(i>0 && !previous) throw new Error('Record generik bukan draft');
    previous=current; continue;
   }
   const identity=JSON.stringify([owner,current.settlement.orderId]);
   if(current.recordType==='settlement' && ['payment.confirmed-cash','payment.draft-cash'].includes(v.change.kind) && (key!==`settlement:${current.settlement.orderId}` || v.revision!==0 || !v.change.state.some(row=>row.key.startsWith('cash-session:') && typed(row.value)?.recordType==='cash-session'))) throw new Error('Settlement pembayaran tidak sah');
   if(previous && (previous.recordType==='settlement' || previous.recordType==='refund-history') && canonical(current.settlement)!==canonical(previous.settlement)) throw new Error('Settlement immutable');
   if(current.recordType==='settlement') {
    const existing=settlements.get(identity);
    if(existing && existing.key!==key) throw new Error('Settlement duplikat');
    if(!existing) settlements.set(identity,{key,value:current,operationId:v.change.operationId});
   } else {
    const existing=refunds.get(identity);if(existing && existing!==key) throw new Error('Histori refund duplikat');refunds.set(identity,key);
    if(previous && previous.recordType==='refund-history' && (current.refunds.length<previous.refunds.length || previous.refunds.some((entry,j)=>canonical(entry)!==canonical(current.refunds[j])))) throw new Error('Histori refund harus bertambah');
    pending.push({identity,record:current,operationId:v.change.operationId});
   }
   previous=current;
  }
  const last=versions[versions.length-1],actual=stateByKey.get(key);
  if(!actual || actual.revision!==last.revision || canonical(actual.value)!==canonical(last.value)) throw new Error('State tidak sesuai histori');
 }
 for(const numbers of draftSequences.values()) for(let i=1;i<=numbers.size;i++) if(!numbers.has(i)) throw new Error('Urutan nomor draft tidak lengkap');
 for(const identity of draftOrders.keys()) {const settlement=settlements.get(identity);if(refunds.has(identity) || (settlement && !['payment.confirmed-cash','payment.draft-cash','settlement.confirmed-free','settlement.draft-free'].includes(changes.find(c=>c.operationId===settlement.operationId)?.kind ?? ''))) throw new Error('Draft sudah memiliki settlement');}
 for(const row of state) if(typed(row.value) && !byKey.has(row.key)) throw new Error('Record bisnis tanpa receipt');
 for(const item of pending) {const source=settlements.get(item.identity);if(!source || canonical(source.value.recordType==='settlement' || source.value.recordType==='refund-history' ? source.value.settlement : null)!==canonical(item.record.settlement)) throw new Error('Settlement asal refund tidak sesuai');edge(source.operationId,item.operationId);}
 const indegree=new Map(changes.map(change=>[change.operationId,0]));
 for(const next of edges.values()) for(const id of next) indegree.set(id,(indegree.get(id) ?? 0)+1);
 const ready=[...indegree].filter(([,count])=>count===0).map(([id])=>id);let visited=0;
 while(ready.length) {const id=ready.pop()!;visited++;for(const next of edges.get(id) ?? []) {const count=indegree.get(next)!-1;indegree.set(next,count);if(count===0) ready.push(next);}}
 if(visited!==indegree.size) throw new Error('Urutan histori tidak sah');
}
