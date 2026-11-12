import { permitExpiry } from '../domain/offline-permit';
import { canonical, copyInput, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { createStockGroup, correctStockBaseline, setStockMinimum } from './stock-groups';
import { registerSkuStockMapping, readSkuStockMapping } from './sku-stock-mappings';
import { planStoredDraftStock } from './draft-stock';

type Opening={groupId:string;balance:number;minimum?:number};
type Correction={groupId:string;value:number;reason:string;expectedRevision:number;expectedBalance:number};
type Minimum=Omit<Correction,'reason'>;
export interface StockOperation {operationId:string;localSequence:number;recordedAt:string}
type Result={status:'denied'}|{status:'approval-required'}|{status:'ok';groupId:string;revision:number};
type Mapping={skuId:string;groupId:string};
type Action='opening'|'correction'|'minimum'|'mapping';
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(v:unknown,keys:string[])=>!!v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const id=(v:unknown)=>typeof v==='string' && v.trim().length>0 && v.length<=200;
const integer=(v:unknown,min=0)=>typeof v==='number' && Number.isSafeInteger(v) && v>=min;

/** Internal boundary; stock primitives are not an alternative authorization path. */
export class AuthorizedStock {
 constructor(private db:BerrieDatabase,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private locks:LockProvider=navigator.locks) {}
 private mutate(identity:PinIdentity,action:Action,input:Opening|Correction|Minimum|Mapping,operation:StockOperation):Promise<Result> {
  let i:PinIdentity,d:Opening|Correction|Minimum|Mapping,o:StockOperation;
  try {
   i=copyInput(identity) as PinIdentity;d=copyInput(input) as Opening|Correction|Minimum|Mapping;o=copyInput(operation) as StockOperation;
   canonical({i,d,o});
   if(!exact(i,['storeId','deviceId','epoch','actorId']) || ![i.storeId,i.deviceId,i.actorId].every(id) || !integer(i.epoch,1) || !exact(o,['operationId','localSequence','recordedAt']) || !id(o.operationId) || !integer(o.localSequence,1) || typeof o.recordedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(o.recordedAt) || !Number.isFinite(Date.parse(o.recordedAt))) throw new Error('Input tidak sah');
   if(!id(d.groupId)) throw new Error('ID grup tidak sah');
   if(action==='mapping') {
    const x=d as Mapping;if(!exact(x,['skuId','groupId']) || !id(x.skuId)) throw new Error('Input tidak sah');
   } else if(action==='opening') {
    const x=d as Opening;
    if(!(exact(x,['groupId','balance']) || exact(x,['groupId','balance','minimum'])) || !integer(x.balance) || ('minimum' in x && !integer(x.minimum))) throw new Error('Input tidak sah');
   } else {
    const x=d as Correction;
    if(!exact(x,action==='correction'?['groupId','value','reason','expectedRevision','expectedBalance']:['groupId','value','expectedRevision','expectedBalance']) || !integer(x.value) || !integer(x.expectedRevision) || x.expectedRevision===Number.MAX_SAFE_INTEGER || !integer(x.expectedBalance) || (action==='correction' && (typeof x.reason!=='string' || !x.reason.trim()))) throw new Error('Input tidak sah');
   }
  } catch {return Promise.resolve({status:'denied'});}
  return this.execute(i,action,d,o);
 }
 private async execute(identity:PinIdentity,action:Action,data:Opening|Correction|Minimum|Mapping,operation:StockOperation):Promise<Result> {
  try {
   const captured=this.pin.captureIdentity(identity);
   if(this.db.name!==this.pin.businessName || this.db.name!==this.permits.businessName || !this.locks || typeof this.locks.request!=='function') return {status:'denied'};
   const first=await this.permits.read(identity);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    captured();
    const pinGuard=await checkPin(identity),current=await readPermit(identity);
    if(canonical(first.permit)!==canonical(current.permit) || canonical(first.policy ?? null)!==canonical(current.policy ?? null) || current.clockFault || current.permit.payload.version!==2 || !current.policy) return {status:'denied'} as const;
    const p=current.permit.payload,actor=current.policy.actors.find(a=>a.id===identity.actorId);
    if(!actor || !actor.active || actor.role!==p.role || current.policy.version!==p.policyVersion) return {status:'denied'} as const;
    const guard=()=>{captured();pinGuard();if(current.assertTime()>=permitExpiry(p)) throw new Error('Permit kedaluwarsa');};
    guard();
    if(actor.role==='staff') {
     if(action!=='correction') return {status:'denied'} as const;
     const mode=current.policy.matrix['stock-correction'];
     if(mode==='approval') return {status:'approval-required'} as const;
     if(mode!=='allow') return {status:'denied'} as const;
    }
    const meta={...operation,storeId:p.storeId,deviceId:p.deviceId,deviceEpoch:p.epoch,actorId:p.actorId,policyVersion:current.policy.version};
    const result=await (action==='mapping'?registerSkuStockMapping(this.db,data,meta,direct,undefined,guard):action==='opening'?createStockGroup(this.db,data as Opening,meta,direct,undefined,guard):action==='correction'?correctStockBaseline(this.db,data as Correction,meta,direct,undefined,guard):setStockMinimum(this.db,data as Minimum,meta,direct,undefined,guard)) as {groupId:string;revision:number};
    return {status:'ok',groupId:action==='mapping'?(data as Mapping).groupId:result.groupId,revision:result.revision} as const;
   })));
  } catch {
   try {await this.pin.checkIdentity(identity);} catch { /* fail closed */ }
   try {await this.permits.read(identity);} catch { /* persist clock fault */ }
   return {status:'denied'};
  }
 }
 registerSkuStockMapping(identity:PinIdentity,input:Mapping,operation:StockOperation) {return this.mutate(identity,'mapping',input,operation);}
 private read<T>(identity:PinIdentity,input:unknown,kind:'mapping'|'draft',work:(storeId:string,id:string)=>Promise<T>):Promise<{status:'denied'}|{status:'ok';value:T}> {
  let i:PinIdentity, v:{id:string};
  try {i=copyInput(identity) as PinIdentity;v=copyInput(input) as {id:string};canonical({i,v});
   if(!exact(i,['storeId','deviceId','epoch','actorId']) || ![i.storeId,i.deviceId,i.actorId].every(id) || !integer(i.epoch,1) || !exact(v,['id']) || !id(v.id)) throw new Error('Input tidak sah');
  } catch {return Promise.resolve({status:'denied'});}
  return this.executeRead(i,v.id,kind,work);
 }
 private async executeRead<T>(identity:PinIdentity,key:string,kind:'mapping'|'draft',work:(storeId:string,id:string)=>Promise<T>):Promise<{status:'denied'}|{status:'ok';value:T}> {
  try {
   const captured=this.pin.captureIdentity(identity);
   if(this.db.name!==this.pin.businessName || this.db.name!==this.permits.businessName || !this.locks || typeof this.locks.request!=='function') return {status:'denied'};
   const first=await this.permits.read(identity);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    captured();const pinGuard=await checkPin(identity),current=await readPermit(identity);
    if(canonical(first.permit)!==canonical(current.permit) || canonical(first.policy ?? null)!==canonical(current.policy ?? null) || current.clockFault || current.permit.payload.version!==2 || !current.policy) return {status:'denied'} as const;
    const p=current.permit.payload,actor=current.policy.actors.find(a=>a.id===identity.actorId);
    if(!actor || !actor.active || actor.role!==p.role || current.policy.version!==p.policyVersion || (kind==='mapping' && actor.role!=='owner')) return {status:'denied'} as const;
    const guard=()=>{captured();pinGuard();const now=current.assertTime();if(kind==='draft' && now>=permitExpiry(p)) throw new Error('Permit kedaluwarsa');};
    guard();const value=await work(p.storeId,key);
    const finalPin=await checkPin(identity),finalPermit=await readPermit(identity);
    if(finalPermit.clockFault || canonical(current.permit)!==canonical(finalPermit.permit) || canonical(current.policy)!==canonical(finalPermit.policy ?? null)) return {status:'denied'} as const;
    guard();finalPin();const now=finalPermit.assertTime();if(kind==='draft' && now>=permitExpiry(p)) return {status:'denied'} as const;
    return {status:'ok',value} as const;
   })));
  } catch {try {await this.pin.checkIdentity(identity);} catch { /* fail closed */ } try {await this.permits.read(identity);} catch { /* persist clock fault */ } return {status:'denied'};}
 }
 readSkuStockMapping(identity:PinIdentity,input:{id:string}) {return this.read(identity,input,'mapping',(storeId,skuId)=>readSkuStockMapping(this.db,storeId,skuId));}
 planStoredDraftStock(identity:PinIdentity,input:{id:string}) {return this.read(identity,input,'draft',(storeId,orderId)=>planStoredDraftStock(this.db,storeId,orderId));}

 createStockGroup(identity:PinIdentity,input:Opening,operation:StockOperation) {return this.mutate(identity,'opening',input,operation);}
 correctStockBaseline(identity:PinIdentity,input:Correction,operation:StockOperation) {return this.mutate(identity,'correction',input,operation);}
 setStockMinimum(identity:PinIdentity,input:Minimum,operation:StockOperation) {return this.mutate(identity,'minimum',input,operation);}
}
