/** Internal evidence only. Authentication and blind-count access are T-04 concerns. */
export interface CountBoundary { key:string; sequence:number }
export interface CountEvent {
 action:'save'|'revise'|'cancel'|'close'; purpose:'close'; operationId:string; actorId:string; occurredAt:string;
 sessionRevision:number; boundary:CountBoundary[]; amount:number|null; reason:string|null;
 countOperationId:string|null; expected:number|null; difference:number|null;
 blockers:string[]; incomplete:string[];
}
export interface CashCountHistory { sessionId:string; storeId:string; events:CountEvent[] }
export function validateCashCountHistory(input:unknown): asserts input is CashCountHistory {
 if(!input || typeof input!=='object' || Array.isArray(input) || Object.getPrototypeOf(input)!==Object.prototype) throw new Error('Histori hitungan tidak sah');
 const h=input as CashCountHistory;
 const text=(x:unknown)=>typeof x==='string' && !!x.trim() && x.length<=200;
 if(Object.keys(h).sort().join(',')!=='events,sessionId,storeId' || !text(h.sessionId) || !text(h.storeId) || !Array.isArray(h.events) || !h.events.length) throw new Error('Histori hitungan tidak sah');
 for(const e of h.events) {
  if(!e || typeof e!=='object' || Object.keys(e).sort().join(',')!=='action,actorId,amount,blockers,boundary,countOperationId,difference,expected,incomplete,occurredAt,operationId,purpose,reason,sessionRevision' || e.purpose!=='close' || !['save','revise','cancel','close'].includes(e.action) || !text(e.actorId) || !text(e.operationId) || !Number.isSafeInteger(e.sessionRevision) || e.sessionRevision<0 || typeof e.occurredAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(e.occurredAt) || !Number.isFinite(Date.parse(e.occurredAt)) || !Array.isArray(e.boundary) || !Array.isArray(e.blockers) || !Array.isArray(e.incomplete)) throw new Error('Event hitungan tidak sah');
  if(e.boundary.some((b,i)=>!b || Object.keys(b).sort().join(',')!=='key,sequence' || typeof b.key!=='string' || !b.key || !Number.isSafeInteger(b.sequence) || b.sequence<1 || (i>0 && e.boundary[i-1].key>=b.key))) throw new Error('Batas hitungan tidak sah');
  if(e.blockers.length || e.incomplete.length || (e.reason!==null && (typeof e.reason!=='string' || !e.reason.trim() || e.reason.length>500))) throw new Error('Bukti hitungan tidak sah');
  if(e.action==='save' || e.action==='revise') {if(!Number.isSafeInteger(e.amount) || (e.amount as number)<0 || e.reason!==null || e.countOperationId!==null || e.expected!==null || e.difference!==null) throw new Error('Nilai hitungan tidak sah');}
  else if(e.action==='cancel') {if(e.amount!==null || e.reason!==null || e.countOperationId!==null || e.expected!==null || e.difference!==null) throw new Error('Batal hitungan tidak sah');}
  else if(!Number.isSafeInteger(e.amount) || (e.amount as number)<0 || !Number.isSafeInteger(e.expected) || (e.expected as number)<0 || !Number.isSafeInteger(e.difference) || e.difference!==(e.amount as number)-(e.expected as number) || !text(e.countOperationId) || (e.difference!==0 && e.reason===null)) throw new Error('Snapshot penutupan tidak sah');
 }
}
