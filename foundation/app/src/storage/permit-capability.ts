import { permitExpiry } from '../domain/offline-permit';
import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { checkpoint, type Snapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import type { BerrieDatabase } from './database';
import { canonical, type AtomicChange } from './commit';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';

export type Capability = 'new-order'|'new-addition'|'catalog'|'stock-general'|'complete-unit'|'stock-for-unit'|'cash-support'|'read'|'export'|'backup'|'restore';
export interface PermitDecision { status:'normal'|'limited'|'online-required'; expiresAt:number; remainingMs:number; warning:'48h'|'24h'|null; allowed:boolean }
const ownerOnly=new Set<Capability>(['catalog','export','backup','restore']);
const limited=new Set<Capability>(['complete-unit','stock-for-unit','cash-support','read','export','backup','restore']);
const all=new Set<Capability>(['new-order','new-addition','catalog','stock-general',...limited]);

/** Internal decision only. It does not authorize or execute a business mutation. */
export async function evaluatePermit(storage:OfflinePermitStorage,pin:LocalPinSecurity,identity:PinIdentity,db:BerrieDatabase,capability:Capability,unit?:{orderId:string;unitId:string}):Promise<PermitDecision> {
 identity={...identity}; unit=unit && {...unit};
 if(db.name!==storage.businessName || pin.businessName!==storage.businessName || !all.has(capability)) throw new Error('Cakupan tidak sah');
 const first=await storage.read(identity);
 const session=await pin.checkIdentity(identity);
 const {permit,now,clockFault}=await storage.read(identity);
 if(canonical(first.permit)!==canonical(permit)) throw new Error('Permit berubah selama pemeriksaan');
 const expiresAt=permitExpiry(permit.payload), remainingMs=Math.max(0,expiresAt-now);
 const status=clockFault?'online-required':remainingMs===0?'limited':'normal';
 const warning=status!=='normal'?null:remainingMs<=86400000?'24h':remainingMs<=172800000?'48h':null;
 let allowed=session && status!=='online-required' && (!ownerOnly.has(capability) || permit.payload.role==='owner');
 if(status==='limited') {
  allowed=allowed && permit.payload.role==='owner' && limited.has(capability);
  if(allowed && (capability==='complete-unit' || capability==='stock-for-unit')) {
   allowed=!!unit && await storedUnitBefore(db,identity.storeId,unit,expiresAt);
   if(allowed) {
    const final=await storage.read(identity);
    allowed=!final.clockFault && canonical(final.permit)===canonical(permit) && await pin.checkIdentity(identity);
   }
  }
 }
 return {status,expiresAt,remainingMs,warning,allowed};
}

async function storedUnitBefore(db:BerrieDatabase,storeId:string,unit:{orderId:string;unitId:string},expiry:number):Promise<boolean> {
 return storedUnitBeforeSnapshot(validateCheckpoint(await checkpoint(db)),storeId,unit,expiry);
}
/** Caller must pass a validated, consistent checkpoint under the writer lock. */
export function storedUnitBeforeSnapshot(snapshot:Snapshot,storeId:string,unit:{orderId:string;unitId:string},expiry:number):boolean {
 if(!unit || typeof unit.orderId!=='string' || typeof unit.unitId!=='string') return false;
 const batch=snapshot.state.find(x=>x.key===`first-batch:${unit.orderId}`);
 const row=batch ?? snapshot.state.find(x=>x.key===`draft:${unit.orderId}`);
 if(!row) return false;
 validateBusinessRecord(row.value);
 const value=row.value as BusinessRecord;
 const draft=value.recordType==='first-batch' && value.batch.storeId===storeId ? value.batch.draft : value.recordType==='draft' ? value.draft : null;
 if(!draft || draft.orderId!==unit.orderId || !draft.items.some(i=>i.unitIds.includes(unit.unitId))) return false;
 // The current record must be backed by a receipt for this store, not a caller-supplied age.
 const changes=snapshot.receipts.map(receipt=>JSON.parse(receipt.payload) as AtomicChange).filter(change=>change.storeId===storeId);
 if(!changes.some(change=>change.state.some(s=>s.key===row.key && canonical(s.value)===canonical(row.value)))) return false;
 return changes.some(change=>change.state.some(s=>{
  if(s.key!==`draft:${unit.orderId}` && s.key!==`first-batch:${unit.orderId}`) return false;
  validateBusinessRecord(s.value);const record=s.value as BusinessRecord;
  const savedDraft=record.recordType==='draft'?record.draft:record.recordType==='first-batch' && record.batch.storeId===storeId?record.batch.draft:null;
  if(!savedDraft || savedDraft.orderId!==unit.orderId || !savedDraft.items.some(i=>i.unitIds.includes(unit.unitId))) return false;
  const saved=Date.parse(savedDraft.savedAt);return Number.isFinite(saved) && saved<expiry;
 }));
}
