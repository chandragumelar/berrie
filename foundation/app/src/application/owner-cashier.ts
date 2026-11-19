import type { AccessGrant } from '../auth/contracts';
import { calculateDraft } from '../domain/draft';
import type { BusinessRecord } from '../domain/business-record';
import { AuthorizedCash } from '../storage/authorized-cash';
import { AuthorizedCatalog } from '../storage/authorized-catalog';
import { AuthorizedDrafts, type CatalogDraftInput } from '../storage/authorized-drafts';
import { AuthorizedPayments } from '../storage/authorized-payments';
import { AuthorizedStock } from '../storage/authorized-stock';
import { AuthorizedServing } from '../storage/authorized-serving';
import { canonical, type AtomicChange } from '../storage/commit';
import type { BerrieDatabase } from '../storage/database';
import type { LocalPinSecurity } from '../storage/local-pin';
import type { OfflinePermitStorage } from '../storage/offline-permit';
import { checkpoint } from '../storage/recovery';
import { validateCheckpoint } from '../storage/validate-checkpoint';
import { cashMovements } from '../storage/cash-sessions';
import { cashBalance } from '../domain/cash-session';
import { initialServing } from '../domain/serving';
import { ordersFromSnapshot, sessionCloseBlockers, type SessionBlockersRead } from '../storage/order-status';
import type { OperationalStatus } from '../domain/order-status';
import type { CashReport } from '../domain/cash-report';
import type { Payment } from '../domain/payment';
import type { PaymentMethods } from '../domain/payment-methods';
import type { PaymentMethodsInput } from '../storage/payment-methods';
import type { NoncashDetails, DraftNoncashInput, ConfirmedNoncashInput } from '../storage/noncash-payment';
import type { CountBaseInput, CountAmountInput } from '../storage/authorized-cash';
import { readSimpleCatalog } from '../storage/simple-catalog';
import { CommandJournal } from './command-journal';
import type { AdditionsCashInput } from '../storage/payment-additions-cash';

