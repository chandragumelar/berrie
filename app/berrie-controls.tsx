import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableHead, TableBody, TableRow } from '@/components/ui/table';
export const names:Record<string,string>={owner:'Maya · Owner',a:'Rani · Kasir',b:'Budi · Kasir'};
export function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}) {return <label className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue/></SelectTrigger><SelectContent position="popper" align="start">{options.map(o=><SelectItem key={o} value={o}>{names[o]??o}</SelectItem>)}</SelectContent></Select></label>;}
export function Field({label,value,onChange,type='text',placeholder='',maxLength,multiline=false}:{label:string;value:string;onChange:(s:string)=>void;type?:string;placeholder?:string;maxLength?:number;multiline?:boolean}) {return <label className="field"><span>{label}</span><>{multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3}/>:<input value={value} onChange={e=>{if(type!=='number'||/^[0-9.,]*$/.test(e.target.value))onChange(e.target.value);}} type={type==='number'?'text':type} inputMode={type==='number'?'numeric':undefined} placeholder={placeholder} maxLength={maxLength}/>}</></label>;}
export function MoneyField({label,value,onChange,placeholder='0'}:{label:string;value:string;onChange:(s:string)=>void;placeholder?:string}) {return <Field label={label} value={value?Number(value).toLocaleString('id-ID'):''} onChange={v=>{if(/^[0-9.]*$/.test(v))onChange(v.replaceAll('.',''));}} type="number" placeholder={placeholder}/>;}
export function ServingControl({value,onChange,disabled=false}:{value:string;onChange:(v:string)=>void;disabled?:boolean}) {return <div className="serving" role="group" aria-label="Penyajian item">{['Bungkus','Makan di tempat'].map(v=><button key={v} aria-pressed={value===v} disabled={disabled} onClick={()=>onChange(v)}>{v}</button>)}</div>;}
export function Tick({label,value,onChange,disabled=false}:{label:string;value:boolean;onChange:(b:boolean)=>void;disabled?:boolean}) {return <label className="tick"><Checkbox checked={value} onCheckedChange={v=>onChange(v===true)} disabled={disabled}/><span>{label}</span></label>;}
export function DataTable({heads,children,label,scroll=false}:{heads:string[];children:React.ReactNode;label:string;scroll?:boolean}) {return <div className={`data-table ${scroll?'scroll-table':''}`} role={scroll?'region':undefined} aria-label={label} tabIndex={scroll?0:undefined}><Table><TableHeader><TableRow>{heads.map((h,i)=><TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{children}</TableBody></Table></div>;}
export function Badge({children,tone='plain'}:{children:React.ReactNode;tone?:string}) {return <span className={`badge ${tone}`}>{children}</span>;}

export function QuantityField({value,onChange}:{value:string;onChange:(v:string)=>void}) {
 const quantity=Number(value);
 return <label className="field"><span>Jumlah</span><span className="stepper">
  <button type="button" aria-label="Kurangi jumlah" disabled={!Number.isSafeInteger(quantity)||quantity<=1} onClick={()=>onChange(String(quantity-1))}>−</button>
  <input aria-label="Jumlah" inputMode="numeric" value={value} onChange={e=>{if(/^[0-9]*$/.test(e.target.value))onChange(e.target.value);}}/>
  <button type="button" aria-label="Tambah jumlah" disabled={!Number.isSafeInteger(quantity)||quantity>=999} onClick={()=>onChange(String(quantity+1))}>+</button>
 </span></label>;
}
