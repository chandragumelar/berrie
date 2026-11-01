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
  const versions=byKey.get(row.key) ?? [];
  versions.push({change,revision:(row.expectedRevision ?? -1)+1,value:row.value});byKey.set(row.key,versions);
 }
 const settlements=new Map<string,{key:string; value:BusinessRecord; operationId:string}>();
 const refunds=new Map<string,string>();
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
  for(let i=0;i<versions.length;i++) {
   const v=versions[i];if(i) edge(versions[i-1].change.operationId,v.change.operationId);
   const current=typed(v.value);
   if(previous && (!current || current.recordType!==previous.recordType || v.change.storeId!==owner)) throw new Error('Transisi record bisnis tidak sah');
   if(!current) continue;
   if(!owner) owner=v.change.storeId;
   if(v.change.storeId!==owner) throw new Error('Toko record berubah');
   const identity=JSON.stringify([owner,current.settlement.orderId]);
   if(previous && canonical(current.settlement)!==canonical(previous.settlement)) throw new Error('Settlement immutable');
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
 for(const row of state) if(typed(row.value) && !byKey.has(row.key)) throw new Error('Record bisnis tanpa receipt');
 for(const item of pending) {const source=settlements.get(item.identity);if(!source || canonical(source.value.settlement)!==canonical(item.record.settlement)) throw new Error('Settlement asal refund tidak sesuai');edge(source.operationId,item.operationId);}
 const indegree=new Map(changes.map(change=>[change.operationId,0]));
 for(const next of edges.values()) for(const id of next) indegree.set(id,(indegree.get(id) ?? 0)+1);
 const ready=[...indegree].filter(([,count])=>count===0).map(([id])=>id);let visited=0;
 while(ready.length) {const id=ready.pop()!;visited++;for(const next of edges.get(id) ?? []) {const count=indegree.get(next)!-1;indegree.set(next,count);if(count===0) ready.push(next);}}
 if(visited!==indegree.size) throw new Error('Urutan histori tidak sah');
}
