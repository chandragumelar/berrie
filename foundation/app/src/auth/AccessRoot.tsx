import { useEffect, useState, type FormEvent } from 'react';
import { AccessController, type AccessState } from './access-controller';
import { createAccessClient } from './supabase-client';
import { importPermitKeys } from './contracts';
import { AccessApi } from './access-api';
import { EnrollmentStore } from './enrollment-store';
import { OperationalShell } from '../app/OperationalShell';
import './access.css';

export function AccessRoot() {
 const [controller,setController]=useState<AccessController|null>(null), [state,setState]=useState<AccessState>({screen:'config-error',error:null,busy:false,grant:null,decision:null,email:'',canRenew:false});
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[register,setRegister]=useState(false),[name,setName]=useState(''),[zone,setZone]=useState<'Asia/Jakarta'|'Asia/Makassar'|'Asia/Jayapura'>('Asia/Jakarta'),[pin,setPin]=useState(''),[confirm,setConfirm]=useState('');
 useEffect(()=>{ let active=true; let instance:AccessController|undefined;
  void (async()=>{try {const url=import.meta.env.VITE_SUPABASE_URL as string,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string, keys=await importPermitKeys(import.meta.env.VITE_BERRIE_PERMIT_PUBLIC_KEYS as string); const client=createAccessClient(url,key); instance=new AccessController(client,new AccessApi(client,url,key,keys),keys,new EnrollmentStore(),s=>{if(active)setState(s);}); if(!active){instance.dispose();return;} setController(instance); await instance.start();} catch {if(active)setState(s=>({...s,screen:'config-error',error:'Konfigurasi akses belum lengkap atau tidak sah.'}));}})();
  return ()=>{active=false;instance?.dispose();};
 },[]);
 const submit=(fn:()=>Promise<void>)=>(event:FormEvent)=>{event.preventDefault();void fn();};
 if((state.screen==='unlocked'||state.screen==='limited') && controller && state.grant) return <OperationalShell controller={controller} state={state}/>;
 return <main className="access"><section className="card"><div className="brand">Berrie</div>
 {state.error && <p className="notice" role="alert">{state.error}</p>}
 {state.screen==='config-error' && <><h1>Akses belum siap</h1><p>Periksa konfigurasi aplikasi.</p></>}
 {state.screen==='signed-out' && <><h1>{register?'Daftar akun':'Masuk'}</h1><form onSubmit={submit(()=>controller!.authenticate(email,password,register))}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Kata sandi<input type="password" autoComplete={register?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={state.busy || !controller}>{state.busy?'Memproses…':register?'Daftar':'Masuk'}</button></form><button className="link" onClick={()=>setRegister(!register)}>{register?'Sudah punya akun? Masuk':'Belum punya akun? Daftar'}</button></>}
 {state.screen==='verify-email' && <><h1>Verifikasi email</h1><p>Buka tautan verifikasi yang dikirim ke email, lalu masuk kembali.</p><button disabled={state.busy} onClick={()=>void controller?.resend()}>Kirim ulang email</button><button disabled={state.busy} onClick={()=>void controller?.checkVerification()}>Periksa lagi</button><button onClick={()=>{setRegister(false);void controller?.signOut();}}>Kembali ke masuk</button></>}
 {state.screen==='store-setup' && <><h1>Siapkan toko</h1><p>Browser ini akan menjadi perangkat kasir utama.</p><form onSubmit={submit(()=>controller!.activate(name,zone))}><label>Nama toko<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Zona waktu<select value={zone} onChange={e=>setZone(e.target.value as typeof zone)}><option value="Asia/Jakarta">WIB · Jakarta</option><option value="Asia/Makassar">WITA · Makassar</option><option value="Asia/Jayapura">WIT · Jayapura</option></select></label><button className="primary" disabled={state.busy}>Aktifkan perangkat</button></form></>}
 {state.screen==='activating' && <><h1>Aktivasi perangkat</h1><p>{state.busy?'Sedang mengaktifkan…':'Hasil aktivasi belum dipastikan. Coba lagi menggunakan operasi yang sama.'}</p>{state.canRenew?<button className="primary" disabled={state.busy} onClick={()=>void controller?.renewExpired()}>Verifikasi dan perbarui izin</button>:<button className="primary" disabled={state.busy} onClick={()=>void controller?.activate(name,zone)}>Coba lagi</button>}</>}
 {state.screen==='pin-setup' && <><h1>Buat PIN</h1><p>Gunakan enam digit untuk membuka kasir di perangkat ini.</p><form onSubmit={submit(async()=>{await controller!.setupPin(pin,confirm);setPin('');setConfirm('');})}><label>PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e=>setPin(e.target.value)}/></label><label>Konfirmasi PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="primary" disabled={state.busy}>Simpan PIN</button></form></>}
 {state.screen==='locked' && <><h1>Buka kasir</h1><p>{state.grant?.store.name}</p><form onSubmit={submit(async()=>{await controller!.unlock(pin);setPin('');})}><label>PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e=>setPin(e.target.value)}/></label><button className="primary" disabled={state.busy}>Buka</button></form><button onClick={()=>void controller?.signOut()}>Keluar akun</button></>}
 {state.screen==='device-conflict' && <><h1>Kasir aktif di perangkat lain</h1><p>Perangkat ini belum dapat digunakan. Pindahkan atau pulihkan perangkat melalui proses yang tersedia nanti.</p><button onClick={()=>void controller?.signOut()}>Keluar akun</button></>}
 {state.screen==='blocked' && <><h1>Akses memerlukan pemeriksaan</h1><p>Perangkat ini belum dapat membuka aplikasi.</p><button onClick={()=>void controller?.signOut()}>Keluar akun</button></>}
 </section></main>;
}
