import Dexie, { type Table } from 'dexie';
import type { AccessGrant } from './contracts';

export type AccessIntent =
 | { action:'activate'; operationId:string; deviceId:string; storeName:string; timeZone:'Asia/Jakarta'|'Asia/Makassar'|'Asia/Jayapura' }
 | { action:'refresh'; operationId:string; deviceId:string; storeId:string };
export interface Enrollment {
 ownerUserId:string;
 deviceId:string;
 bindingSecret:string;
 pending:AccessIntent|null;
 grant:AccessGrant|null;
 stage:'new'|'grant-received'|'complete';
 explicitSignedOut:boolean;
 blockedReason:string|null;
}
class AccessDatabase extends Dexie {
 enrollments!:Table<Enrollment,string>;
 constructor(name:string) { super(name); this.version(1).stores({enrollments:'&ownerUserId'}); }
}
const isUuid=(v:unknown):v is string=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function token():string {
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function validateIntent(intent:AccessIntent, deviceId:string):void {
 if(!intent || !isUuid(intent.operationId) || intent.deviceId!==deviceId) throw new Error('Intent akses tidak sah');
 if(intent.action==='activate') {
  if(Object.keys(intent).sort().join(',')!=='action,deviceId,operationId,storeName,timeZone' || typeof intent.storeName!=='string' || intent.storeName!==intent.storeName.trim() || intent.storeName.length<1 || intent.storeName.length>80 || !['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'].includes(intent.timeZone)) throw new Error('Intent akses tidak sah');
 } else if(intent.action==='refresh') {
  if(Object.keys(intent).sort().join(',')!=='action,deviceId,operationId,storeId' || !isUuid(intent.storeId)) throw new Error('Intent akses tidak sah');
 } else throw new Error('Intent akses tidak sah');
}
/** Access credentials are separate from business, PIN and permit databases. */
export class EnrollmentStore {
 private readonly db:AccessDatabase;
 constructor(name='berrie-access-enrollment') { this.db=new AccessDatabase(name); }
 close():void { this.db.close(); }
 async resumable():Promise<Enrollment[]> { return (await this.db.enrollments.toArray()).filter(row=>!row.explicitSignedOut && !row.blockedReason && !!row.grant); }
 async get(ownerUserId:string):Promise<Enrollment|undefined> {
  if(!isUuid(ownerUserId)) throw new Error('Identitas owner tidak sah');
  return this.db.enrollments.get(ownerUserId);
 }
 /** Creates credentials once per owner, atomically even across tabs. */
 async getOrCreate(ownerUserId:string):Promise<Enrollment> {
  if(!isUuid(ownerUserId)) throw new Error('Identitas owner tidak sah');
  return this.db.transaction('rw',this.db.enrollments,async()=>{
   const existing=await this.db.enrollments.get(ownerUserId);
   if(existing) return existing;
   const enrollment:Enrollment={ownerUserId,deviceId:crypto.randomUUID(),bindingSecret:token(),pending:null,grant:null,stage:'new',explicitSignedOut:false,blockedReason:null};
   await this.db.enrollments.add(enrollment); return enrollment;
  });
 }
 /** Reusing the pending intent prevents a timeout or double click from issuing a new operation. */
 async begin(ownerUserId:string,intent:AccessIntent):Promise<AccessIntent> {
  return this.db.transaction('rw',this.db.enrollments,async()=>{
   const row=await this.db.enrollments.get(ownerUserId); if(!row) throw new Error('Enrollment tidak tersedia');
   validateIntent(intent,row.deviceId);
   if(row.pending) {
    if(row.pending.action!==intent.action || row.pending.operationId!==intent.operationId || row.pending.deviceId!==intent.deviceId || (row.pending.action==='activate' && intent.action==='activate' && (row.pending.storeName!==intent.storeName || row.pending.timeZone!==intent.timeZone)) || (row.pending.action==='refresh' && intent.action==='refresh' && row.pending.storeId!==intent.storeId)) throw new Error('Operasi akses masih menunggu');
    return row.pending;
   }
   await this.db.enrollments.put({...row,pending:intent}); return intent;
  });
 }
 /** Call only after parsing and cryptographically verifying the response. */
 async saveGrant(ownerUserId:string,operationId:string,grant:AccessGrant):Promise<void> {
  await this.db.transaction('rw',this.db.enrollments,async()=>{
   const row=await this.db.enrollments.get(ownerUserId);
   if(!row?.pending || row.pending.operationId!==operationId || grant.identity.actorId!==ownerUserId || grant.identity.deviceId!==row.deviceId || (row.pending.action==='refresh' && row.pending.storeId!==grant.identity.storeId)) throw new Error('Grant tidak cocok dengan operasi');
   if(row.grant && row.stage==='grant-received' && JSON.stringify(row.grant)!==JSON.stringify(grant)) throw new Error('Grant berubah');
   await this.db.enrollments.put({...row,grant,stage:'grant-received'});
  });
 }
 async complete(ownerUserId:string,grantId:string):Promise<void> {
  await this.db.transaction('rw',this.db.enrollments,async()=>{
   const row=await this.db.enrollments.get(ownerUserId);
   if(!row?.grant || row.grant.grantId!==grantId || row.stage!=='grant-received') throw new Error('Grant belum siap');
   await this.db.enrollments.put({...row,pending:null,stage:'complete'});
  });
 }
 async setAccessState(ownerUserId:string, update:{explicitSignedOut?:boolean;blockedReason?:string|null}):Promise<void> {
  await this.db.transaction('rw',this.db.enrollments,async()=>{
   const row=await this.db.enrollments.get(ownerUserId); if(!row) throw new Error('Enrollment tidak tersedia');
   if(update.blockedReason!==undefined && update.blockedReason!==null && !['forbidden','device_conflict'].includes(update.blockedReason)) throw new Error('Alasan blokir tidak sah');
   await this.db.enrollments.put({...row,...update});
  });
 }
}
