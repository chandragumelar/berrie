export type ShellStatus = { kind:'unavailable'|'checking'|'ready'|'incomplete'|'mismatch'|'error'; reason:string; waiting:boolean; buildId:string|null };
const pageBuild=document.querySelector<HTMLMetaElement>('meta[name="berrie-build"]')?.content ?? null;
let current:ShellStatus={kind:'checking',reason:'Memeriksa paket aplikasi…',waiting:false,buildId:pageBuild};
const listeners=new Set<(status:ShellStatus)=>void>();
const emit=(value:ShellStatus)=>{current=value;for(const listener of listeners)listener(value);};
export function subscribeShell(listener:(status:ShellStatus)=>void):()=>void {listeners.add(listener);listener(current);return()=>listeners.delete(listener);}
export function shellStatus():ShellStatus {return current;}
export async function checkAppShell(update=false):Promise<ShellStatus> {
 if (!pageBuild || !('serviceWorker' in navigator) || !window.isSecureContext) {
  emit({kind:'unavailable',reason:pageBuild?'Browser atau konteks ini belum mendukung service worker.':'Preview pengembangan belum menyiapkan offline.',waiting:false,buildId:pageBuild});return current;
 }
 try {
  const registration=await navigator.serviceWorker.getRegistration('/');
  if(update && registration) try { await registration.update(); } catch { /* Offline update checks do not invalidate a complete active shell. */ }
  const waiting=!!registration?.waiting;
  const controller=navigator.serviceWorker.controller;
  if(!controller) {emit({kind:'incomplete',reason:'Paket aplikasi belum mengendalikan halaman ini. Buka ulang setelah pemasangan selesai.',waiting,buildId:pageBuild});return current;}
  const reply=await new Promise<{type:string;buildId:string;complete:boolean}>((resolve,reject)=>{
   const channel=new MessageChannel();const timer=window.setTimeout(()=>{channel.port1.close();reject(new Error('Pemeriksaan paket terlalu lama.'));},4000);
   channel.port1.onmessage=event=>{window.clearTimeout(timer);channel.port1.close();resolve(event.data);};
   controller.postMessage({type:'BERRIE_SHELL_STATUS',repair:update},[channel.port2]);
  });
  if(reply.type!=='BERRIE_SHELL_STATUS' || typeof reply.buildId!=='string' || typeof reply.complete!=='boolean') throw new Error('Jawaban paket aplikasi tidak sah.');
  emit({kind:reply.buildId!==pageBuild?'mismatch':reply.complete?'ready':'incomplete',reason:reply.buildId!==pageBuild?'Versi halaman dan paket aplikasi berbeda. Periksa pembaruan saat pekerjaan selesai.':reply.complete?'Paket aplikasi lengkap.':'Paket aplikasi belum lengkap. Hubungkan ke origin lalu coba lagi.',waiting,buildId:pageBuild});
 } catch(e) {emit({kind:'error',reason:e instanceof Error?e.message:'Pemeriksaan paket gagal.',waiting:false,buildId:pageBuild});}
 return current;
}
export async function registerAppShell():Promise<void> {
 if(!pageBuild || !('serviceWorker' in navigator) || !window.isSecureContext) {await checkAppShell();return;}
 try {
  const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
  registration.addEventListener('updatefound',()=>{const installing=registration.installing;installing?.addEventListener('statechange',()=>{void checkAppShell();});});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{void checkAppShell();});
  window.addEventListener('focus',()=>{void checkAppShell(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkAppShell(true);});
  await checkAppShell();
 } catch(e) {emit({kind:'error',reason:e instanceof Error?e.message:'Pemasangan paket aplikasi gagal.',waiting:false,buildId:pageBuild});}
}
