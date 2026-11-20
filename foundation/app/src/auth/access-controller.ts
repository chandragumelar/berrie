import type { SupabaseClient } from '@supabase/supabase-js';
import { createPinVerifier, validPin } from '../domain/local-pin';
import { LocalPinSecurity } from '../storage/local-pin';
import { OfflinePermitStorage } from '../storage/offline-permit';
import { BerrieDatabase } from '../storage/database';
import { evaluatePermit, type PermitDecision } from '../storage/permit-capability';
import { PinActivity, observePinActivity } from '../storage/local-pin-activity';
import { AccessApi, AccessApiError } from './access-api';
import { clearLocalAuthSession } from './supabase-client';
import { parseAccessGrant, type AccessGrant } from './contracts';
import { EnrollmentStore, type Enrollment, type AccessIntent } from './enrollment-store';
import type { PermitKeys } from '../domain/offline-permit';
import { OwnerCashier } from '../application/owner-cashier';
import { OperationSync, type SyncStatus } from '../sync/operation-sync';

export type AccessScreen='config-error'|'signed-out'|'verify-email'|'store-setup'|'activating'|'pin-setup'|'locked'|'unlocked'|'limited'|'device-conflict'|'blocked';
export interface AccessState { screen:AccessScreen; error:string|null; busy:boolean; grant:AccessGrant|null; decision:PermitDecision|null; email:string; canRenew:boolean }
export class AccessController {
 state:AccessState={screen:'signed-out',error:null,busy:false,grant:null,decision:null,email:'',canRenew:false};
 private owner:string|null=null; private row:Enrollment|null=null; private security:LocalPinSecurity|null=null; private permits:OfflinePermitStorage|null=null; private business:BerrieDatabase|null=null; private cashierFacade:OwnerCashier|null=null; private syncFacade:OperationSync|null=null; private stopActivity:(()=>void)|null=null; private monitor:number|null=null;
 constructor(private client:SupabaseClient,private api:AccessApi,private keys:PermitKeys,private enrollments:EnrollmentStore,private notify:(s:AccessState)=>void,private syncUrl='',private publishableKey='') {}
 private set(change:Partial<AccessState>):void { this.state={...this.state,...change}; this.notify(this.state); }
 private disposeSecurity():void { this.cashierFacade?.invalidate();this.cashierFacade=null;this.syncFacade?.stop();this.syncFacade=null;this.stopActivity?.(); this.stopActivity=null; if(this.monitor!==null) window.clearInterval(this.monitor); this.monitor=null; this.security?.close(); this.permits?.close(); this.business?.close(); this.security=null;this.permits=null;this.business=null; }
 cashier():OwnerCashier {if(!this.cashierFacade||!this.state.grant||!['unlocked','limited'].includes(this.state.screen))throw new Error('Kasir terkunci');return this.cashierFacade;}
 async syncStatus():Promise<SyncStatus|null>{return this.syncFacade?this.syncFacade.status():null;}
 async syncNow():Promise<SyncStatus|null>{return this.syncFacade?this.syncFacade.flush():null;}
 private startSync():void {if(!this.business||!this.state.grant||!this.row)return;this.syncFacade?.stop();this.syncFacade=new OperationSync(this.business,this.state.grant,this.row.bindingSecret,this.client,this.syncUrl,this.publishableKey);void this.syncFacade.flush().catch(()=>{});}
 async offlineReady():Promise<boolean> {
  if(this.state.screen!=='unlocked'||!this.state.grant||!this.security||!this.permits||!this.business||!this.cashierFacade) return false;
  const decision=await evaluatePermit(this.permits,this.security,this.state.grant.identity,this.business,'read');
  if(!decision.allowed || decision.status!=='normal') return false;
  await this.cashierFacade.view();
  return true;
 }
 dispose():void { this.disposeSecurity();this.enrollments.close(); }
 private async openGrant(row:Enrollment):Promise<AccessGrant> {
  if(!row.grant) throw new Error('Grant belum tersedia');
  const grant=await parseAccessGrant(row.grant,{ownerId:row.ownerUserId,deviceId:row.deviceId},this.keys);
  this.disposeSecurity(); const name=`berrie-${grant.identity.storeId}`;
  this.security=new LocalPinSecurity(name);this.permits=new OfflinePermitStorage(name,this.keys);this.business=new BerrieDatabase(name);
  this.row=row;this.owner=row.ownerUserId;this.set({grant}); return grant;
 }
 private async installGrant(grant:AccessGrant):Promise<void> {
  if(!this.permits) throw new Error('Penyimpanan izin tidak tersedia');
  try {
   const current=await this.permits.read(grant.identity);
   if(JSON.stringify(current.permit)===JSON.stringify(grant.permit) && JSON.stringify(current.policy)===JSON.stringify(grant.policy)) return;
  } catch { /* install performs its own validation and refuses unsafe replacement */ }
  await this.permits.install(grant.permit,grant.identity,grant.policy);
 }
 async start():Promise<void> {
  try {
   const {data}=await this.client.auth.getSession(); const id=data.session?.user.id;
   let row=id?await this.enrollments.get(id):undefined;
   if(!row && !id) { const rows=await this.enrollments.resumable(); if(rows.length===1) row=rows[0]; }
   if(row && !row.explicitSignedOut && !row.blockedReason && row.grant) {
    const grant=await this.openGrant(row);
    if(row.stage==='grant-received') {
     try { await this.installGrant(grant); }
     catch { this.set({screen:'activating',error:'Izin belum tersimpan. Coba lagi.'});return; }
    }
    const has=await this.security!.hasVerifier(grant.identity);
    this.set({screen:has?'locked':'pin-setup'});return;
   }
   if(row?.explicitSignedOut) { this.set({screen:'signed-out'}); return; }
   if(id) { this.owner=id; await this.onlineBootstrap(); return; }
   this.set({screen:'signed-out'});
  } catch { this.set({screen:'blocked',error:'Data akses tidak dapat dibaca. Perlu pemeriksaan online.'}); }
 }
 async authenticate(email:string,password:string,signup:boolean):Promise<void> {
  this.set({busy:true,error:null,email});
  try {
   const result=signup?await this.client.auth.signUp({email,password}):await this.client.auth.signInWithPassword({email,password});
   if(result.error) throw result.error;
   if(!result.data.session) { this.set({screen:'verify-email'}); return; }
   this.owner=result.data.user?.id ?? null; if(!this.owner) throw new Error('Akun tidak tersedia');
   await this.onlineBootstrap();
  } catch(e) { this.set({error:e instanceof Error?e.message:'Masuk gagal'}); } finally { this.set({busy:false}); }
 }
 async onlineBootstrap():Promise<void> {
  if(!this.owner) { this.set({screen:'signed-out'});return; }
  const existing=await this.enrollments.get(this.owner);this.row=existing ?? null;
  let result;
  try { result=await this.api.bootstrap(existing?.deviceId ?? null,existing?.bindingSecret); }
  catch(e) { if(e instanceof AccessApiError && ['forbidden','device_conflict'].includes(e.code) && existing) { await this.handleError(e);return; } throw e; }
  if(result.ownerId!==this.owner) throw new Error('Identitas akun tidak cocok');
  if(!result.emailVerified) { this.set({screen:'verify-email'}); return; }
  if(result.activation==='other-device') { if(existing) await this.enrollments.setAccessState(this.owner,{blockedReason:'device_conflict'}); this.set({screen:'device-conflict'});return; }
  const row=await this.enrollments.getOrCreate(this.owner); this.row=row;
  if(row.blockedReason) { this.set({screen:'blocked',error:'Perangkat perlu dipulihkan.'});return; }
  if(row.explicitSignedOut) { await this.enrollments.setAccessState(this.owner,{explicitSignedOut:false}); this.row=(await this.enrollments.get(this.owner))!; }
  if(result.activation==='none') { this.set({screen:row.pending?'activating':'store-setup'}); return; }
  if(row.pending && !row.grant) { this.set({screen:'activating'});return; }
  if(row.grant) { const grant=await this.openGrant(this.row!); if(row.stage==='grant-received') await this.installGrant(grant); this.set({screen:await this.security!.hasVerifier(grant.identity)?'locked':'pin-setup'});return; }
  this.set({screen:'blocked',error:'Data akses perangkat tidak lengkap. Perlu pemulihan perangkat.'});
 }
 async activate(name:string,timeZone:'Asia/Jakarta'|'Asia/Makassar'|'Asia/Jayapura'):Promise<void> {
  if(!this.owner || !this.row) return;
  this.set({screen:'activating',busy:true,error:null});
  try {
   if(this.row.stage==='grant-received' && this.row.grant) {
    const grant=await this.openGrant(this.row);await this.installGrant(grant);
    this.set({screen:await this.security!.hasVerifier(grant.identity)?'locked':'pin-setup'});return;
   }
   const intent:AccessIntent=this.row.pending ?? {action:'activate',operationId:crypto.randomUUID(),deviceId:this.row.deviceId,storeName:name.trim(),timeZone};
   await this.enrollments.begin(this.owner,intent); this.row=(await this.enrollments.get(this.owner))!;
   const grant=await this.api.grant(intent,this.row.bindingSecret,this.owner);
   await this.enrollments.saveGrant(this.owner,intent.operationId,grant); this.row=(await this.enrollments.get(this.owner))!;
   await this.openGrant(this.row); await this.installGrant(grant);
   this.set({screen:await this.security!.hasVerifier(grant.identity)?'locked':'pin-setup'});
  } catch(e) { await this.handleError(e); } finally { this.set({busy:false}); }
 }
 private async handleError(e:unknown):Promise<void> {
  if(e instanceof AccessApiError && e.code==='grant_expired') { this.set({error:'Izin sebelumnya kedaluwarsa. Verifikasi online untuk meminta izin baru.',canRenew:true}); return; }
  if(e instanceof AccessApiError && ['forbidden','device_conflict'].includes(e.code) && this.owner && this.row) {
   await this.security?.lock(); await this.enrollments.setAccessState(this.owner,{blockedReason:e.code}); this.set({screen:e.code==='device_conflict'?'device-conflict':'blocked',error:'Perangkat tidak lagi diizinkan.'});return;
  }
  this.set({error:e instanceof AccessApiError && e.code==='network_error'?'Jaringan tidak tersedia. Coba lagi.':e instanceof Error?e.message:'Operasi gagal. Coba lagi.'});
 }
 async renewExpired():Promise<void> {
  if(!this.owner || !this.row?.pending) return;
  this.set({busy:true,error:null});
  try {
   const bootstrap=await this.api.bootstrap(this.row.deviceId,this.row.bindingSecret);
   if(bootstrap.ownerId!==this.owner || !bootstrap.emailVerified || bootstrap.activation!=='this-device' || !bootstrap.store) throw new AccessApiError('forbidden',403);
   const intent:AccessIntent={action:'refresh',operationId:crypto.randomUUID(),deviceId:this.row.deviceId,storeId:bootstrap.store.id};
   await this.enrollments.replaceExpired(this.owner,this.row.pending.operationId,intent);
   this.set({screen:'activating',canRenew:false});
   this.row=(await this.enrollments.get(this.owner))!;
   const grant=await this.api.grant(intent,this.row.bindingSecret,this.owner);
   await this.enrollments.saveGrant(this.owner,intent.operationId,grant); this.row=(await this.enrollments.get(this.owner))!;
   await this.openGrant(this.row); await this.installGrant(grant);
   this.set({screen:await this.security!.hasVerifier(grant.identity)?'locked':'pin-setup',canRenew:false});
  } catch(e) { await this.handleError(e); } finally { this.set({busy:false}); }
 }
 async setupPin(pin:string,confirm:string):Promise<void> {
  if(!this.security || !this.state.grant || !this.owner || !validPin(pin) || pin!==confirm) { this.set({error:'PIN harus enam digit dan konfirmasi harus sama.'}); return; }
  this.set({busy:true,error:null});
  try { await this.security.installVerifier(this.state.grant.identity,await createPinVerifier(pin),true); await this.unlock(pin); }
  catch(e) { if(await this.security.hasVerifier(this.state.grant.identity)) this.set({screen:'locked',error:'PIN sudah dibuat. Masukkan PIN untuk melanjutkan.'}); else this.set({error:e instanceof Error?e.message:'PIN gagal disimpan'}); }
  finally { this.set({busy:false}); }
 }
 async unlock(pin:string):Promise<void> {
  if(!this.security || !this.permits || !this.business || !this.state.grant || !this.owner || !this.row || this.row.explicitSignedOut || this.row.blockedReason) return;
  this.set({busy:true,error:null});
  try {
   const result=await this.security.unlock(this.state.grant.identity,pin);
   if(result!=='unlocked') { this.set({error:result==='incorrect'?'PIN salah.':result==='cooldown'?'Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.':'Perlu verifikasi online.'});return; }
   const decision=await evaluatePermit(this.permits,this.security,this.state.grant.identity,this.business,'read');
   if(!decision.allowed) { await this.security.lock(); this.set({screen:'locked',error:'Perlu verifikasi online.'});return; }
   if(this.row.stage==='grant-received') { await this.enrollments.complete(this.owner,this.state.grant.grantId);this.row=(await this.enrollments.get(this.owner))!; }
   this.set({screen:decision.status==='limited'?'limited':'unlocked',decision,error:null});
   this.cashierFacade?.invalidate();this.cashierFacade=new OwnerCashier(this.state.grant,this.security,this.permits,this.business);
   this.startSync();
   this.stopActivity?.(); this.stopActivity=observePinActivity(new PinActivity(this.security));
   if(this.monitor!==null) window.clearInterval(this.monitor);
   this.monitor=window.setInterval(()=>{void this.security?.check(true).then(ok=>{if(!ok){this.cashierFacade?.invalidate();this.cashierFacade=null;this.set({screen:'locked',decision:null});}}).catch(()=>{this.cashierFacade?.invalidate();this.cashierFacade=null;this.set({screen:'locked',decision:null});});},1000);
  } catch { await this.security.lock(); this.set({screen:'locked',error:'Izin atau PIN tidak dapat diperiksa.'}); } finally { this.set({busy:false}); }
 }
 async refresh():Promise<void> {
  if(!this.owner || !this.row || !this.state.grant || !this.security || !await this.security.checkIdentity(this.state.grant.identity)) return;
  this.set({busy:true,error:null});
  try {
   const intent:AccessIntent=this.row.pending ?? {action:'refresh',operationId:crypto.randomUUID(),deviceId:this.row.deviceId,storeId:this.state.grant.identity.storeId};
   if(intent.action!=='refresh') throw new Error('Operasi sebelumnya belum selesai');
   await this.enrollments.begin(this.owner,intent); this.row=(await this.enrollments.get(this.owner))!;
   const grant=await this.api.grant(intent,this.row.bindingSecret,this.owner);
   await this.enrollments.saveGrant(this.owner,intent.operationId,grant);this.row=(await this.enrollments.get(this.owner))!;
   await this.installGrant(grant); await this.enrollments.complete(this.owner,grant.grantId);this.row=(await this.enrollments.get(this.owner))!;
   const decision=await evaluatePermit(this.permits!,this.security,grant.identity,this.business!,'read');
   this.set({grant,decision,screen:decision.allowed?(decision.status==='limited'?'limited':'unlocked'):'locked'});
   this.startSync();
  } catch(e) { await this.handleError(e); } finally { this.set({busy:false}); }
 }
 async lock():Promise<void> { this.cashierFacade?.invalidate();this.cashierFacade=null;await this.security?.lock(); this.set({screen:'locked',decision:null,error:null}); }
 async signOut():Promise<void> {
  await this.security?.lock();
  if(this.owner && this.row) await this.enrollments.setAccessState(this.owner,{explicitSignedOut:true});
  this.disposeSecurity();this.row=null;this.owner=null;this.set({screen:'signed-out',grant:null,decision:null,error:null});
  try { const {error}=await this.client.auth.signOut({scope:'local'}); if(error) this.set({error:'Keluar lokal berhasil; server tidak dapat dihubungi.'}); }
  catch { this.set({error:'Keluar lokal berhasil; server tidak dapat dihubungi.'}); }
  finally { clearLocalAuthSession(); }
 }
 async checkVerification():Promise<void> {
  this.set({busy:true,error:null});
  try {
   const session=await this.client.auth.getSession();
   if(!session.data.session) { this.set({screen:'signed-out',error:'Masuk kembali setelah memverifikasi email.'});return; }
   const {data,error}=await this.client.auth.getUser();
   if(error || !data.user) throw new Error('Tidak dapat memeriksa email. Pastikan jaringan tersedia dan coba lagi.');
   this.owner=data.user.id; await this.onlineBootstrap();
   if(this.state.screen==='verify-email') this.set({error:'Email belum terverifikasi.'});
  } catch(e) { await this.handleError(e); } finally { this.set({busy:false}); }
 }
 async resend():Promise<void> { const {error}=await this.client.auth.resend({type:'signup',email:this.state.email}); this.set({error:error?error.message:'Email verifikasi dikirim. Periksa kotak masuk.'}); }
}
