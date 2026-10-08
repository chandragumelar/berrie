'use client';
import React from 'react';
import {Popover} from 'radix-ui';
import {ChevronDown} from 'lucide-react';
import type {MenuVariable} from '@/lib/berrie/menu-variables';
export function VariablePicker({variable:v,value,onChange,label,disabled=false}:{variable:MenuVariable;value:string[];onChange:(value:string[])=>void;label?:string;disabled?:boolean}){
 const name=label??v.name;
 if(!v.multiple)return <select aria-label={name} disabled={disabled} value={value[0]??''} onChange={e=>onChange(e.target.value?[e.target.value]:[])}><option value="">-</option>{v.options.map(x=><option key={x} value={x}>{x}</option>)}</select>;
 return <Popover.Root><Popover.Trigger asChild><button type="button" className="variable-trigger" aria-label={name} disabled={disabled}>{value.length?value.join(' + '):'-'}<ChevronDown aria-hidden="true" size={16}/></button></Popover.Trigger><Popover.Portal><Popover.Content className="variable-popover" sideOffset={4} collisionPadding={12} align="start"><p>{v.name} · Pilih beberapa</p><button type="button" className="text-button" onClick={()=>onChange([])}>- · Kosongkan pilihan</button><div className="variable-options">{v.options.map(x=><label key={x} className="plain-tick"><input type="checkbox" checked={value.includes(x)} onChange={e=>onChange(v.options.filter(option=>option===x?e.target.checked:value.includes(option)))}/>{x}{v.pricing==='extra'&&!!v.prices?.[x]?` +Rp${v.prices[x].toLocaleString('id-ID')}`:''}</label>)}</div><Popover.Close asChild><button type="button">Selesai</button></Popover.Close></Popover.Content></Popover.Portal></Popover.Root>;
}
