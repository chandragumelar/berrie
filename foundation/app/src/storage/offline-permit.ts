import { parsePolicy, policyHash, type PolicySnapshot } from '../domain/permission-policy';
import Dexie, { type Table } from 'dexie';
import { permitExpiry, verifyPermit, type PermitKeys, type SignedPermit } from '../domain/offline-permit';
import type { LockProvider } from './commit';
import type { PinIdentity } from './local-pin';

interface PermitRow { key:'permit'; permit:SignedPermit; policy?:PolicySnapshot; lastWall:number; clockFault:boolean }
class PermitDatabase extends Dexie {
 permits!:Table<PermitRow,string>;
 constructor(name:string) { super(name); this.version(1).stores({permits:'&key'}); }
}
/** Separate from both the business database and its checkpoint/staging. */
export class OfflinePermitStorage {
 private db:PermitDatabase;
 private keys:PermitKeys;
 private sample:{wall:number;mono:number}|null=null;
 private fault=false;
 constructor(readonly businessName:string,keys:PermitKeys,private locks:LockProvider=navigator.locks,private now:()=>number=Date.now,private monotonic:()=>number=()=>performance.now()) { this.keys=Object.freeze({...keys}); this.db=new PermitDatabase(`${businessName}-offline-permit-security`); }
 close():void { this.db.close(); }
 private time():number {
  const wall=this.now(), mono=this.monotonic();
  if(!Number.isSafeInteger(wall) || wall<0 || !Number.isFinite(mono) || mono<0) throw new Error('Waktu tidak sah');
  if(this.sample && (wall<this.sample.wall || mono<this.sample.mono || Math.abs((wall-this.sample.wall)-(mono-this.sample.mono))>2000)) this.fault=true;
  this.sample={wall,mono}; return wall;
 }
 private locked<T>(fn:()=>Promise<T>):Promise<T> {
  if(!this.locks || typeof this.locks.request!=='function') throw new Error('Penguncian tidak tersedia');
  return this.locks.request(`berrie-permit:${this.db.name}`,fn);
 }
 /** Internal integration boundary; acquire after the PIN lock and before the writer lock. */
 withAuthorizationLock<T>(fn:(read:(identity:PinIdentity)=>Promise<{permit:SignedPermit;policy?:PolicySnapshot;now:number;clockFault:boolean;assertTime:()=>number}>)=>Promise<T>):Promise<T> {
  return this.locked(()=>fn(async identity=>{
   const value=await this.readLocked({...identity});
   return {...value,assertTime:()=>{const now=this.time();if(this.fault || value.clockFault || now<value.now) throw new Error('Waktu memerlukan verifikasi online');return now;}};
  }));
 }
 private async checked(row:PermitRow, identity:PinIdentity):Promise<SignedPermit> {
  if(row.key!=='permit' || !Number.isSafeInteger(row.lastWall) || row.lastWall<0 || typeof row.clockFault!=='boolean') throw new Error('State permit rusak');
  const permit=await verifyPermit(row.permit,this.keys,identity);
  if(permit.payload.version===2) { const policy=parsePolicy(row.policy); if(policy.storeId!==permit.payload.storeId || policy.version!==permit.payload.policyVersion || await policyHash(policy)!==permit.payload.policyHash || !policy.actors.some(a=>a.id===permit.payload.actorId && a.role===permit.payload.role)) throw new Error('Pasangan kebijakan tidak cocok'); }
  else if(row.policy!==undefined) throw new Error('Pasangan kebijakan tidak sah');
  return permit;
 }
 /** Installs only a fresh signed response; a connection by itself changes nothing. */
 async install(input:unknown,identity:PinIdentity, snapshot?:unknown):Promise<void> {
  identity={...identity};
  const policy=snapshot===undefined?undefined:parsePolicy(snapshot);
  const candidate=await verifyPermit(input,this.keys,identity);
  if(candidate.payload.version===2) { if(!policy || policy.storeId!==candidate.payload.storeId || policy.version!==candidate.payload.policyVersion || await policyHash(policy)!==candidate.payload.policyHash || !policy.actors.some(a=>a.id===candidate.payload.actorId && a.role===candidate.payload.role)) throw new Error('Pasangan kebijakan tidak cocok'); } else if(policy) throw new Error('Permit lama tidak mendukung kebijakan');
  await this.locked(async()=>{
   const verified=await verifyPermit(candidate,this.keys,identity);
   const wall=this.time();
   const row=await this.db.permits.get('permit');
   const old=row ? await this.checked(row,{storeId:row.permit.payload.storeId,deviceId:row.permit.payload.deviceId,epoch:row.permit.payload.epoch,actorId:row.permit.payload.actorId}) : null;
   if(row && (this.fault || wall<row.lastWall)) {
    await this.db.transaction('rw',this.db.permits,async()=>{
     const current=await this.db.permits.get('permit');
     if(JSON.stringify(current)!==JSON.stringify(row)) throw new Error('Permit berubah');
     await this.db.permits.put({...row,lastWall:Math.max(wall,row.lastWall),clockFault:true});
    });
    throw new Error('Waktu memerlukan verifikasi online');
   }
   await this.db.transaction('rw',this.db.permits,async()=>{
    const current=await this.db.permits.get('permit');
    if(JSON.stringify(current)!==JSON.stringify(row)) throw new Error('Permit berubah');
    if(row) {
     if(!old || (old.payload.version===2 && (verified.payload.version!==2 || verified.payload.policyVersion!<old.payload.policyVersion! || (verified.payload.policyVersion===old.payload.policyVersion && verified.payload.policyHash!==old.payload.policyHash))) || old.payload.storeId!==verified.payload.storeId || old.payload.deviceId!==verified.payload.deviceId || old.payload.epoch>verified.payload.epoch || verified.payload.verifiedAt<old.payload.verifiedAt || (old.payload.epoch===verified.payload.epoch && verified.payload.sequence<=old.payload.sequence) || wall<row.lastWall || row.clockFault) throw new Error('Permit basi atau waktu memerlukan verifikasi');
    }
    if(this.fault || wall<verified.payload.verifiedAt || wall>=permitExpiry(verified.payload)) throw new Error('Waktu permit tidak sah');
    await this.db.permits.put({key:'permit',permit:verified,...(policy?{policy}:{}),lastWall:wall,clockFault:false});
   });
  });
 }
 async read(identity:PinIdentity):Promise<{permit:SignedPermit; policy?:PolicySnapshot; now:number; clockFault:boolean}> {
  identity={...identity};
  return this.locked(()=>this.readLocked(identity));
 }
 private async readLocked(identity:PinIdentity):Promise<{permit:SignedPermit; policy?:PolicySnapshot; now:number; clockFault:boolean}> {
   const row=await this.db.permits.get('permit'); if(!row) throw new Error('Permit tidak tersedia');
   const permit=await this.checked(row,identity), now=this.time();
   return this.db.transaction('rw',this.db.permits,async()=>{
    const current=await this.db.permits.get('permit');
    if(!current || JSON.stringify(current)!==JSON.stringify(row)) throw new Error('Permit berubah');
    const clockFault=row.clockFault || this.fault || now<row.lastWall || now<permit.payload.verifiedAt;
    await this.db.permits.put({...row,lastWall:Math.max(now,row.lastWall),clockFault});
    return {permit,...(row.policy?{policy:parsePolicy(row.policy)}:{}),now,clockFault};
   });
 }
}
