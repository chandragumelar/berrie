import { draftDateCode } from '../domain/draft';
import type { BusinessRecord } from '../domain/business-record';
import type { AtomicChange } from './commit';
import { canonical } from './commit';
import type { OperationRow, RecordRow } from './database';

function typed(value:unknown):BusinessRecord | undefined {
 if(value && typeof value==='object' && Object.hasOwn(value,'recordType')) return value as BusinessRecord;
 return undefined;
}
/** Validates all versions, using revisions and sequence numbers rather than receipt array order. */
export function validateTransitions(receipts:OperationRow[], state:RecordRow[]):void {
 const changes=receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
 const byKey=new Map<string,{change:AtomicChange; revision:number; value:unknown}[]>();
 for(const change of changes) for(const row of change.state) {
  if(change.kind==='mapping.create' && (!row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='sku-stock-mapping')) throw new Error('Record pemetaan wajib bertipe');
  if(change.kind.startsWith('stock.') && (!row.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='stock-group')) throw new Error('Record stok wajib bertipe');
  const versions=byKey.get(row.key) ?? [];
  versions.push({change,revision:(row.expectedRevision ?? -1)+1,value:row.value});byKey.set(row.key,versions);
 }
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
 const pending:{identity:string; record:Extract<BusinessRecord,{recordType:'refund-history'}>; operationId:string}[]=[];
 for(const [key,versions] of byKey) {
  versions.sort((a,b)=>a.revision-b.revision);
  let previous:BusinessRecord|undefined;let owner:string|undefined;
  const retiredUnits=new Set<string>(),retiredItems=new Set<string>();
  for(let i=0;i<versions.length;i++) {
   const v=versions[i];if(i) edge(versions[i-1].change.operationId,v.change.operationId);
   const current=typed(v.value);
   if(previous && (!current || current.recordType!==previous.recordType || v.change.storeId!==owner)) throw new Error('Transisi record bisnis tidak sah');
   if(!current) continue;
   if(!owner) owner=v.change.storeId;
   if(v.change.storeId!==owner) throw new Error('Toko record berubah');
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
   if(current.recordType==='draft') {
    const d=current.draft, order=JSON.stringify([owner,d.orderId]);
    const change=v.change;
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
   if(previous && previous.recordType!=='draft' && previous.recordType!=='stock-group' && previous.recordType!=='sku-stock-mapping' && canonical(current.settlement)!==canonical(previous.settlement)) throw new Error('Settlement immutable');
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
 for(const identity of draftOrders.keys()) if(settlements.has(identity) || refunds.has(identity)) throw new Error('Draft sudah memiliki settlement');
 for(const row of state) if(typed(row.value) && !byKey.has(row.key)) throw new Error('Record bisnis tanpa receipt');
 for(const item of pending) {const source=settlements.get(item.identity);if(!source || canonical(source.value.recordType==='draft' || source.value.recordType==='stock-group' || source.value.recordType==='sku-stock-mapping' ? null : source.value.settlement)!==canonical(item.record.settlement)) throw new Error('Settlement asal refund tidak sesuai');edge(source.operationId,item.operationId);}
 const indegree=new Map(changes.map(change=>[change.operationId,0]));
 for(const next of edges.values()) for(const id of next) indegree.set(id,(indegree.get(id) ?? 0)+1);
 const ready=[...indegree].filter(([,count])=>count===0).map(([id])=>id);let visited=0;
 while(ready.length) {const id=ready.pop()!;visited++;for(const next of edges.get(id) ?? []) {const count=indegree.get(next)!-1;indegree.set(next,count);if(count===0) ready.push(next);}}
 if(visited!==indegree.size) throw new Error('Urutan histori tidak sah');
}
