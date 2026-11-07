'use client';
import React,{useState,useEffect} from 'react';
import {bulkMenuDraft,type MenuGroup} from '@/lib/berrie/menu-list';
import {catalogDraft} from '@/lib/berrie/workshop';
import type {Action,Channel,State} from '@/lib/berrie/domain';

export function MenuBulk({state,groups,selected,onClose,onSave,busy,onCheckResult}:{state:State;groups:MenuGroup[];selected:string[];onClose:()=>void;onSave:(action:Action)=>Promise<State|undefined>;busy:boolean;onCheckResult?:()=>void}){
 const [kind,setKind]=useState<'category'|'status'|'discount'>('category'),[value,setValue]=useState(''),[channel,setChannel]=useState<Channel>('Toko'),[confirm,setConfirm]=useState(false),[error,setError]=useState('');
 const [pending,setPending]=useState('');
 useEffect(()=>{if(pending&&Object.values(state.operations).some(op=>op.hash===pending))onClose();},[pending,state.operations,onClose]);
 const chosen=groups.filter(g=>selected.includes(g.id));
 const save=async()=>{
  const change=kind==='category'?{kind,value} as const:kind==='status'?{kind,value:value==='Dijual'} as const:{kind,channel,value} as const;
  const rows=bulkMenuDraft(catalogDraft(state),selected,change);
  const action:Action={kind:'menuGrid',activity:'Harga / impor',reason:'Mengubah menu secara massal',amount:0,data:{rows,catalogVersion:JSON.stringify(state.catalog)}};
  setPending(JSON.stringify(action));
  const result=await onSave(action);
  if(result)onClose();else setError('Perubahan belum dipastikan tersimpan. Pilihan tetap ada.');
 };
 return <section className="panel" aria-label="Edit massal"><h2>Edit massal · {chosen.length} menu</h2><p>Perubahan berlaku untuk semua SKU yang belum diarsipkan pada menu terpilih.</p><label className="field"><span>Pengaturan</span><select disabled={confirm||busy} value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setValue('');}}><option value="category">Kategori</option><option value="status">Status jual</option><option value="discount">Diskon</option></select></label>{kind==='discount'&&<label className="field"><span>Channel</span><select disabled={confirm||busy} value={channel} onChange={e=>setChannel(e.target.value as Channel)}>{(['Toko',...(state.settings.enabledChannels??[])] as Channel[]).map(c=><option key={c}>{c}</option>)}</select></label>}<label className="field"><span>Nilai tujuan</span><select disabled={confirm||busy} value={value} onChange={e=>setValue(e.target.value)}>{kind==='discount'?<option value="">Tanpa diskon</option>:<option value="">Pilih nilai</option>}{(kind==='category'?state.settings.menuCategories??[]:kind==='status'?['Dijual','Tidak dijual']:(state.discounts??[]).filter(d=>!d.archived).map(d=>d.id)).map(x=><option key={x} value={x}>{kind==='discount'?state.discounts?.find(d=>d.id===x)?.name:x}</option>)}</select></label>{confirm&&<div><h3>Periksa perubahan</h3><p>{chosen.map(g=>g.name).join(', ')}</p><p>{chosen.length} menu · {chosen.reduce((n,g)=>n+g.rows.length,0)} SKU · {kind==='category'?'Kategori':kind==='status'?'Status jual':`Diskon ${channel}`} → {kind==='discount'?(state.discounts?.find(d=>d.id===value)?.name??'Tanpa diskon'):value}</p></div>}{error&&<p className="error" role="alert">{onCheckResult?'Hasil belum diketahui. Periksa operasi yang sama.':error}</p>}{onCheckResult&&<button onClick={onCheckResult}>Periksa hasil operasi</button>}<div className="save-action-pair"><button disabled={busy} onClick={confirm?()=>setConfirm(false):onClose}>Batal</button>{confirm?<button className="primary" disabled={busy} onClick={save}>Simpan perubahan</button>:<button className="primary" disabled={busy||!chosen.length||(kind!=='discount'&&!value)} onClick={()=>setConfirm(true)}>Periksa perubahan</button>}</div></section>;
}
