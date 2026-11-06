import type { BusinessRecord } from '../domain/business-record';
import type { CountBoundary } from '../domain/cash-count';
import { canonical, type AtomicChange } from './commit';
import { makeCashCountChange, type CountAction, type CountInput } from './cash-count';
import type { CashMetadata } from './cash-sessions';
import type { OperationRow, RecordRow } from './database';
import type { Snapshot } from './recovery';

type Version={change:AtomicChange;revision:number;value:unknown};
const orderKinds=new Set(['draft.create','draft.update','draft.cancel','batch.confirm-first','payment.draft-cash','payment.confirmed-cash','payment.draft-noncash','payment.confirmed-noncash','settlement.draft-free','settlement.confirmed-free','serving.serve','serving.correct','payment.correct-method','payment.adjust-closed-method','refund.served','refund.return-stock','cancellation.paid','refund.cancelled','cancellation.refund-paid','cancellation.return-stock','cancellation.free','return.free','cancellation.unpaid','return.unpaid']);
const typed=(v:unknown)=>v && typeof v==='object' && 'recordType' in v?v as BusinessRecord:undefined;
const stream=(c:AtomicChange)=>JSON.stringify([c.storeId,c.deviceId,c.deviceEpoch]);
/** A legacy generic record can use any kind without opting into the new contract. */
export function isCashCountChange(c:AtomicChange):boolean {return c.kind.startsWith('cash-count.') && c.state.some(s=>{const type=typed(s.value)?.recordType;return type==='cash-count' || type==='cash-session';});}
function prefix(receipts:OperationRow[],boundary:CountBoundary[]):Snapshot {
 const limits=new Map(boundary.map(b=>[b.key,b.sequence]));
 const chosen=receipts.filter(r=>{const c=JSON.parse(r.payload) as AtomicChange;return c.localSequence<=(limits.get(stream(c)) ?? 0);});
 const versions=new Map<string,RecordRow>();
 const ledger:Snapshot['ledger']=[],audit:Snapshot['audit']=[],outbox:Snapshot['outbox']=[];
 for(const r of chosen) {const c=JSON.parse(r.payload) as AtomicChange;for(const s of c.state) {const revision=(s.expectedRevision ?? -1)+1,old=versions.get(s.key);if(!old || old.revision<revision) versions.set(s.key,{key:s.key,revision,value:s.value});}ledger.push(...c.ledger);audit.push(...c.audit);outbox.push(c.outbox);}
 const actual=new Map<string,number>();for(const r of chosen) {const c=JSON.parse(r.payload) as AtomicChange,k=stream(c);actual.set(k,(actual.get(k) ?? 0)+1);}
 if(actual.size!==limits.size || [...limits].some(([k,n])=>actual.get(k)!==n)) throw new Error('Batas event tidak lengkap');
 return {schema:1,state:[...versions.values()],ledger,audit,outbox,receipts:chosen,sequences:boundary};
}
/** Add ordering constraints and validate lifecycle from the source snapshot, not from current UI state. */
export function validateCashCountTransitions(receipts:OperationRow[],byKey:Map<string,Version[]>,edge:(from:string,to:string)=>void):void {
 const changes=receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
 for(const c of changes.filter(isCashCountChange)) {
  const action=c.kind.slice('cash-count.'.length) as CountAction,p=c.payload as {data:CountInput;metadata:CashMetadata;boundary:CountBoundary[]};
  if(!p || !Array.isArray(p.boundary)) throw new Error('Batas hitungan hilang');
  const s=prefix(receipts,p.boundary);
  if(s.receipts.some(r=>r.id===c.operationId)) throw new Error('Batas mencakup dirinya sendiri');
  for(const r of receipts) {if(r.id===c.operationId)continue;const other=JSON.parse(r.payload) as AtomicChange;if(other.localSequence<=(new Map(p.boundary.map(b=>[b.key,b.sequence])).get(stream(other)) ?? 0)) edge(other.operationId,c.operationId);else edge(c.operationId,other.operationId);}
  if(canonical(c)!==canonical(makeCashCountChange(s,action,p.data,p.metadata))) throw new Error('Histori hitungan tidak sesuai sumber');
 }
 // Every store has one initial opening; later openings consume exactly one prior close.
 const opens=changes.filter(c=>c.kind==='cash.open'), closes=new Map(changes.filter(c=>c.kind==='cash-count.close' && isCashCountChange(c)).map(c=>[c.operationId,c]));
 const stores=new Map<string,AtomicChange[]>();for(const c of opens) {const list=stores.get(c.storeId) ?? [];list.push(c);stores.set(c.storeId,list);}
 for(const list of stores.values()) {
  const used=new Set<string>(),roots=list.filter(c=>!(c.payload as {previousClose?:string}).previousClose);
  if(roots.length!==1) throw new Error('Rantai pembukaan sesi tidak sah');
  for(const c of list) {const previous=(c.payload as {previousClose?:string}).previousClose;if(!previous) continue;const close=closes.get(previous);if(!close || close.storeId!==c.storeId || close.targetId===c.targetId || used.has(previous)) throw new Error('Sumber pembukaan sesi tidak sah');used.add(previous);edge(previous,c.operationId);}
  const reachable=new Set<string>();let current:AtomicChange|undefined=roots[0];while(current) {if(reachable.has(current.operationId)) throw new Error('Siklus sesi');reachable.add(current.operationId);const close=[...closes.values()].find(c=>c.targetId===current!.targetId && c.storeId===current!.storeId);current=close?list.find(o=>(o.payload as {previousClose?:string}).previousClose===close.operationId):undefined;}
  if(reachable.size!==list.length) throw new Error('Rantai sesi terputus');
 }
 // Untyped writes cannot be attributed to a session. The live guard stops them
 // while counting; enforce the same interval when reconstructing a checkpoint.
 for(const [key,versions] of byKey) {
  if(!key.startsWith('cash-session:')) continue;
  const counts=versions.filter(v=>isCashCountChange(v.change)).sort((a,b)=>a.revision-b.revision);
  for(let i=0;i<counts.length;i++) {
   const active=counts[i].change;if(active.kind!=='cash-count.save' && active.kind!=='cash-count.revise') continue;
   const boundary=new Map((active.payload as {boundary:CountBoundary[]}).boundary.map(b=>[b.key,b.sequence]));
   const next=counts[i+1]?.change,upper=next?new Map((next.payload as {boundary:CountBoundary[]}).boundary.map(b=>[b.key,b.sequence])):undefined;
   for(const other of changes) {if(other.operationId===active.operationId || other.operationId===next?.operationId || other.storeId!==active.storeId || !other.state.some(s=>!typed(s.value))) continue;
    if(other.localSequence>(boundary.get(stream(other)) ?? 0) && (!upper || other.localSequence<=(upper.get(stream(other)) ?? 0))) throw new Error('Sumber generik berubah selama hitungan');
   }
  }
 }
 const states=new Map<string,Map<number,'open'|'counting'|'closed'>>();
 for(const [key,versions] of byKey) {
  if(!key.startsWith('cash-session:')) continue;
  const status=new Map<number,'open'|'counting'|'closed'>();let current:'open'|'counting'|'closed'='open';
  for(const v of [...versions].sort((a,b)=>a.revision-b.revision)) {
   const kind=v.change.kind;
   if(kind==='cash-count.save') {if(current!=='open') throw new Error('Sesi tidak tersedia');current='counting';}
   else if(kind==='cash-count.revise') {if(current!=='counting') throw new Error('Hitungan tidak aktif');}
   else if(kind==='cash-count.cancel') {if(current!=='counting') throw new Error('Hitungan tidak aktif');current='open';}
   else if(kind==='cash-count.close') {if(current!=='counting') throw new Error('Hitungan tidak aktif');current='closed';}
   else if(v.revision>0 && current!=='open') throw new Error('Mutasi sesi ditahan');
   status.set(v.revision,current);
  }
  states.set(key.slice('cash-session:'.length),status);
 }
 for(const c of changes.filter(c=>orderKinds.has(c.kind))) {
  const draft=typed(byKey.get(`draft:${c.targetId}`)?.find(v=>v.revision===0)?.value);
  if(draft?.recordType!=='draft') continue; // Historic generic sources retain their original contract.
  if(c.kind==='payment.adjust-closed-method' || ((c.kind==='refund.served' || c.kind==='refund.return-stock') && (c.payload as {contractVersion?:number})?.contractVersion===3)) {
   const p=c.payload as {sourceSession?:{id:string;revision:number};sessionSource?:{id:string;revision:number}};
   const origin=p.sourceSession,execution=p.sessionSource;
   if(!origin || !execution || origin.id!==draft.draft.cashSessionId || origin.id===execution.id || states.get(origin.id)?.get(origin.revision)!=='closed' || states.get(execution.id)?.get(execution.revision)!=='open') throw new Error('Sesi penyesuaian tidak sah');
   const old=byKey.get(`cash-session:${origin.id}`)?.find(v=>v.revision===origin.revision),current=byKey.get(`cash-session:${execution.id}`)?.find(v=>v.revision===execution.revision),next=byKey.get(`cash-session:${execution.id}`)?.find(v=>v.revision===execution.revision+1);
   if(!old || old.change.kind!=='cash-count.close' || !current || old.change.storeId!==c.storeId || current.change.storeId!==c.storeId) throw new Error('Sumber sesi penyesuaian tidak sah');
   edge(old.change.operationId,c.operationId);edge(current.change.operationId,c.operationId);if(next) edge(c.operationId,next.change.operationId);
   continue;
  }
  const id=draft.draft.cashSessionId,versions=byKey.get(`cash-session:${id}`) ?? [],p=c.payload as {sessionSource?:{id:string;revision:number};data?:{expectedSessionRevision?:number}};
  const touched=c.state.find(s=>s.key===`cash-session:${id}`);
  const revision=touched?.expectedRevision ?? p?.sessionSource?.revision ?? p?.data?.expectedSessionRevision;
  if(revision===undefined || revision===null) {
   const first=versions.filter(v=>v.change.kind.startsWith('cash-count.')).sort((a,b)=>a.revision-b.revision)[0];if(first) edge(c.operationId,first.change.operationId);
   continue;
  }
  if(p?.sessionSource && p.sessionSource.id!==id || states.get(id)?.get(revision)!=='open') throw new Error('Mutasi pesanan pada sesi tidak tersedia');
  const source=versions.find(v=>v.revision===revision),next=versions.find(v=>v.revision===revision+1);
  if(!source) throw new Error('Sumber sesi tidak ditemukan');edge(source.change.operationId,c.operationId);if(next) edge(c.operationId,next.change.operationId);
 }
}
/** Current transaction guard for all session-bound commands, including historic contract shapes. */
export function assertSessionWritable(change:AtomicChange,state:RecordRow[]):void {
 if(isCashCountChange(change) || change.kind==='cash.open') return;
 const ids=new Set<string>();
 for(const s of change.state) if(s.key.startsWith('cash-session:')) ids.add(s.key.slice('cash-session:'.length));
 const postClose=change.kind==='payment.adjust-closed-method' || ((change.kind==='refund.served' || change.kind==='refund.return-stock') && (change.payload as {contractVersion?:number})?.contractVersion===3);
 if(postClose) {const p=change.payload as {sourceSession?:{id:string;revision:number};sessionSource?:{id:string;revision:number}};const origin=state.find(r=>r.key===`cash-session:${p.sourceSession?.id}`),count=typed(state.find(r=>r.key===`cash-count:${p.sourceSession?.id}`)?.value),execution=state.find(r=>r.key===`cash-session:${p.sessionSource?.id}`);if(!origin || origin.revision!==p.sourceSession?.revision || count?.recordType!=='cash-count' || count.history.events.at(-1)?.action!=='close' || !execution || execution.revision!==p.sessionSource?.revision) throw new Error('Sumber sesi berubah');ids.add(p.sessionSource!.id);}
 if(orderKinds.has(change.kind) && !postClose) {const draft=typed(state.find(r=>r.key===`draft:${change.targetId}`)?.value) ?? typed(change.state.find(r=>r.key===`draft:${change.targetId}`)?.value);if(draft?.recordType==='draft') ids.add(draft.draft.cashSessionId);}
 if(change.state.some(row=>!typed(row.value)) && state.some(row=>{const record=typed(row.value);const last=record?.recordType==='cash-count' && record.history.storeId===change.storeId?record.history.events.at(-1)?.action:undefined;return last==='save' || last==='revise';})) throw new Error('Sumber generik tidak dapat diubah selama hitungan');
 for(const id of ids) {const count=typed(state.find(r=>r.key===`cash-count:${id}`)?.value);if(count?.recordType==='cash-count') {const action=count.history.events.at(-1)?.action;if(action==='save' || action==='revise' || action==='close') throw new Error('Mutasi sesi ditahan');}}
}
