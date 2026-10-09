'use client';
import React,{useState} from 'react';
import {Plus,Trash2,Star} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {id} from '@/lib/berrie/domain';
import {type MenuRow} from '@/lib/berrie/workshop';
import {optionPriceDraft,applyOptionPrices} from '@/lib/berrie/option-prices';
import {type MenuVariable} from '@/lib/berrie/menu-variables';
export function VariableEditor({name,value,prices,channels,onApply,onClose}:{name:string;value:MenuVariable[];prices:MenuRow[];channels:string[];onApply:(variables:MenuVariable[],prices:MenuRow[])=>void;onClose:()=>void}){
 const [initial]=useState(()=>optionPriceDraft(value,prices));
 const [rows,setRows]=useState(initial.variables),[base,setBase]=useState(initial.base),[error,setError]=useState(initial.error);
 const edit=(key:string,changes:Partial<MenuVariable>)=>{setRows(old=>old.map(v=>v.id===key?{...v,...changes}:v));setError('');};
 const apply=()=>{try{if(initial.error)throw Error(initial.error);const next=applyOptionPrices(rows,base,prices,channels);onApply(next.variables,next.prices);}catch(e){setError((e as Error).message);}};
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="berrie-dialog variable-dialog"><DialogTitle>Varian · {name||'Menu baru'}</DialogTitle><DialogDescription>Tambahkan pilihan yang dimiliki menu ini</DialogDescription><div className="dialog-body">
 <label className="field variant-base"><span>Harga dasar menu (Rp)</span><input aria-label="Harga dasar menu" inputMode="numeric" value={base} onChange={e=>setBase(e.target.value)}/></label>
 <p className="hint">Harga pilihan ditambahkan ke harga dasar. Isi 0 jika harga tidak berubah. <Star aria-hidden="true" className="default-star"/> Pilihan pertama otomatis dipilih.</p>
 {rows.map((v,i)=><section className="variable-definition" key={v.id}><div className="variable-definition-head"><label className="field"><span>Nama varian {i+1}</span><input aria-label={`Nama varian ${i+1}`} value={v.name} maxLength={40} placeholder="Contoh: Ukuran cup" onChange={e=>edit(v.id,{name:e.target.value})}/></label><button className="icon-button" aria-label={`Hapus varian ${v.name||i+1}`} onClick={()=>setRows(old=>old.filter(x=>x.id!==v.id))}><Trash2 aria-hidden="true"/></button></div>
 <label className="field"><span>Kasir boleh memilih</span><select aria-label={`Cara memilih ${v.name||i+1}`} value={v.multiple?'multiple':'single'} onChange={e=>edit(v.id,{multiple:e.target.value==='multiple'})}><option value="single">Satu pilihan</option><option value="multiple">Beberapa pilihan</option></select></label>
 <div className="variable-value-list">{v.options.map((option,j)=><div className="variable-value" key={j}><label className="field"><span>Pilihan {j+1}{j===0&&<span className="default-choice"><Star aria-hidden="true"/> Default</span>}</span><input aria-label={`Pilihan ${j+1} ${v.name||i+1}`} maxLength={40} value={option} placeholder="Nama pilihan" onChange={e=>{const options=v.options.map((x,k)=>k===j?e.target.value:x);edit(v.id,{options,prices:{...v.prices,[e.target.value]:v.prices?.[option]??0}});}}/></label><label className="field option-price"><span>Tambahan (Rp)</span><input type="number" min="0" step="1" aria-label={`Tambahan harga pilihan ${j+1} ${v.name||i+1}`} value={Number.isFinite(v.prices?.[option]??0)?v.prices?.[option]??0:''} onChange={e=>edit(v.id,{prices:{...v.prices,[option]:e.target.value===''?NaN:Number(e.target.value)}})}/></label><button className="icon-button" aria-label={`Hapus pilihan ${j+1} ${v.name}`} disabled={v.options.length===1} onClick={()=>edit(v.id,{options:v.options.filter((_,k)=>k!==j)})}><Trash2 aria-hidden="true"/></button></div>)}</div>
 <button className="text-button" disabled={v.options.length>=30} onClick={()=>edit(v.id,{options:[...v.options,''],prices:{...v.prices,'':0}})}><Plus aria-hidden="true"/>Pilihan</button>
 </section>)}
 <div className="variable-add"><button disabled={rows.length>=12} onClick={()=>setRows(old=>[...old,{id:id(),name:'',multiple:false,pricing:'free',options:[''],defaults:[],prices:{'':0}}])}><Plus aria-hidden="true"/>Varian</button></div>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="variable-footer"><button onClick={onClose}>Batal</button><button className="primary" onClick={apply}>Terapkan varian</button></div>
 </div></DialogContent></Dialog>;
}
