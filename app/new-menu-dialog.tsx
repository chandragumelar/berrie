'use client';
import React,{useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {money,type State} from '@/lib/berrie/domain';
import {configuredTypes} from '@/lib/berrie/menu-config';
import {combinationLabel,type MenuVariable} from '@/lib/berrie/menu-variables';
import {applyOptionPrices} from '@/lib/berrie/option-prices';
import {rowErrors,type MenuRow} from '@/lib/berrie/workshop';
import {InlineChoice} from './taxonomy-workspace';
import {VariantFields} from './variant-fields';

export function NewMenuDialog({initial,state,busy,onAdd,onClose,onCreateLabel,onCheckResult}:{initial:MenuRow;state:State;busy:boolean;onAdd:(rows:MenuRow[])=>void;onClose:()=>void;onCreateLabel:(kind:'category'|'type',name:string)=>Promise<boolean>;onCheckResult?:()=>void}){
 const [menu,setMenu]=useState(initial),[variables,setVariables]=useState<MenuVariable[]>([]),[error,setError]=useState(''),[invalid,setInvalid]=useState<Record<string,string>>({});
 const errorRef=useRef<HTMLParagraphElement>(null);
 const channels=state.settings.enabledChannels??[];
 const edit=(field:'name'|'price'|'stock'|'threshold',value:string)=>{setMenu({...menu,[field]:value});setError('');setInvalid({});};
 const prices=()=>applyOptionPrices(variables,menu.price,[menu],channels).prices;
 let preview:MenuRow[]=[];
 try{preview=prices();}catch{/* A partially entered variant has no valid price preview yet. */}
 const submit=(event:React.FormEvent)=>{
  event.preventDefault();
  try{
   const rows=prices(),errors=rowErrors(rows,state);
   if(Object.keys(errors).length){setInvalid(errors[rows[0].key]??{});throw Error([...new Set(Object.values(errors).flatMap(e=>Object.values(e)))].join(' '));}
   onAdd(rows);
  }catch(e){setError((e as Error).message);requestAnimationFrame(()=>errorRef.current?.focus());}
 };
 const field=(key:'name'|'price'|'stock'|'threshold',label:string)=><label className="field"><span>{label}</span><input aria-label={label} required={key!=='threshold'} aria-invalid={!!invalid[key]||undefined} aria-describedby={invalid[key]?'new-menu-error':undefined} inputMode={key==='name'?undefined:'numeric'} maxLength={key==='name'?80:12} value={menu[key]} placeholder={key==='name'?'Nama menu':key==='stock'?'Isi hasil hitung':'0'} onChange={e=>edit(key,e.target.value)}/></label>;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="berrie-dialog new-menu-dialog">
  <DialogTitle>Tambah menu</DialogTitle><DialogDescription className="sr-only">Atur harga, pilihan varian dan stok menu baru.</DialogDescription>
  <form className="new-menu-form" onSubmit={submit} noValidate>
   <div className="dialog-body new-menu-body"><fieldset disabled={busy} className="new-menu-fields">
    {field('name','Nama menu (wajib)')}
    <div className="menu-form-pair">
     <label className="field"><span>Kategori (wajib)</span><InlineChoice label="Kategori menu baru" value={menu.category} options={state.settings.menuCategories??[]} kind="kategori" disabled={busy} onChange={category=>{setMenu({...menu,category});setError('');setInvalid({});}} onCheckResult={onCheckResult} onCreate={name=>onCreateLabel('category',name)}/></label>
     <label className="field"><span>Tipe</span><InlineChoice label="Tipe menu baru" value={menu.type} options={configuredTypes(state)} kind="tipe" disabled={busy} onChange={type=>{setMenu({...menu,type});setError('');}} onCheckResult={onCheckResult} onCreate={name=>onCreateLabel('type',name)}/></label>
    </div>
    <section className="menu-pricing" aria-label="Harga dan varian">
     {field('price',variables.length?'Harga dasar (Rp)':'Harga (Rp)')}
     <VariantFields rows={variables} onChange={next=>{setVariables(next);setError('');setInvalid({});}}/>
     {variables.length>0&&preview.length>0&&<div className="menu-price-preview" aria-label="Harga akhir pilihan"><h3>Harga akhir</h3><dl>{preview.map(row=><div key={row.key}><dt>{combinationLabel(row.variables??[],row.variableValues??{})==='Reguler'?'Harga menu':combinationLabel(row.variables??[],row.variableValues??{})}</dt><dd>{money(Number(row.price))}</dd></div>)}</dl></div>}
     {channels.map(ch=><label className="field" key={ch}><span>Harga {ch} (Rp)</span><input aria-label={`Harga ${ch} menu baru`} inputMode="numeric" value={menu.channelPrices?.[ch]||''} onChange={e=>{setMenu({...menu,channelPrices:{...menu.channelPrices,[ch]:e.target.value===''?0:Number(e.target.value)}});setError('');}}/></label>)}
    </section>
    <div className="menu-form-pair menu-stock-fields">{field('stock','Stok awal (wajib)')}{field('threshold','Stok minimal')}</div>
    {error&&<p ref={errorRef} tabIndex={-1} id="new-menu-error" className="error" role="alert">{error}</p>}
   </fieldset></div>
   <div className="variable-footer new-menu-footer"><button type="button" disabled={busy} onClick={onClose}>Batal</button><button type="submit" className="primary" disabled={busy}>Tambahkan ke tabel</button></div>
  </form>
 </DialogContent></Dialog>;
}
