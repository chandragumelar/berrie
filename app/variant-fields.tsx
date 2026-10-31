import React from 'react';
import {Plus,Trash2} from 'lucide-react';
import {id} from '@/lib/berrie/domain';
import {type MenuVariable} from '@/lib/berrie/menu-variables';

export function VariantFields({rows,onChange}:{rows:MenuVariable[];onChange:(rows:MenuVariable[])=>void}){
 const edit=(key:string,changes:Partial<MenuVariable>)=>onChange(rows.map(v=>v.id===key?{...v,...changes}:v));
 return <div className="variant-fields">
 {rows.map((v,i)=><section className="variable-definition" key={v.id}><div className="variable-definition-head"><label className="field"><span>Nama varian {i+1}</span><input aria-label={`Nama varian ${i+1}`} value={v.name} maxLength={40} placeholder="Contoh: Ukuran cup" onChange={e=>edit(v.id,{name:e.target.value})}/></label><button type="button" className="icon-button" aria-label={`Hapus varian ${v.name||i+1}`} onClick={()=>onChange(rows.filter(x=>x.id!==v.id))}><Trash2 aria-hidden="true"/></button></div>
 <label className="field"><span>Kasir boleh memilih</span><select aria-label={`Cara memilih ${v.name||i+1}`} value={v.multiple?'multiple':'single'} onChange={e=>edit(v.id,{multiple:e.target.value==='multiple'})}><option value="single">Satu pilihan</option><option value="multiple">Beberapa pilihan</option></select></label>
 <div className="variable-value-list">{v.options.map((option,j)=><div className="variable-value" key={j}><label className="field"><span>Pilihan {j+1}</span><input aria-label={`Pilihan ${j+1} ${v.name||i+1}`} maxLength={40} value={option} placeholder="Nama pilihan" onChange={e=>{const options=v.options.map((x,k)=>k===j?e.target.value:x);edit(v.id,{options,prices:{...v.prices,[e.target.value]:v.prices?.[option]??0}});}}/></label><label className="field option-price"><span>Tambahan (Rp)</span><input type="number" min="0" step="1" aria-label={`Tambahan harga pilihan ${j+1} ${v.name||i+1}`} value={Number.isFinite(v.prices?.[option]??0)?v.prices?.[option]??0:''} onChange={e=>edit(v.id,{prices:{...v.prices,[option]:e.target.value===''?NaN:Number(e.target.value)}})}/></label><button type="button" className="icon-button" aria-label={`Hapus pilihan ${j+1} ${v.name}`} disabled={v.options.length===1} onClick={()=>edit(v.id,{options:v.options.filter((_,k)=>k!==j)})}><Trash2 aria-hidden="true"/></button></div>)}</div>
 <button type="button" className="text-button" disabled={v.options.length>=30} onClick={()=>edit(v.id,{options:[...v.options,''],prices:{...v.prices,'':0}})}><Plus aria-hidden="true"/>Pilihan</button>
 </section>)}
 <div className="variable-add"><button type="button" disabled={rows.length>=12} onClick={()=>onChange([...rows,{id:id(),name:'',multiple:false,pricing:'free',options:[''],defaults:[],prices:{'':0}}])}><Plus aria-hidden="true"/>Varian</button></div>
 </div>;
}
