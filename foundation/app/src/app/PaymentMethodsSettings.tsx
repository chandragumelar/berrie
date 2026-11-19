import { useEffect, useState } from 'react';
import type { OwnerCashier, OwnerView } from '../application/owner-cashier';

type Flags={qris:boolean;transfer:boolean;ewallet:boolean};
export function PaymentMethodsSettings({service,view,reload,onDirty}:{service:OwnerCashier;view:OwnerView;reload:()=>Promise<void>;onDirty?:(dirty:boolean)=>void}){
 const current=view.paymentMethods.methods;
 const [draft,setDraft]=useState<Flags>({qris:current.qris,transfer:current.transfer,ewallet:current.ewallet});
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!editing)setDraft({qris:current.qris,transfer:current.transfer,ewallet:current.ewallet});},[current.qris,current.transfer,current.ewallet,editing]);
 const dirty=draft.qris!==current.qris||draft.transfer!==current.transfer||draft.ewallet!==current.ewallet;
 useEffect(()=>{onDirty?.(dirty);return()=>onDirty?.(false);},[dirty,onDirty]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const save=async()=>{setBusy(true);setError('');const op=crypto.randomUUID();try{await service.setPaymentMethods({expectedRevision:view.paymentMethods.revision,...draft},op);await reload();setEditing(false);setNotice('Tersimpan di perangkat.');}catch(e){const message=e instanceof Error?e.message:'Metode gagal disimpan.',definitive=message.startsWith('Operasi ditolak')||message.includes('Konflik operation ID');if(definitive)setEditing(false);await reload().catch(()=>{});setError(`${message} ${definitive?'Periksa pilihan terbaru sebelum mengubah lagi.':'Periksa hasil operasi sebelum mencoba lagi; pilihan tetap di form.'}`);}finally{setBusy(false);}};
 return <section aria-label="Metode pembayaran"><h2>Metode pembayaran</h2><p>Tunai selalu aktif. Metode lain dicatat setelah keberhasilannya diperiksa.</p><label><input type="checkbox" checked readOnly/> Tunai</label>{(['qris','transfer','ewallet'] as const).map(key=><label key={key}><input type="checkbox" checked={draft[key]} disabled={!editing||busy} onChange={e=>setDraft(x=>({...x,[key]:e.target.checked}))}/> {key==='qris'?'QRIS':key==='ewallet'?'E-wallet':'Transfer'}</label>)}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {editing?<div className="actions"><button disabled={busy||!dirty} onClick={()=>void save()}>Simpan metode</button><button disabled={busy} onClick={()=>{setDraft({qris:current.qris,transfer:current.transfer,ewallet:current.ewallet});setEditing(false);setError('');}}>Batal</button></div>:<button onClick={()=>{setEditing(true);setNotice('');}}>Ubah metode</button>}
 </section>;
}
