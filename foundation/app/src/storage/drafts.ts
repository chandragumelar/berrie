import { draftDateCode } from '../domain/draft';
import { createDraftRecord, validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { BerrieDatabase } from './database';
import { canonical, copyInput, withWriterTransaction, type AtomicChange, type LockProvider } from './commit';
import { requireOrderSession } from './order-session';
import { catalogKey } from './simple-catalog';
import { validateSimpleCatalog, type SimpleCatalog } from '../domain/simple-catalog';

export interface DraftMetadata { operationId:string; storeId:string; deviceId:string; deviceEpoch:number; localSequence:number; actorId:string; policyVersion:number; recordedAt:string; storeTimeZone:string }
export interface DraftResult { orderId:string; displayNumber:string; revision:number }
type DraftRecord=Extract<BusinessRecord,{recordType:'draft'}>;
const key=(id:string)=>`draft:${id}`;

function record(value:unknown):DraftRecord {
 validateBusinessRecord(value);
 if(!value || typeof value!=='object' || !('recordType' in value) || value.recordType!=='draft') throw new Error('Target bukan draft');
 return value as DraftRecord;
}
/** Internal only: metadata is not proof of authentication, policy or authorization. */
function save(db:BerrieDatabase, input:unknown, metadata:DraftMetadata, expectedRevision:number|null, locks:LockProvider = navigator.locks, now:()=>string=()=>new Date().toISOString(), catalogInput=false,guard?:()=>void):Promise<unknown> {
 // Freeze caller-owned objects before any asynchronous work, including the lock wait.
 const data=copyInput(input), meta=copyInput(metadata) as DraftMetadata;
 draftDateCode(meta.recordedAt,meta.storeTimeZone);
 if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Draft tidak sah');
 const fields=data as Record<string,unknown>;
 const normalized={...fields,externalOrderId:typeof fields.externalOrderId==='string'?fields.externalOrderId.trim():fields.externalOrderId};
 // Validate before acquiring the lock; create's number is allocated inside the transaction.
 const candidate=catalogInput?null:createDraftRecord({...normalized,displayNumber:expectedRevision===null?`000101-E${meta.deviceEpoch}-0001`:fields.displayNumber,savedAt:meta.recordedAt});
 if(candidate)candidate.schemaVersion=2;
 const intent={data,metadata:meta,expectedRevision};canonical(intent);
 return withWriterTransaction(db,locks,async commit=>{
  const existing=await db.receipts.get(meta.operationId);
  if(existing) {
   const change=JSON.parse(existing.payload) as AtomicChange;
   const payload=change.payload as typeof intent & {contractVersion?:number;sessionSource?:unknown};
   if((change.kind!=='draft.create' && change.kind!=='draft.update') || canonical({data:payload.data,metadata:payload.metadata,expectedRevision:payload.expectedRevision})!==canonical(intent)) throw new Error('Konflik operation ID');
   return existing.result;
  }
  let catalogSource:{revision:number;storeId:string}|undefined;
  let resolved=candidate;
  const row=await db.state.get(key(fields.orderId as string));
  if((row?.revision ?? null)!==expectedRevision) throw new Error('Revisi berubah');
  const previous=expectedRevision===null?null:record(row?.value);
  if(catalogInput){
   const cRow=await db.state.get(catalogKey(meta.storeId));const record=cRow?.value as {recordType?:string;catalog?:SimpleCatalog}|undefined;
   if(!cRow||record?.recordType!=='simple-catalog'||!record.catalog)throw new Error('Katalog tidak ditemukan');
   validateSimpleCatalog(record.catalog);
   if(cRow.revision!==fields.expectedCatalogRevision)throw new Error('Revisi katalog berubah');
   const c=record.catalog;
   if(!Array.isArray(fields.items))throw new Error('Item tidak sah');
   const items=fields.items.map((item:unknown)=>{const i=item as {itemId:string;skuId:string;expectedUnitPrice:number;unitIds:string[];serving:'dine_in'|'takeaway';note:string};const menu=c.menus.find(m=>m.skuId===i.skuId&&m.active);if(!menu||menu.price!==i.expectedUnitPrice)throw new Error('Harga atau SKU berubah');return {id:i.itemId,skuId:i.skuId,unitIds:i.unitIds,name:menu.name,skuPrice:menu.price,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:i.serving,note:i.note};});
   resolved=createDraftRecord({orderId:fields.orderId,displayNumber:expectedRevision===null?`000101-E${meta.deviceEpoch}-0001`:previous?.draft.displayNumber,cashSessionId:fields.cashSessionId,customer:fields.customer,channel:'store',channelAccountId:'',externalOrderId:'',serving:fields.serving,note:fields.note,items,discount:{kind:'none'},taxBp:0,serviceBp:0,savedAt:meta.recordedAt});resolved.schemaVersion=2;
   catalogSource={revision:cRow.revision,storeId:meta.storeId};
  }
  if(!resolved)throw new Error('Draft tidak sah');
  if(await db.state.get(`draft-cancellation:${resolved.draft.orderId}`)) throw new Error('Draft sudah dibatalkan');
  if(catalogInput && await db.state.get(`first-batch:${resolved.draft.orderId}`)) throw new Error('Draft sudah dikonfirmasi');
  const committedAt=now();const day=draftDateCode(committedAt,meta.storeTimeZone);resolved.draft.savedAt=committedAt;
  if(previous && (previous.draft.orderId!==resolved.draft.orderId || previous.draft.displayNumber!==resolved.draft.displayNumber || previous.draft.cashSessionId!==resolved.draft.cashSessionId)) throw new Error('Identitas draft berubah');
  const sessionSource=await requireOrderSession(db,meta.storeId,previous?.draft.cashSessionId ?? resolved.draft.cashSessionId);
  if(expectedRevision===null) {
   const prefix=`${day}-E${meta.deviceEpoch}-`;let maximum=0;
   for(const receipt of await db.receipts.toArray()) {
    const change=JSON.parse(receipt.payload) as AtomicChange;
    if(change.storeId!==meta.storeId) continue;
    for(const state of change.state) {
     const v=state.value;
     if(v && typeof v==='object' && 'recordType' in v && v.recordType==='draft') {
      const d=record(v).draft;
      if(d.displayNumber.startsWith(prefix)) {const n=Number(d.displayNumber.slice(prefix.length));if(Number.isSafeInteger(n)) maximum=Math.max(maximum,n);}
     }
    }
   }
   if(!Number.isSafeInteger(maximum+1)) throw new Error('Nomor pesanan melampaui batas');
   resolved.draft.displayNumber=prefix+String(maximum+1).padStart(4,'0');
  }
  const operationId=meta.operationId;const result:DraftResult={orderId:resolved.draft.orderId,displayNumber:resolved.draft.displayNumber,revision:expectedRevision===null?0:expectedRevision+1};
  const change:AtomicChange={operationId,storeId:meta.storeId,deviceId:meta.deviceId,deviceEpoch:meta.deviceEpoch,localSequence:meta.localSequence,actorId:meta.actorId,policyVersion:meta.policyVersion,kind:expectedRevision===null?'draft.create':'draft.update',targetId:resolved.draft.orderId,payload:{...intent,contractVersion:2,sessionSource,...(catalogSource?{catalogSource}: {})},state:[{key:key(resolved.draft.orderId),expectedRevision,value:resolved}],ledger:[],audit:[{id:`draft-audit:${operationId}`,operationId,value:{action:expectedRevision===null?'create':'update',orderId:resolved.draft.orderId,actorId:meta.actorId,policyVersion:meta.policyVersion,occurredAt:meta.recordedAt,recordedAt:committedAt,before:previous?.draft ?? null,after:resolved.draft}}],outbox:{id:`draft-outbox:${operationId}`,operationId,value:{orderId:resolved.draft.orderId}},result};
  return commit(change);
 },guard);
}
export function createDraft(db:BerrieDatabase,data:unknown,metadata:DraftMetadata,locks?:LockProvider,now?:()=>string):Promise<unknown> {return save(db,data,metadata,null,locks,now);}
export function updateDraft(db:BerrieDatabase,data:unknown,metadata:DraftMetadata,expectedRevision:number,locks?:LockProvider,now?:()=>string):Promise<unknown> {if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0) throw new Error('Revisi tidak sah');return save(db,data,metadata,expectedRevision,locks,now);}
export function saveDraftFromCatalog(db:BerrieDatabase,data:unknown,metadata:DraftMetadata,expectedRevision:number|null,locks:LockProvider=navigator.locks,guard?:()=>void):Promise<unknown>{return save(db,data,metadata,expectedRevision,locks,undefined,true,guard);}
export async function readDraft(db:BerrieDatabase,orderId:string):Promise<{draft:DraftRecord['draft'];revision:number}|undefined> {
 if(typeof orderId!=='string'||!orderId.trim()) throw new Error('ID tidak sah');return db.transaction('r',db.state,async()=>{if(await db.state.get(`draft-cancellation:${orderId}`)) throw new Error('Draft sudah dibatalkan');if(await db.state.get(`first-batch:${orderId}`)) throw new Error('Draft sudah dikonfirmasi');const row=await db.state.get(key(orderId));if(!row)return undefined;const found=record(row.value);if(found.draft.orderId!==orderId) throw new Error('Identitas draft tidak sesuai');return {draft:found.draft,revision:row.revision};});
}
