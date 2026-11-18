import { permitExpiry } from '../domain/offline-permit';
import { canonical, copyInput, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { checkpoint } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
import { createCategory, createSimpleMenu, readSimpleCatalog, validateCategoryInput, validateMenuInput, type CategoryInput, type SimpleMenuInput } from './simple-catalog';
import type { StockMetadata } from './stock-groups';

export interface CatalogOperation {operationId:string;localSequence:number;recordedAt:string}
const direct:LockProvider={request:async(_name,fn)=>fn()};
const exact=(v:unknown,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export class AuthorizedCatalog {
 constructor(private db:BerrieDatabase,private pin:LocalPinSecurity,private permits:OfflinePermitStorage,private locks:LockProvider=navigator.locks){}
 private async execute<T>(identity:PinIdentity,mutation:boolean,work:(meta:Omit<StockMetadata,'operationId'|'localSequence'|'recordedAt'>,guard:()=>void)=>Promise<T>):Promise<{status:'denied'}|{status:'ok';value:T}> {
  try {const captured=this.pin.captureIdentity(identity);if(this.db.name!==this.pin.businessName||this.db.name!==this.permits.businessName||!this.locks?.request)return {status:'denied'};
   const first=await this.permits.read(identity);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    captured();const pinGuard=await checkPin(identity),current=await readPermit(identity);
    if(canonical(first.permit)!==canonical(current.permit)||canonical(first.policy??null)!==canonical(current.policy??null)||current.clockFault||current.permit.payload.version!==2||!current.policy)return {status:'denied'} as const;
    const p=current.permit.payload,actor=current.policy.actors.find(a=>a.id===p.actorId);
    if(!actor?.active||actor.role!=='owner'||p.role!=='owner'||current.policy.version!==p.policyVersion)return {status:'denied'} as const;
    const guard=()=>{captured();pinGuard();const now=current.assertTime();if(mutation&&now>=permitExpiry(p))throw new Error('Izin kedaluwarsa');};guard();
    const value=await work({storeId:p.storeId,deviceId:p.deviceId,deviceEpoch:p.epoch,actorId:p.actorId,policyVersion:p.policyVersion},guard);
    const finalPin=await checkPin(identity),finalPermit=await readPermit(identity);if(finalPermit.clockFault||canonical(current.permit)!==canonical(finalPermit.permit)||canonical(current.policy)!==canonical(finalPermit.policy??null))return {status:'denied'} as const;
    guard();finalPin();return {status:'ok',value} as const;
   })));
  } catch {try{await this.pin.checkIdentity(identity);}catch{/* fail closed */}try{await this.permits.read(identity);}catch{/* fail closed */}return {status:'denied'};}
 }
 list(identityInput:PinIdentity){try{const identity=copyInput(identityInput) as PinIdentity;canonical(identity);if(!exact(identity,['storeId','deviceId','epoch','actorId']))throw Error();return this.execute(identity,false,async meta=>{validateCheckpoint(await checkpoint(this.db));const {catalog,revision}=await readSimpleCatalog(this.db,meta.storeId);return {categories:catalog.categories,menus:catalog.menus,revision:revision<0?null:revision};});}catch{return Promise.resolve({status:'denied'} as const);}}
 private mutation(identityInput:PinIdentity,input:CategoryInput|SimpleMenuInput,operation:CatalogOperation,menu:boolean){try{const identity=copyInput(identityInput) as PinIdentity,data=copyInput(input) as CategoryInput|SimpleMenuInput,op=copyInput(operation) as CatalogOperation;canonical({identity,data,op});if(!exact(identity,['storeId','deviceId','epoch','actorId'])||!exact(op,['operationId','localSequence','recordedAt'])||typeof op.operationId!=='string'||!op.operationId.trim()||!Number.isSafeInteger(op.localSequence)||op.localSequence<1||typeof op.recordedAt!=='string'||!Number.isFinite(Date.parse(op.recordedAt)))throw Error();if(menu)validateMenuInput(data);else validateCategoryInput(data);return this.execute(identity,true,async(meta,guard)=>{validateCheckpoint(await checkpoint(this.db));const full={...meta,...op};const value=menu?await createSimpleMenu(this.db,data as SimpleMenuInput,full,direct,guard):await createCategory(this.db,data as CategoryInput,full,direct,guard);return value as {id:string;code?:string;revision:number};});}catch{return Promise.resolve({status:'denied'} as const);}}
 createCategory(identity:PinIdentity,input:CategoryInput,operation:CatalogOperation){return this.mutation(identity,input,operation,false);}
 createSimpleMenu(identity:PinIdentity,input:SimpleMenuInput,operation:CatalogOperation){return this.mutation(identity,input,operation,true);}
}