export interface SaleItem {id:string;skuId:string;name:string;price:number;unitIds:string[];note:string;serving:'dine_in'|'takeaway';batch:1|2;units:{id:string;status:'processed'|'served'|'cancelled'}[]}
export interface SaleOrder {id:string;number:string;customer:string;serving:'dine_in'|'takeaway';note:string;sessionId:string;revision:number;batchRevision:number|null;servingRevision:number|null;items:SaleItem[];total:number;phase:'draft'|'confirmed'|'paid';payment:Payment|null;received:number|null;change:number|null;served:boolean;status:OperationalStatus;readOnly:boolean;cancellation:{reason:string;recordedAt:string;actorId:string}|null}
export interface CashView {sessionId:string;number:string;revision:number;opening:number;balance:number}
export interface OwnerView {catalog:{categories:{id:string;name:string}[];menus:{id:string;skuId:string;stockGroupId:string;name:string;categoryId:string;code:string;price:number;stock:number;minimum:number}[];revision:number|null};paymentMethods:{methods:PaymentMethods;revision:number|null};cash:CashView|null;countActive:boolean;closedSessionId:string|null;closedReport:CashReport|null;blockers:SessionBlockersRead|null;orders:SaleOrder[]}
type Op={operationId:string;localSequence:number;recordedAt:string};
export class OwnerCashier {
 private active=true;private journal:CommandJournal;private catalog:AuthorizedCatalog;private cash:AuthorizedCash;private drafts:AuthorizedDrafts;private stock:AuthorizedStock;private payments:AuthorizedPayments;private serving:AuthorizedServing;
 constructor(private grant:AccessGrant,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private db:BerrieDatabase){this.journal=new CommandJournal(db);this.catalog=new AuthorizedCatalog(db,pin,permits);this.cash=new AuthorizedCash(db,pin,permits);this.drafts=new AuthorizedDrafts(db,pin,permits);this.stock=new AuthorizedStock(db,pin,permits);this.payments=new AuthorizedPayments(db,pin,permits);this.serving=new AuthorizedServing(db,pin,permits);}
 invalidate(){this.active=false;this.journal.close();}
 private guard(){if(!this.active)throw new Error('Akses sudah dikunci');}
 private async read<T>(fn:()=>Promise<T>):Promise<T>{this.guard();if(this.db.name!==this.pin.businessName||this.db.name!==this.permits.businessName)throw new Error('Sumber akses tidak sesuai');const i=this.grant.identity,captured=this.pin.captureIdentity(i);const first=await this.permits.read(i);return this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>navigator.locks.request(`berrie-writer:${this.db.name}`,async()=>{this.guard();captured();const pinGuard=await checkPin(i),current=await readPermit(i);if(current.clockFault||canonical(first.permit)!==canonical(current.permit)||canonical(first.policy??null)!==canonical(current.policy??null)||current.permit.payload.version!==2||!current.policy||current.permit.payload.role!=='owner'||current.policy.version!==current.permit.payload.policyVersion||!current.policy.actors.some(a=>a.id===i.actorId&&a.role==='owner'&&a.active))throw new Error('Akses tidak sah');pinGuard();current.assertTime();const result=await fn();this.guard();captured();(await checkPin(i))();return result;})));}
 async view():Promise<OwnerView>{
  const base=await this.read(async()=>{
   const snap=validateCheckpoint(await checkpoint(this.db)),storeId=this.grant.identity.storeId;
   const {catalog:c,revision}=await readSimpleCatalog(this.db,storeId);
   const menus=c.menus.map(m=>{const group=snap.state.find(r=>r.key===`stock-group:${m.stockGroupId}`)?.value as Extract<BusinessRecord,{recordType:'stock-group'}>|undefined;if(group?.recordType!=='stock-group')throw new Error('Stok menu belum lengkap');return {id:m.id,skuId:m.skuId,stockGroupId:m.stockGroupId,name:m.name,categoryId:m.categoryId,code:m.code,price:m.price,stock:group.stockGroup.balance,minimum:group.stockGroup.minimum};});
   const changes=snap.receipts.map(r=>JSON.parse(r.payload) as AtomicChange);
   const sessions=snap.state.filter(r=>r.key.startsWith('cash-session:')).map(row=>({row,record:row.value as BusinessRecord})).filter(x=>x.record.recordType==='cash-session'&&x.record.session.storeId===storeId);
   const lastEvent=(id:string)=>{const v=snap.state.find(r=>r.key===`cash-count:${id}`)?.value as Extract<BusinessRecord,{recordType:'cash-count'}>|undefined;return v?.recordType==='cash-count'?v.history.events.at(-1):undefined;};
   const open=sessions.filter(x=>x.record.recordType==='cash-session'&&lastEvent(x.record.session.id)?.action!=='close');
   if(open.length>1)throw new Error(`Lebih dari satu sesi kas terbuka: ${open.map(x=>x.row.key).join(', ')}`);
   const current=open[0],session=current?.record.recordType==='cash-session'?current.record.session:null;
   const closes=sessions.map(x=>{const id=x.record.recordType==='cash-session'?x.record.session.id:'';return {id,operationId:lastEvent(id)?.action==='close'?lastEvent(id)!.operationId:null};});
   const opens=changes.filter(x=>x.kind==='cash.open'&&x.storeId===storeId);
   if(opens.length!==sessions.length)throw new Error('Rantai pembukaan kas tidak lengkap');
   for(const x of sessions){const id=x.record.recordType==='cash-session'?x.record.session.id:'';if(opens.filter(c=>c.targetId===id).length!==1)throw new Error(`Asal sesi ${id} tidak sah`);}
   let closedSessionId:string|null=null;
   if(session){const source=opens.find(x=>x.targetId===session.id)!;const predecessor=(source.payload as {previousClose?:string}).previousClose;closedSessionId=predecessor?closes.find(x=>x.operationId===predecessor)?.id??null:null;if(predecessor&&!closedSessionId)throw new Error('Pendahulu sesi tidak ditemukan');}
   else if(closes.length){const referenced=new Set(opens.map(x=>(x.payload as {previousClose?:string}).previousClose).filter(Boolean));const heads=closes.filter(x=>x.operationId&&!referenced.has(x.operationId));if(heads.length!==1)throw new Error('Rantai sesi tertutup tidak sah');closedSessionId=heads[0].id;}
   const visited=new Set<string>();let cursor=session?.id??closedSessionId;
   while(cursor){if(visited.has(cursor))throw new Error(`Rantai sesi berulang pada ${cursor}`);visited.add(cursor);const source=opens.find(x=>x.targetId===cursor);if(!source)throw new Error(`Pembukaan ${cursor} hilang`);const predecessor=(source.payload as {previousClose?:string}).previousClose;cursor=predecessor?closes.find(x=>x.operationId===predecessor)?.id??null:null;if(predecessor&&!cursor)throw new Error(`Close pendahulu ${predecessor} hilang`);}
   if(visited.size!==sessions.length)throw new Error('Rantai sesi kas terputus');
   const cash=session?{sessionId:session.id,number:session.number,revision:current!.row.revision,opening:session.openingAmount,balance:cashBalance(cashMovements(changes,session.id),session)}:null;
   const countActive=!!session&&['save','revise'].includes(lastEvent(session.id)?.action??'');
   const blockers=session?sessionCloseBlockers(snap,storeId,session.id):null;
   const drafts=snap.state.filter(r=>r.key.startsWith('draft:')).map(row=>({row,record:row.value as BusinessRecord})).filter(x=>x.record.recordType==='draft'&&(x.record.draft.cashSessionId===session?.id||x.record.draft.cashSessionId===closedSessionId));
   const statuses=ordersFromSnapshot(snap,storeId,drafts.map(x=>x.record.recordType==='draft'?x.record.draft.orderId:''));
   const orders:SaleOrder[]=[];
   for(const {row,record} of drafts){if(record.recordType!=='draft')continue;const d=record.draft,status=statuses[d.orderId].status;if(!status)continue;
    const batchRow=snap.state.find(r=>r.key===`first-batch:${d.orderId}`),batch=batchRow?.value as Extract<BusinessRecord,{recordType:'first-batch'}>|undefined;
    const addition=snap.state.find(r=>r.key===`order-batch:${d.orderId}:2`)?.value as Extract<BusinessRecord,{recordType:'order-batch'}>|undefined;
    const source=batch?.recordType==='first-batch'?batch.batch.draft:d;
    const servingRow=snap.state.find(r=>r.key===`serving:${d.orderId}`),servingRecord=servingRow?.value as Extract<BusinessRecord,{recordType:'serving'}>|undefined;
    const serving=batch?.recordType==='first-batch'?(servingRecord?.recordType==='serving'?servingRecord.serving:initialServing(batch.batch)):null;
    const payment=snap.state.find(r=>r.key===`payment:${d.orderId}`)?.value as BusinessRecord|undefined,p=payment?.recordType==='payment'?(payment.payment as Payment):null;
    const settled=snap.state.find(r=>r.key===`settlement:${d.orderId}`)?.value as BusinessRecord|undefined;
    const total=settled?.recordType==='settlement'?settled.settlement.totals.total:calculateDraft(source).total;
    const cancelled=snap.state.find(r=>r.key===`draft-cancellation:${d.orderId}`)?.value as Extract<BusinessRecord,{recordType:'draft-cancellation'}>|undefined;
    orders.push({id:d.orderId,number:d.displayNumber,customer:source.customer,serving:source.serving,note:source.note,sessionId:d.cashSessionId,revision:row.revision,batchRevision:batchRow?.revision??null,servingRevision:servingRow?.revision??null,items:[...source.items.map(x=>({item:x,batch:1 as const})),...(addition?.recordType==='order-batch'?addition.batch.draft.items.map(x=>({item:x,batch:2 as const})):[])].map(({item:x,batch})=>({id:x.id,skuId:x.skuId,name:x.name,price:x.skuPrice,unitIds:x.unitIds,note:x.note,serving:x.serving,batch,units:x.unitIds.map(id=>({id,status:serving?.units.find(u=>u.id===id)?.status??'processed'}))})),total,phase:p?'paid':batch?'confirmed':'draft',payment:p,received:p?.method==='cash'?p.received:null,change:p?.method==='cash'?p.change:null,served:status.counts.processed===0&&status.counts.served>0,status,readOnly:d.cashSessionId!==session?.id,cancellation:cancelled?.recordType==='draft-cancellation'?{reason:cancelled.cancellation.reason,recordedAt:cancelled.cancellation.recordedAt,actorId:cancelled.cancellation.actorId}:null});
   }
   return {catalog:{categories:c.categories,menus,revision:revision<0?null:revision},cash,countActive,closedSessionId,blockers,orders};
  });
  let closedReport:CashReport|null=null;
  if(base.closedSessionId){const report=await this.cash.report(this.grant.identity,base.closedSessionId);if(report.status!=='ok')throw new Error('Ringkasan kas tertutup tidak dapat dibaca');closedReport=report.value;}
  const methods=await this.payments.readMethods(this.grant.identity);
  if(methods.status!=='ok')throw new Error('Metode pembayaran tidak dapat dibaca');
  return {...base,closedReport,paymentMethods:methods.value};
 }
 private async run(intent:unknown,opId:string,command:(op:Op)=>Promise<{status:string;value?:unknown;[key:string]:unknown}>):Promise<unknown>{this.guard();const i=this.grant.identity,stream=this.journal.stream(i.storeId,i.deviceId,i.epoch);return navigator.locks.request(`berrie-command:${this.db.name}`,async()=>{this.guard();const pending=await this.journal.pending(stream);for(const row of pending){const outcome=await this.inspect(row.id);if(outcome.status==='committed')await this.journal.set(row.id,'committed',outcome.value);else if(row.id!==opId)throw new Error('Periksa hasil operasi sebelumnya');}const prepared=await this.journal.prepare(stream,intent,opId);if(prepared.status==='committed'){const verified=await this.inspect(opId);if(verified.status!=='committed')throw new Error('Hasil operasi tidak sesuai');return verified.value;}const op={operationId:prepared.id,localSequence:prepared.sequence,recordedAt:prepared.recordedAt};let rejected=false;try{const result=await command(op);if(result.status==='ok'){await this.journal.set(opId,'committed',result.value??result);this.guard();return (result.value??result);}const outcome=await this.inspect(opId);if(outcome.status==='committed'){await this.journal.set(opId,'committed',outcome.value);return outcome.value;}await this.journal.set(opId,'rejected');rejected=true;throw new Error('Operasi ditolak; periksa input dan izin');}catch(e){if(rejected)throw e;const outcome=await this.inspect(opId).catch(()=>({status:'unknown'} as const));if(outcome.status==='committed'){await this.journal.set(opId,'committed',outcome.value);return outcome.value;}await this.journal.set(opId,'unknown');throw e;}});}
 async inspect(operationId:string):Promise<{status:'committed';value:unknown}|{status:'not-recorded'}>{return this.read(async()=>{const receipt=await this.db.receipts.get(operationId);if(!receipt)return {status:'not-recorded'} as const;const change=JSON.parse(receipt.payload) as AtomicChange;const i=this.grant.identity;if(change.storeId!==i.storeId||change.deviceId!==i.deviceId||change.deviceEpoch!==i.epoch||change.actorId!==i.actorId)throw new Error('Operasi bukan milik akses ini');
  const journal=await this.journal.get(operationId);if(!journal)throw new Error('Intent operasi tidak ditemukan');const intent=JSON.parse(journal.intent) as {kind?:string;input?:{orderId?:string;sessionId?:string}};
  const kinds:Record<string,string>={serve:'serving.serve','cancel-draft':'draft.cancel','cash-count-save':'cash-count.save','cash-count-revise':'cash-count.revise','cash-count-cancel':'cash-count.cancel','cash-count-close':'cash-count.close','payment-methods-set':'payment-methods.set','draft-noncash':'payment.draft-noncash','confirmed-noncash':'payment.confirmed-noncash','additions-cash':'payment.multi-batch-cash'};
  if(intent.kind&&kinds[intent.kind]&&(change.kind!==kinds[intent.kind]||change.targetId!==(intent.kind==='payment-methods-set'?i.storeId:intent.input?.orderId??intent.input?.sessionId)))throw new Error('Receipt tidak sesuai intent');
  if(intent.kind&&kinds[intent.kind]){const expected=intent.kind==='serve'?{...intent.input,reason:null}:intent.input;const actual=(change.payload as {data?:unknown}).data;if(canonical(expected)!==canonical(actual))throw new Error('Payload receipt tidak sesuai intent');}
  if(change.localSequence!==journal.sequence||((change.payload as {metadata?:{recordedAt?:string}}).metadata?.recordedAt)!==journal.recordedAt)throw new Error('Metadata receipt tidak sesuai intent');
  const result=change.result as {orderId?:string;sessionId?:string;id?:string;code?:string;displayNumber?:string;batchNumber?:number;revision?:number;sessionRevision?:number;countRevision?:number;methods?:PaymentMethods;payment?:Payment;settlement?:unknown};return {status:'committed',value:{...('orderId'in result?{orderId:result.orderId}:{}),...('sessionId'in result?{sessionId:result.sessionId}:{}),...('id'in result?{id:result.id}:{}),...('code'in result?{code:result.code}:{}),...('displayNumber'in result?{displayNumber:result.displayNumber}:{}),...('batchNumber'in result?{batchNumber:result.batchNumber}:{}),...('revision'in result?{revision:result.revision}:{}),...('sessionRevision'in result?{sessionRevision:result.sessionRevision}:{}),...('countRevision'in result?{countRevision:result.countRevision}:{}),...('methods'in result?{methods:result.methods}:{}),...('payment'in result?{payment:result.payment}:{}),...('settlement'in result?{settlement:result.settlement}:{})}} as const;});}
 private async savedIntent<T>(opId:string,fresh:T):Promise<T>{const row=await this.journal.get(opId);return row?JSON.parse(row.intent) as T:fresh;}
 async pending():Promise<{operationId:string;kind:string}|null>{const row=await this.read(async()=>{const i=this.grant.identity,stream=this.journal.stream(i.storeId,i.deviceId,i.epoch);const pending=await this.journal.pending(stream);if(!pending.length)return null;const first=pending[0],intent=JSON.parse(first.intent) as Record<string,unknown>;return {operationId:first.id,kind:typeof intent.kind==='string'?intent.kind:'operasi lokal'};});if(!row)return null;const outcome=await this.inspect(row.operationId);if(outcome.status==='committed'){await this.journal.set(row.operationId,'committed',outcome.value);return null;}return row;}
 async retryPending():Promise<unknown>{const info=await this.pending();if(!info)throw new Error('Tidak ada operasi tertunda');const row=await this.journal.get(info.operationId);if(!row)throw new Error('Intent tidak ditemukan');const intent=JSON.parse(row.intent) as Record<string,unknown>;const opId=row.id;
  if(intent.kind==='payment-methods-set'||intent.kind==='draft-noncash'||intent.kind==='confirmed-noncash'||intent.kind==='additions-cash'){const p=intent as {kind:string;input:Record<string,unknown>};return this.run(intent,opId,op=>p.kind==='payment-methods-set'?this.payments.setMethods(this.grant.identity,p.input as unknown as PaymentMethodsInput,op):p.kind==='draft-noncash'?this.payments.payDraftNoncash(this.grant.identity,p.input as unknown as DraftNoncashInput,op):p.kind==='additions-cash'?this.payments.payAdditionsCash(this.grant.identity,p.input as unknown as AdditionsCashInput,op):this.payments.payNoncash(this.grant.identity,p.input as unknown as ConfirmedNoncashInput,op));}
  if(intent.kind==='confirm'||intent.kind==='draft-cash'||intent.kind==='confirmed-cash'){const p=intent as {kind:string;input:Record<string,unknown>};return this.run(intent,opId,op=>p.kind==='confirm'?this.drafts.confirmFirstBatch(this.grant.identity,p.input as unknown as import('../storage/confirm-first-batch').ConfirmFirstBatchInput,op):p.kind==='confirmed-cash'?this.payments.payCash(this.grant.identity,p.input as unknown as import('../storage/confirmed-cash-payment').ConfirmedCashPaymentInput,op):this.payments.payDraftCash(this.grant.identity,p.input as unknown as import('../storage/draft-cash-contract').DraftCashInput,op));}
  if(intent.kind==='serve'||intent.kind==='cancel-draft'||typeof intent.kind==='string'&&intent.kind.startsWith('cash-count-'))return this.run(intent,opId,op=>this.dispatchShift(intent as ShiftIntent,op));
  if('categoryId'in intent&&'menuId'in intent)return this.run(intent,opId,op=>this.catalog.createSimpleMenu(this.grant.identity,intent as unknown as import('../storage/simple-catalog').SimpleMenuInput,op));
  if('categoryId'in intent&&'name'in intent)return this.run(intent,opId,op=>this.catalog.createCategory(this.grant.identity,intent as unknown as import('../storage/simple-catalog').CategoryInput,op));
  if('openingAmount'in intent)return this.run(intent,opId,op=>this.cash.open(this.grant.identity,intent as unknown as import('../storage/cash-sessions').OpenCashInput,op));
  if('expectedDraftRevision'in intent)return this.run(intent,opId,op=>intent.expectedDraftRevision===null?this.drafts.createFromCatalog(this.grant.identity,intent as unknown as CatalogDraftInput,op):this.drafts.updateFromCatalog(this.grant.identity,intent as unknown as CatalogDraftInput,op));
  throw new Error('Jenis operasi tertunda tidak dikenal');
 }
 async category(name:string,revision:number|null,opId:string){const input=await this.savedIntent(opId,{categoryId:crypto.randomUUID(),name:name.trim(),expectedCatalogRevision:revision});return this.run(input,opId,op=>this.catalog.createCategory(this.grant.identity,input,op));}
 async menu(input:{name:string;categoryId:string;price:number;openingStock:number;minimum:number;expectedCatalogRevision:number|null},opId:string){const data=await this.savedIntent(opId,{...input,name:input.name.trim(),menuId:crypto.randomUUID(),skuId:crypto.randomUUID(),stockGroupId:crypto.randomUUID()});return this.run(data,opId,op=>this.catalog.createSimpleMenu(this.grant.identity,data,op));}
 async openCash(openingAmount:number,opId:string){const data=await this.savedIntent(opId,{sessionId:crypto.randomUUID(),number:`K-${Date.now()}`,initialCustodian:this.grant.identity.actorId,openingAmount,timeZone:this.grant.store.timeZone});return this.run(data,opId,op=>this.cash.open(this.grant.identity,data,op));}
 async saveDraft(input:CatalogDraftInput,opId:string){const data=await this.savedIntent(opId,input);return this.run(data,opId,op=>data.expectedDraftRevision===null?this.drafts.createFromCatalog(this.grant.identity,data,op):this.drafts.updateFromCatalog(this.grant.identity,data,op));}
 async setPaymentMethods(input:PaymentMethodsInput,opId:string){const intent={kind:'payment-methods-set' as const,input:{...input}};return this.run(intent,opId,op=>this.payments.setMethods(this.grant.identity,intent.input,op));}
 async payNoncash(order:SaleOrder,details:NoncashDetails,opId:string){
  order=structuredClone(order);details=structuredClone(details);
  if(order.readOnly||order.phase==='paid'||order.status.settlement!=='unpaid'||order.status.classification==='cancelled_without_settlement'||order.total<=0||!order.items.length||!order.items.some(x=>x.unitIds.length))throw new Error('Pesanan tidak dapat dibayar');
  if(details.verified!==true||!['qris','transfer','ewallet'].includes(details.method))throw new Error('Pembayaran belum diverifikasi');
  const note=details.note?.trim().slice(0,500)||null;
  const current=await this.view();if(!current.cash||current.cash.sessionId!==order.sessionId||current.cash.revision!==details.expectedSessionRevision||current.paymentMethods.revision!==details.expectedMethodsRevision)throw new Error('Sesi atau metode berubah. Periksa ulang pembayaran.');
  const latest=current.orders.find(x=>x.id===order.id);if(!latest||latest.revision!==order.revision||latest.batchRevision!==order.batchRevision||latest.total!==order.total||latest.phase!==order.phase)throw new Error('Pesanan berubah. Periksa ulang pembayaran.');
  let intent:{kind:'draft-noncash'|'confirmed-noncash';input:DraftNoncashInput|ConfirmedNoncashInput};
  const base={...details,note,orderId:order.id};
  if(order.phase==='draft'){
   const plan=await this.stock.planStoredDraftStock(this.grant.identity,{id:order.id});if(plan.status!=='ok')throw new Error('Stok tidak dapat direncanakan');
   intent={kind:'draft-noncash',input:{...base,expectedDraftRevision:order.revision,mappings:plan.value.sources.mappings,groups:plan.value.sources.groups}};
  }else if(order.phase==='confirmed'&&order.batchRevision!==null)intent={kind:'confirmed-noncash',input:{...base,expectedBatchRevision:order.batchRevision}};
  else throw new Error('Batch pesanan tidak tersedia');
  return this.run(intent,opId,op=>intent.kind==='draft-noncash'?this.payments.payDraftNoncash(this.grant.identity,intent.input as DraftNoncashInput,op):this.payments.payNoncash(this.grant.identity,intent.input as ConfirmedNoncashInput,op));
 }
 async pay(order:SaleOrder,received:number,later:boolean,opId:string){
  if(order.total<=0)throw new Error('Penyelesaian gratis belum terhubung');
  type Intent={kind:'confirm'|'draft-cash'|'confirmed-cash';input:Record<string,unknown>};
  let intent:Intent;const saved=await this.journal.get(opId);
  if(saved)intent=JSON.parse(saved.intent) as Intent;
  else {const cash=await this.view();if(!cash.cash)throw new Error('Kas belum dibuka');
   if(order.phase==='confirmed'){if(later)throw new Error('Sudah dikonfirmasi');intent={kind:'confirmed-cash',input:{orderId:order.id,expectedBatchRevision:0,expectedSessionRevision:cash.cash.revision,received}};}
   else {const plan=await this.stock.planStoredDraftStock(this.grant.identity,{id:order.id});if(plan.status!=='ok')throw new Error('Stok tidak dapat direncanakan');const sources=plan.value.sources;const base={orderId:order.id,expectedDraftRevision:order.revision,mappings:sources.mappings,groups:sources.groups};intent=later?{kind:'confirm',input:base}:{kind:'draft-cash',input:{...base,expectedSessionRevision:cash.cash.revision,received}};}
  }
  return this.run(intent,opId,op=>intent.kind==='confirm'?this.drafts.confirmFirstBatch(this.grant.identity,intent.input as unknown as import('../storage/confirm-first-batch').ConfirmFirstBatchInput,op):intent.kind==='confirmed-cash'?this.payments.payCash(this.grant.identity,intent.input as unknown as import('../storage/confirmed-cash-payment').ConfirmedCashPaymentInput,op):this.payments.payDraftCash(this.grant.identity,intent.input as unknown as import('../storage/draft-cash-contract').DraftCashInput,op));
 }
 async payAdditionsCash(order:SaleOrder,items:CatalogDraftInput['items'],received:number,opId:string){
  if(order.readOnly||order.phase!=='confirmed'||order.status.settlement!=='unpaid'||!items.length)throw new Error('Pesanan tidak dapat ditambah');
  const view=await this.view();if(!view.cash||view.cash.sessionId!==order.sessionId||view.catalog.revision===null)throw new Error('Sesi atau katalog berubah. Periksa ulang.');
  const current=view.orders.find(x=>x.id===order.id);if(!current||current.batchRevision!==order.batchRevision||current.servingRevision!==order.servingRevision||current.phase!==order.phase)throw new Error('Pesanan berubah. Periksa ulang.');
  const intent={kind:'additions-cash' as const,input:{orderId:order.id,expectedBatchRevision:order.batchRevision!,expectedServingRevision:order.servingRevision,expectedSessionRevision:view.cash.revision,expectedCatalogRevision:view.catalog.revision,expectedTotal:order.total+items.reduce((n,i)=>n+i.expectedUnitPrice*i.unitIds.length,0),received,items}};
  return this.run(intent,opId,op=>this.payments.payAdditionsCash(this.grant.identity,intent.input,op));
 }
 private dispatchShift(intent:ShiftIntent,op:Op){const i=this.grant.identity;
  switch(intent.kind){
   case 'serve':return this.serving.serveUnits(i,intent.input,op);
   case 'cancel-draft':return this.drafts.cancelStoredDraft(i,intent.input,op);
   case 'cash-count-save':return this.cash.saveCount(i,intent.input,op);
   case 'cash-count-revise':return this.cash.reviseCount(i,intent.input,op);
   case 'cash-count-cancel':return this.cash.cancelCount(i,intent.input,op);
   case 'cash-count-close':return this.cash.close(i,intent.input,op);
  }
 }
 async serve(order:SaleOrder,unitIds:string[],opId:string){const allowed=new Set(order.items.flatMap(x=>x.units.filter(u=>u.status==='processed').map(u=>u.id)));if(!unitIds.length||new Set(unitIds).size!==unitIds.length||unitIds.some(id=>!allowed.has(id)))throw new Error('Pilihan penyajian tidak sah');const intent:ShiftIntent={kind:'serve',input:{orderId:order.id,expectedRevision:order.servingRevision,unitIds:[...unitIds]}};return this.run(intent,opId,op=>this.dispatchShift(intent,op));}
 async cancelDraft(order:SaleOrder,reason:string,opId:string){const trimmed=reason.trim();if(order.phase!=='draft'||!trimmed||trimmed.length>500)throw new Error('Alasan pembatalan wajib, maksimal 500 karakter');const intent:ShiftIntent={kind:'cancel-draft',input:{orderId:order.id,expectedRevision:order.revision,reason:trimmed}};return this.run(intent,opId,op=>this.dispatchShift(intent,op));}
 async count(sessionId:string){const r=await this.cash.count(this.grant.identity,sessionId);if(r.status!=='ok')throw new Error('Konteks hitungan tidak dapat dibaca');return r.value;}
 async cashCount(kind:'cash-count-save'|'cash-count-revise'|'cash-count-cancel'|'cash-count-close',input:CountBaseInput & {amount?:number;reason?:string},opId:string){const intent={kind,input} as ShiftIntent;return this.run(intent,opId,op=>this.dispatchShift(intent,op));}
}

type ShiftIntent=
 |{kind:'serve';input:{orderId:string;expectedRevision:number|null;unitIds:string[]}}
 |{kind:'cancel-draft';input:{orderId:string;expectedRevision:number;reason:string}}
 |{kind:'cash-count-save'|'cash-count-revise';input:CountAmountInput}
 |{kind:'cash-count-cancel'|'cash-count-close';input:CountBaseInput & {reason?:string}};
