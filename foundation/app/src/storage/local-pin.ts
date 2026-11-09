import Dexie, { type Table } from 'dexie';
import { comparePin, cooldownDuration, LOCK_MS, validateVerifier, type PinVerifier } from '../domain/local-pin';
import type { LockProvider } from './commit';

export interface PinIdentity { storeId:string; deviceId:string; epoch:number; actorId:string }
interface SecurityRow { key:string; verifier:PinVerifier; revision:number; verifierRevision:number; failures:number; cooldownDuration:number; cooldownMarker:number; lastTime:number; clockFault:boolean }
interface SessionRow { key:'session'; generation:number; identity:string|null; lastActivity:number; lastTime:number; clockFault:boolean }
class SecurityDatabase extends Dexie {
 credentials!:Table<SecurityRow,string>; session!:Table<SessionRow,string>;
 constructor(name:string) { super(name); this.version(1).stores({credentials:'&key',session:'&key'}); }
}
function identityKey(i:PinIdentity):string {
 if(!i || ![i.storeId,i.deviceId,i.actorId].every(x=>typeof x==='string' && x.trim().length>0 && x.length<=200) || !Number.isSafeInteger(i.epoch) || i.epoch<1) throw new Error('Identitas tidak sah');
 return JSON.stringify([i.storeId,i.deviceId,i.epoch,i.actorId]);
}
function increment(value:number):number { if(!Number.isSafeInteger(value) || value<0 || value===Number.MAX_SAFE_INTEGER) throw new Error('State keamanan melewati batas'); return value+1; }
function validTime(now:number):void { if(!Number.isSafeInteger(now) || now<0) throw new Error('Waktu tidak sah; perlu verifikasi online'); }
function validRow(r:SecurityRow):void {
 validateVerifier(r.verifier);
 if(![r.revision,r.verifierRevision,r.failures,r.cooldownDuration,r.cooldownMarker,r.lastTime].every(x=>Number.isSafeInteger(x) && x>=0) || typeof r.clockFault!=='boolean' || r.revision<1 || r.verifierRevision<1 || (r.cooldownDuration!==0 && (r.failures<5 || r.failures%5!==0 || r.cooldownDuration!==cooldownDuration(r.failures) || r.cooldownMarker<1 || r.cooldownMarker>r.revision))) throw new Error('State keamanan tidak sah');
}
/** A separate database, never included in business snapshots. Requires Web Locks. */
export class LocalPinSecurity {
 private db:SecurityDatabase;
 private token:{identity:string; generation:number}|null=null;
 private anchors=new Map<string,{marker:number; monotonic:number}>();
 private clockSample:{wall:number; monotonic:number}|null=null;
 private clockFault=false;
 constructor(name:string,private locks:LockProvider=navigator.locks,private now:()=>number=Date.now,private monotonic:()=>number=()=>performance.now()) { this.db=new SecurityDatabase(`${name}-local-security`); }
 private sample():{wall:number;monotonic:number;fault:boolean} {
  const wall=this.now(), monotonic=this.monotonic(); validTime(wall);
  if(!Number.isFinite(monotonic) || monotonic<0) throw new Error('Waktu tidak sah; perlu verifikasi online');
  if(this.clockSample) { const dw=wall-this.clockSample.wall, dm=monotonic-this.clockSample.monotonic;
   if(dw<0 || dm<0 || Math.abs(dw-dm)>2000) this.clockFault=true;
  }
  this.clockSample={wall,monotonic}; return {wall,monotonic,fault:this.clockFault};
 }
 private cooling(row:SecurityRow,monotonic:number):boolean {
  if(!row.cooldownDuration) return false;
  let anchor=this.anchors.get(row.key);
  if(!anchor || anchor.marker!==row.cooldownMarker) { anchor={marker:row.cooldownMarker,monotonic}; this.anchors.set(row.key,anchor); }
  return monotonic-anchor.monotonic<row.cooldownDuration;
 }
 close():void { this.token=null; this.db.close(); }
 private run<T>(fn:()=>Promise<T>):Promise<T> {
  if(!this.locks || typeof this.locks.request!=='function') throw new Error('Penguncian tidak tersedia');
  return this.locks.request(`berrie-security:${this.db.name}`,()=>this.db.transaction('rw',[this.db.credentials,this.db.session],fn));
 }
 private async session(now:number,fault:boolean):Promise<SessionRow> {
  const s=await this.db.session.get('session') ?? {key:'session' as const,generation:0,identity:null,lastActivity:now,lastTime:now,clockFault:false};
  if(!Number.isSafeInteger(s.generation) || s.generation<0 || !Number.isSafeInteger(s.lastTime) || s.lastTime<0 || !Number.isSafeInteger(s.lastActivity) || s.lastActivity<0 || s.lastActivity>s.lastTime || typeof s.clockFault!=='boolean' || (s.identity!==null && typeof s.identity!=='string')) throw new Error('Sesi tidak sah');
  if(fault || now<s.lastTime) { s.clockFault=true; s.identity=null; s.generation=increment(s.generation); }
  s.lastTime=Math.max(now,s.lastTime); return s;
 }
 /** Internal provisioning primitive; caller must implement online authentication separately. */
 async installVerifier(identity:PinIdentity,verifier:PinVerifier):Promise<void> {
  this.token=null; const key=identityKey(identity); validateVerifier(verifier); const copy={...verifier};
  const installed=await this.run(async()=>{ const {wall:now,fault}=this.sample(); const old=await this.db.credentials.get(key); if(old) validRow(old); const s=await this.session(now,fault);
   if(s.clockFault || (old && (old.clockFault || now<old.lastTime))) { s.clockFault=true; s.identity=null; await this.db.session.put(s); return false; }
   for(const other of await this.db.credentials.toArray()) { validRow(other); if(other.key!==key && (other.verifier.salt===copy.salt || other.verifier.hash===copy.hash)) throw new Error('Verifier harus unik per identitas'); }
   await this.db.credentials.put({key,verifier:copy,revision:increment(old?.revision ?? 0),verifierRevision:increment(old?.verifierRevision ?? 0),failures:0,cooldownDuration:0,cooldownMarker:0,lastTime:now,clockFault:false});
   s.identity=null; s.generation=increment(s.generation); await this.db.session.put(s); return true;
  }); if(!installed) throw new Error('Perlu verifikasi online');
 }
 async unlock(identity:PinIdentity,pin:string):Promise<'unlocked'|'incorrect'|'cooldown'|'online-required'|'stale'> {
  this.token=null; const key=identityKey(identity);
  const initial=await this.run(async()=>{ const {wall:now,monotonic,fault}=this.sample(); const row=await this.db.credentials.get(key); if(!row) throw new Error('Verifier tidak tersedia'); validRow(row); const s=await this.session(now,fault);
   if(now<row.lastTime) row.clockFault=true; row.lastTime=Math.max(now,row.lastTime); await this.db.credentials.put(row); await this.db.session.put(s);
   if(row.clockFault || s.clockFault) return {status:'online-required' as const};
   if(this.cooling(row,monotonic)) return {status:'cooldown' as const};
   if(row.cooldownDuration) { row.cooldownDuration=0; await this.db.credentials.put(row); }
   return {status:'ready' as const,verifier:row.verifier,revision:row.verifierRevision,counterRevision:row.revision,generation:s.generation};
  });
  if(initial.status!=='ready') return initial.status;
  const verifier=initial.verifier, revision=initial.revision;
  const matches=await comparePin(pin,verifier);
  return this.run(async()=>{ const {wall:now,monotonic,fault}=this.sample(); const row=await this.db.credentials.get(key); if(!row) return 'stale'; validRow(row); const s=await this.session(now,fault);
   if(now<row.lastTime) row.clockFault=true; row.lastTime=Math.max(now,row.lastTime);
   if(row.clockFault || s.clockFault) { await this.db.credentials.put(row); await this.db.session.put(s); return 'online-required'; }
   if(s.generation!==initial.generation || row.verifierRevision!==revision || (matches && row.revision!==initial.counterRevision) || JSON.stringify(row.verifier)!==JSON.stringify(verifier)) { await this.db.credentials.put(row); await this.db.session.put(s); return 'stale'; }
   if(this.cooling(row,monotonic)) { await this.db.credentials.put(row); await this.db.session.put(s); return 'cooldown'; }
   row.cooldownDuration=0;
   row.revision=increment(row.revision);
   if(matches) { row.failures=0; row.cooldownDuration=0; s.identity=key; s.generation=increment(s.generation); s.lastActivity=now; }
   else { row.failures=increment(row.failures); if(row.failures%5===0) { row.cooldownDuration=cooldownDuration(row.failures); row.cooldownMarker=row.revision; this.anchors.set(key,{marker:row.cooldownMarker,monotonic}); } }
   await this.db.credentials.put(row); await this.db.session.put(s);
   if(matches) this.token={identity:key,generation:s.generation};
   return matches?'unlocked':'incorrect';
  }).catch(error=>{this.token=null; throw error;});
 }
 async lock():Promise<void> { this.token=null; await this.run(async()=>{ const {wall:now,fault}=this.sample(); const s=await this.session(now,fault); s.identity=null; s.generation=increment(s.generation); await this.db.session.put(s); }); }
 /** Check before each use. Hidden tabs must pass false and never extend activity. */
 async check(visible:boolean,activity=false):Promise<boolean> {
  const token=this.token; if(!token) return false;
  try { return await this.run(async()=>{ const {wall:now,fault}=this.sample(); const s=await this.session(now,fault);
   if(s.identity!==token.identity || s.generation!==token.generation) { this.token=null; await this.db.session.put(s); return false; }
   if(s.clockFault || now-s.lastActivity>=LOCK_MS) { s.identity=null; s.generation=increment(s.generation); this.token=null; await this.db.session.put(s); return false; }
   if(visible && activity) s.lastActivity=now; await this.db.session.put(s); return true;
  }); } catch(error) { this.token=null; throw error; }
 }
}
