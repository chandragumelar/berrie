import { LOCK_MS } from '../domain/local-pin';
import { LocalPinSecurity } from './local-pin';

/** Adapter for a foreground document. Calls are serialized to preserve event order. */
export class PinActivity {
 private hiddenAt:number|null=null;
 private queue:Promise<void>=Promise.resolve();
 constructor(private security:LocalPinSecurity,private now:()=>number=Date.now) {}
 private schedule(action:()=>Promise<void>):Promise<void> { const result=this.queue.then(action); this.queue=result.catch(()=>{}); return result; }
 activity(visible:boolean):Promise<void> { return this.schedule(async()=>{ if(visible && this.hiddenAt===null) await this.security.check(true,true); }); }
 visibility(visible:boolean):Promise<void> { return this.schedule(async()=>{
  const now=this.now();
  if(!visible) { if(this.hiddenAt===null) this.hiddenAt=now; await this.security.check(false); return; }
  const hidden=this.hiddenAt; this.hiddenAt=null;
  if(hidden!==null && (now<hidden || now-hidden>LOCK_MS)) await this.security.lock();
  else await this.security.check(true);
 }); }
 tick():Promise<void> { return this.schedule(async()=>{ await this.security.check(false); }); }
 lock():Promise<void> { return this.schedule(()=>this.security.lock()); }
}

/** Installs foreground activity and visibility listeners; caller must dispose on teardown. */
export function observePinActivity(adapter:PinActivity,doc:Document=document,win:Window=window):()=>void {
 const activity=()=>{ void adapter.activity(doc.visibilityState==='visible').catch(()=>{}); };
 const visibility=()=>{ void adapter.visibility(doc.visibilityState==='visible').catch(()=>{}); };
 for(const event of ['pointerdown','keydown','touchstart']) doc.addEventListener(event,activity);
 doc.addEventListener('visibilitychange',visibility); visibility();
 const timer=win.setInterval(()=>{ void adapter.tick().catch(()=>{}); },1000);
 return ()=>{ win.clearInterval(timer); doc.removeEventListener('visibilitychange',visibility); for(const event of ['pointerdown','keydown','touchstart']) doc.removeEventListener(event,activity); };
}
