import type { BusinessRecord } from '../domain/business-record';
import { stockCondition, type StockReport, type StockReportEntry } from '../domain/stock-report';
import type { AtomicChange } from './commit';
import type { BerrieDatabase } from './database';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

const debits=new Set(['batch.confirm-first','payment.draft-cash','payment.draft-noncash','settlement.draft-free']);
const returns=new Set(['refund.served','refund.return-stock','cancellation.paid','refund.cancelled','cancellation.refund-paid','cancellation.return-stock','cancellation.free','return.free','cancellation.unpaid','return.unpaid']);
type Stock=Extract<BusinessRecord,{recordType:'stock-group'}>['stockGroup'];
type EventValue={groupId?:string;delta?:number;required?:number;before?:number;after?:number;event?:{id?:string;refundId?:string;cancellationId?:string;paymentId?:string;reason?:string;recordedAt?:string;units?:{id:string;groupId:string}[]}};
/** Read only; T-04 authorization is required before operational access. */
export async function readInternalStockReport(db:BerrieDatabase,storeId:string):Promise<StockReport> {
 if(typeof storeId!=='string'||!storeId.trim()||storeId.length>200) throw new Error('Toko tidak sah');
 const s=validateCheckpoint(await checkpoint(db));
 const changes=s.receipts.map(r=>JSON.parse(r.payload) as AtomicChange).filter(c=>c.storeId===storeId);
 const incomplete:StockReport['incomplete']=[], groups:StockReport['groups']=[], ledger:StockReportEntry[]=[];
 for(const row of s.state) {
  const value=row.value as BusinessRecord;
  const creator=changes.find(c=>c.state.some(x=>x.key===row.key&&x.expectedRevision===null));
  if(!creator) continue;
  if(!value || typeof value!=='object' || !('recordType' in value)) { incomplete.push({key:row.key,reason:'Record generik belum didukung'}); continue; }
  if(value.recordType==='first-batch' && (value.schemaVersion!==2 || value.batch.draft.channel!=='store')) incomplete.push({key:row.key,reason:'Batch legacy atau platform belum didukung'});
  if(value.recordType==='draft' && (value.schemaVersion!==2 || value.draft.channel!=='store')) incomplete.push({key:row.key,reason:'Draft legacy atau platform belum didukung'});
  if(value.recordType==='refund-history') incomplete.push({key:row.key,reason:'Histori refund legacy belum didukung'});
  if(value.recordType!=='stock-group') continue;
  const group=value.stockGroup;
  if(group.storeId!==storeId) throw new Error('Histori stok berbeda toko');
  const skuIds=s.state.flatMap(r=>{const m=r.value as BusinessRecord;return m?.recordType==='sku-stock-mapping' && m.mapping.storeId===storeId && m.mapping.groupId===group.groupId?[m.mapping.skuId]:[];}).sort();
  groups.push({groupId:group.groupId,revision:row.revision,baseline:group.baseline,balance:group.balance,minimum:group.minimum,condition:stockCondition(group.balance,group.minimum),skuIds});
  const versions=changes.flatMap(c=>c.state.filter(x=>x.key===row.key).map(x=>({c,x,revision:(x.expectedRevision??-1)+1}))).sort((a,b)=>a.revision-b.revision);
  let prior:Stock|null=null;
  for(const {c,x,revision} of versions) {
   const next=(x.value as Extract<BusinessRecord,{recordType:'stock-group'}>).stockGroup;
   const before=prior?.balance??0, after=next.balance, delta=after-before;
   if(!Number.isSafeInteger(delta)) throw new Error('Delta stok melampaui batas aman');
   if(c.kind==='stock.minimum') {prior=next;continue;}
   const kind=c.kind==='stock.opening'?'opening':c.kind==='stock.correction'?'correction':c.kind==='stock.in'?'in':debits.has(c.kind)?'debit':returns.has(c.kind)?'return':null;
   if(!kind) {incomplete.push({key:row.key,reason:`Operasi stok ${c.kind} belum didukung`});prior=next;continue;}
   const matches=c.ledger.filter(l=>(l.value as EventValue)?.groupId===group.groupId);
   if(matches.length!==1) throw new Error('Histori ledger stok tidak cocok');
   const entry=matches[0], v=entry.value as EventValue;
   if((kind==='debit' ? -v.required! : v.delta)!==delta || (v.before!==undefined && v.before!==before) || (v.after!==undefined && v.after!==after)) throw new Error('Saldo ledger stok tidak cocok');
   const payload=c.payload as {metadata?:{recordedAt?:string}};
   const audit=c.audit.find(a=>a.id===`stock-audit:${c.operationId}`)?.value as {recordedAt?:string;occurredAt?:string;reason?:string|null}|undefined;
   const batch=c.state.find(t=>t.key===`first-batch:${c.targetId}`)?.value as Extract<BusinessRecord,{recordType:'first-batch'}>|undefined;
   const unitIds=kind==='debit' && batch?.recordType==='first-batch'?batch.batch.draft.items.filter(i=>batch.batch.skuGroups.some(m=>m.skuId===i.skuId&&m.groupId===group.groupId)).flatMap(i=>i.unitIds):kind==='return'?(v.event?.units??[]).filter(u=>u.groupId===group.groupId).map(u=>u.id):[];
   ledger.push({ledgerId:entry.id,operationId:c.operationId,groupId:group.groupId,revision,kind,orderId:kind==='debit'||kind==='return'?c.targetId:null,sourceId:kind==='debit'?`first-batch:${c.targetId}`:v.event?.id??null,refundId:v.event?.refundId??null,cancellationId:v.event?.cancellationId??null,paymentId:v.event?.paymentId??null,unitIds,actorId:c.actorId,occurredAt:audit?.occurredAt??(kind==='debit'?batch?.batch.confirmedAt:null)??null,recordedAt:audit?.recordedAt??v.event?.recordedAt??payload.metadata?.recordedAt??null,reason:audit?.reason??v.event?.reason??null,delta,before,after});
   prior=next;
  }
  if(prior?.balance!==group.balance) throw new Error('Saldo akhir stok tidak cocok');
 }
 groups.sort((a,b)=>a.groupId.localeCompare(b.groupId));ledger.sort((a,b)=>a.groupId.localeCompare(b.groupId)||a.revision-b.revision);
 incomplete.sort((a,b)=>a.key.localeCompare(b.key)||a.reason.localeCompare(b.reason));
 return structuredClone({storeId,scope:'stok per grup dan histori batch pertama yang didukung',checkpoint:{schema:s.schema,boundary:s.sequences},status:incomplete.length?'incomplete':'complete',incomplete,groups,ledger});
}
