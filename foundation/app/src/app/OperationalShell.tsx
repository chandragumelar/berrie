import { useState } from 'react';
import type { AccessController, AccessState } from '../auth/access-controller';
export function OperationalShell({controller,state}:{controller:AccessController;state:AccessState}) {
 const [tab,setTab]=useState<'kasir'|'pengaturan'>('kasir'); const grant=state.grant!;
 return <main className="shell"><header><div><strong>Berrie</strong><p>{grant.store.name} · Owner</p></div><div className="actions"><button onClick={()=>void controller.lock()}>Kunci</button><button onClick={()=>void controller.signOut()}>Keluar akun</button></div></header>
 <nav aria-label="Menu utama"><button aria-current={tab==='kasir'?'page':undefined} onClick={()=>setTab('kasir')}>Kasir</button><button aria-current={tab==='pengaturan'?'page':undefined} onClick={()=>setTab('pengaturan')}>Pengaturan</button></nav>
 <section className="panel">{state.screen==='limited' && <p role="status">Izin terbatas. Perbarui izin saat online.</p>}{state.error && <p role="alert">{state.error}</p>}{state.canRenew && <button disabled={state.busy} onClick={()=>void controller.renewExpired()}>Verifikasi dan perbarui izin</button>}
 {tab==='kasir'?<><h1>Kasir</h1><p>Transaksi belum tersedia pada versi ini.</p></>:<><h1>Pengaturan</h1><dl><dt>Nama toko</dt><dd>{grant.store.name}</dd><dt>Zona waktu</dt><dd>{grant.store.timeZone}</dd><dt>ID perangkat</dt><dd>{grant.identity.deviceId}</dd><dt>Batas izin</dt><dd>{state.decision?new Date(state.decision.expiresAt).toLocaleString('id-ID'):'—'}</dd></dl><button disabled={state.busy} onClick={()=>void controller.refresh()}>Perbarui izin</button></>}</section></main>;
}
