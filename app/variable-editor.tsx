'use client';
import React,{useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {type MenuRow} from '@/lib/berrie/workshop';
import {optionPriceDraft,applyOptionPrices} from '@/lib/berrie/option-prices';
import {type MenuVariable} from '@/lib/berrie/menu-variables';
import {VariantFields} from './variant-fields';
export function VariableEditor({name,value,prices,channels,onApply,onClose}:{name:string;value:MenuVariable[];prices:MenuRow[];channels:string[];onApply:(variables:MenuVariable[],prices:MenuRow[])=>void;onClose:()=>void}){
 const [initial]=useState(()=>optionPriceDraft(value,prices));
 const [rows,setRows]=useState<MenuVariable[]>(initial.variables),[base,setBase]=useState(initial.base),[error,setError]=useState(initial.error);
 const apply=()=>{try{if(initial.error)throw Error(initial.error);const next=applyOptionPrices(rows,base,prices,channels);onApply(next.variables,next.prices);}catch(e){setError((e as Error).message);}};
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="berrie-dialog variable-dialog"><DialogTitle>Varian · {name||'Menu baru'}</DialogTitle><DialogDescription className="sr-only">Atur harga dasar dan pilihan varian menu.</DialogDescription><div className="dialog-body">
 <label className="field variant-base"><span>Harga dasar menu (Rp)</span><input aria-label="Harga dasar menu" inputMode="numeric" value={base} onChange={e=>setBase(e.target.value)}/></label>
 <VariantFields rows={rows} onChange={next=>{setRows(next);setError('');}}/>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="variable-footer"><button onClick={onClose}>Batal</button><button className="primary" onClick={apply}>Terapkan varian</button></div>
 </div></DialogContent></Dialog>;
}
