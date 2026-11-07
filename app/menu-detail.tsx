'use client';
import React,{useState,useEffect} from 'react';
import type {State,Action,Channel} from '@/lib/berrie/domain';
import {catalogDraft,rowErrors,type MenuRow} from '@/lib/berrie/workshop';
import {previewMenu} from '@/lib/berrie/menu-preview';
import {replaceMenuDraft} from '@/lib/berrie/menu-list';
import {applyOptionPrices,optionPriceDraft} from '@/lib/berrie/option-prices';
import {combinationLabel,type MenuVariable} from '@/lib/berrie/menu-variables';
import {configuredTypes} from '@/lib/berrie/menu-config';
import {InlineChoice} from './taxonomy-workspace';
import {VariantFields} from './variant-fields';
import {VariablePicker} from './variable-picker';

type Props={initial:MenuRow[];isNew:boolean;state:State;busy:boolean;onSave:(action:Action)=>Promise<State|undefined>;onClose:()=>void;onDirty:(dirty:boolean)=>void;onCreateLabel:(kind:'category'|'type',name:string)=>Promise<boolean>;onCheckResult?:()=>void};
export function MenuDetail({initial,isNew,state,busy,onSave,onClose,onDirty,onCreateLabel,onCheckResult}:Props){
 const [draft,setDraft]=useState(()=>structuredClone(initial));
 const [catalogBase]=useState(()=>catalogDraft(state)),[catalogVersion]=useState(()=>JSON.stringify(state.catalog));
 const [variantInitial]=useState(()=>{if(isNew)return {base:'',variables:[] as MenuVariable[],error:''};try{return optionPriceDraft(initial[0].variables??[],initial.filter(r=>!r.archived));}catch{return {base:initial[0].price,variables:initial[0].variables??[],error:'Harga lama belum dapat diubah menjadi tambahan pilihan.'};}});
 const [base,setBase]=useState(variantInitial.base),[variables,setVariables]=useState(variantInitial.variables),[variantChanged,setVariantChanged]=useState(isNew),[dirty,setDirty]=useState(isNew),[error,setError]=useState(''),[pending,setPending]=useState(''),[confirmExit,setConfirmExit]=useState(false);
 const [previewChannel,setPreviewChannel]=useState<Channel>('Toko'),[previewValues,setPreviewValues]=useState<Record<string,string[]>>({});
 const active=draft.filter(r=>!r.archived),first=active[0];
 let preview: {variables:MenuVariable[];price:number}|null=null;
 try{
  const source=isNew?active.map(r=>({...r,price:base,channelPrices:{...r.channelPrices,Toko:Number(base)}})):active;
  const computed=variantChanged?applyOptionPrices(variables,base,source,state.settings.enabledChannels??[]):{variables:active[0].variables??variables,prices:active};
  const values=Object.fromEntries(computed.variables.map(v=>[v.id,previewValues[v.id]??v.defaults]));
  if(computed.variables.some(v=>!v.multiple&&!values[v.id]?.length))throw Error('Pilihan belum lengkap.');
  preview={variables:computed.variables,price:previewMenu(state,computed.prices,computed.variables,values,previewChannel)};
 }catch{/* Incomplete input is not a valid price. */}
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 useEffect(()=>{if(pending&&Object.values(state.operations).some(op=>op.hash===pending))onClose();},[pending,state.operations,onClose]);
 const update=(key:string,change:Partial<MenuRow>)=>{setDraft(old=>old.map(r=>r.key===key?{...r,...change}:r));setDirty(true);setError('');};
 const group=(change:Partial<MenuRow>)=>{setDraft(old=>old.map(r=>({...r,...change})));setDirty(true);setError('');};
 const changeVariants=(nextVariables:MenuVariable[],nextBase:string)=>{
  setVariables(nextVariables);setBase(nextBase);setVariantChanged(true);setDirty(true);setError('');
  try{
   if(!isNew&&variantInitial.error)return;
   const source=isNew?active.map(r=>({...r,price:nextBase,channelPrices:{...r.channelPrices,Toko:Number(nextBase)}})):active;
   const computed=applyOptionPrices(nextVariables,nextBase,source,state.settings.enabledChannels??[]);
   const keys=new Set(computed.prices.map(r=>r.key));
   const archived=active.filter(r=>r.sku&&!keys.has(r.key)).map(r=>({...r,archived:true,variables:computed.variables,variableValues:{}}));
   setDraft([...computed.prices,...archived,...draft.filter(r=>r.archived)]);
   setVariantChanged(false);
  }catch{/* Keep partially typed settings until they become valid. */}
 };
 const exit=()=>{if(dirty)setConfirmExit(true);else onClose();};
 const save=async()=>{
  try{
   let next=draft;
   if(variantChanged){
    if(!isNew&&variantInitial.error)throw Error(variantInitial.error);
    const source=isNew?active.map(r=>({...r,price:base,channelPrices:{...r.channelPrices,Toko:Number(base)}})):active;
    const result=applyOptionPrices(variables,base,source,state.settings.enabledChannels??[]);
    const keys=new Set(result.prices.map(r=>r.key));
    const removed=active.filter(r=>r.sku&&!keys.has(r.key));
    next=[...result.prices,...removed.map(r=>({...r,archived:true,variables:result.variables,variableValues:{}})),...draft.filter(r=>r.archived)];
   }
   const removedOriginal=initial.filter(r=>r.sku&&!r.archived&&!next.some(x=>x.sku===r.sku&&!x.archived));
   if(removedOriginal.length&&!window.confirm(`${removedOriginal.length} kombinasi lama akan diarsipkan. Riwayat tetap ada. Lanjutkan?`))return;
   const rows=replaceMenuDraft(catalogBase,first.group,next),errors=rowErrors(rows,state);
   if(Object.keys(errors).length)throw Error([...new Set(Object.values(errors).flatMap(e=>Object.values(e)))].join(' '));
   const action:Action={kind:'menuGrid',activity:'Harga / impor',reason:isNew?'Menambah menu':'Mengubah menu',amount:0,data:{rows,catalogVersion}};
   setPending(JSON.stringify(action));const result=await onSave(action);if(result)onClose();else setError('Menu belum dipastikan tersimpan. Semua input tetap ada.');
  }catch(e){setError((e as Error).message);}
 };
 const channels:Channel[]=['Toko',...(state.settings.enabledChannels??[])];
 return <section className="menu-detail" aria-label={isNew?'Tambah menu':'Edit menu'}><div className="editor-action-bar"><button disabled={busy} onClick={exit}>Kembali</button><span role="status">{dirty?'Perubahan belum disimpan':'Tidak ada perubahan'}</span><div className="save-action-pair"><button disabled={busy} onClick={exit}>Batal</button><button className="primary" disabled={busy} onClick={save}>Simpan menu</button></div></div>
 {confirmExit&&<div className="callout" role="alert"><p>Buang perubahan menu yang belum disimpan?</p><button onClick={()=>setConfirmExit(false)}>Lanjut mengedit</button><button onClick={onClose}>Buang perubahan</button></div>}
 <h2>{isNew?'Tambah menu':'Edit menu'}</h2><fieldset disabled={busy}><section><h3>Informasi menu</h3><label className="field"><span>Nama menu</span><input value={first.name} maxLength={80} onChange={e=>group({name:e.target.value})}/></label><label className="field"><span>Tipe</span><InlineChoice label="Tipe menu" value={first.type} options={configuredTypes(state)} kind="tipe" onChange={type=>group({type})} onCreate={name=>onCreateLabel('type',name)} onCheckResult={onCheckResult}/></label><p className="hint">Kategori atau tipe baru langsung tersimpan meskipun draft menu dibatalkan.</p></section>
 <section><h3>Harga &amp; pilihan</h3><div className="menu-pricing-preview"><div><label className="field"><span>Harga dasar (Rp)</span><input inputMode="numeric" value={base} onChange={e=>changeVariants(variables,e.target.value)}/></label>{variantInitial.error&&!isNew&&<p className="hint">{variantInitial.error} Harga per kombinasi tetap dapat diedit di bawah.</p>}<VariantFields rows={variables} onChange={next=>changeVariants(next,base)}/></div><div><h4>Preview di kasir</h4><label className="field"><span>Channel</span><select value={previewChannel} onChange={e=>setPreviewChannel(e.target.value as Channel)}>{channels.map(ch=><option key={ch}>{ch}</option>)}</select></label>{preview? <>{preview.variables.map(v=><label className="field" key={v.id}><span>{v.name}</span><VariablePicker variable={v} value={previewValues[v.id]??v.defaults} onChange={value=>setPreviewValues(old=>({...old,[v.id]:value}))}/></label>)}<p>Harga sebelum diskon: Rp{preview.price.toLocaleString('id-ID')}</p></>:<p>Harga belum lengkap.</p>}</div></div></section>
 <section><h3>Harga &amp; diskon per channel</h3>{active.map(r=><div className="menu-sku-editor" key={r.key}><h4>{combinationLabel(r.variables??[],r.variableValues??{})}</h4><label className="field"><span>Kategori</span><InlineChoice label={`Kategori ${r.key}`} value={r.category} options={state.settings.menuCategories??[]} kind="kategori" onChange={category=>update(r.key,{category})} onCreate={name=>onCreateLabel('category',name)} onCheckResult={onCheckResult}/></label><label className="field"><span>Status jual</span><select value={r.available?'yes':'no'} onChange={e=>update(r.key,{available:e.target.value==='yes'})}><option value="yes">Dijual</option><option value="no">Tidak dijual</option></select></label>{channels.map(ch=><div key={ch} className="menu-form-pair"><label className="field"><span>Harga {ch} (Rp)</span><input inputMode="numeric" value={ch==='Toko'?r.price:r.channelPrices?.[ch]||''} onChange={e=>update(r.key,ch==='Toko'?{price:e.target.value}:{channelPrices:{...r.channelPrices,[ch]:e.target.value===''?0:Number(e.target.value)}})}/></label><label className="field"><span>Diskon {ch}</span><select value={r.discountAssignments?.[ch]??''} onChange={e=>update(r.key,{discountAssignments:{...r.discountAssignments,[ch]:e.target.value}})}><option value="">Tanpa diskon</option>{(state.discounts??[]).filter(d=>!d.archived).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div>)}</div>)}</section>
 {isNew&&<section><h3>Stok awal</h3><label className="field"><span>Stok awal (wajib)</span><input inputMode="numeric" value={first.stock} onChange={e=>group({stock:e.target.value})}/></label><label className="field"><span>Stok minimal</span><input inputMode="numeric" value={first.threshold} onChange={e=>group({threshold:e.target.value})}/></label></section>}</fieldset>{error&&<p className="error" role="alert">{onCheckResult?'Hasil belum diketahui. Periksa operasi yang sama; input tetap ada.':error}</p>}{onCheckResult&&<button onClick={onCheckResult}>Periksa hasil operasi</button>}</section>;
}
