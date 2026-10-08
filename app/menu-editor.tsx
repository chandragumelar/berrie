'use client';
import React,{useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {Field,Choice,Tick} from './berrie-controls';
import {configuredTypes,autoAliases,nextSKUCode} from '@/lib/berrie/menu-config';
import {stockKey} from '@/lib/berrie/shared-stock';
import {hasCountedStock,type State,type SKU} from '@/lib/berrie/domain';
type VariantDraft={key:number;sku?:string;variant:string;price:string;stock:string;GoFood:string;GrabFood:string;ShopeeFood:string};
const blankVariant=(key:number):VariantDraft=>({key,variant:'',price:'',stock:'',GoFood:'',GrabFood:'',ShopeeFood:''});
export function MenuEditor({state,sku,template,busy,onSave,onPromo}:{state:State;sku?:SKU;template?:SKU;busy:boolean;onSave:(data:Record<string,unknown>,reason:string)=>void;onPromo:(sku:SKU)=>void}){
 const source=sku??template;
 const [name,setName]=useState(source?.name??''),[type,setType]=useState(source?.type??'Normal'),[addingType,setAddingType]=useState(false),[customType,setCustomType]=useState(''),[category,setCategory]=useState(source?.category||'Tanpa kategori'),[threshold,setThreshold]=useState(String(source?.threshold??5)),[archived,setArchived]=useState(source?.archived??false),[reason,setReason]=useState('');
 const [variants,setVariants]=useState<VariantDraft[]>([source?{key:0,sku:sku?.id,variant:sku?.variant??'',price:String(source.price),stock:sku&&hasCountedStock(sku)?String(sku.stock):'',GoFood:String(source.channelPrices.GoFood||''),GrabFood:String(source.channelPrices.GrabFood||''),ShopeeFood:String(source.channelPrices.ShopeeFood||'')}:blankVariant(0)]),[hasVariants,setHasVariants]=useState(!!template||!!sku&&sku.variant!=='Reguler');
 const [toppingIds,setToppingIds]=useState(source?.toppings??[]),[newToppings,setNewToppings]=useState<{key:number;name:string;price:string}[]>([]),[showToppings,setShowToppings]=useState(!!source?.toppings.length);
 const updateRow=(key:number,field:string,value:string)=>setVariants(rows=>rows.map(row=>row.key===key?{...row,[field]:value}:row));
 const selectedType=addingType?customType.trim()||'Normal':type,types=configuredTypes(state),aliases=autoAliases([...types,...types.includes(selectedType)?[]:[selectedType]],state.settings.typeAliases),alias=aliases[selectedType];
 const enabled=state.settings.enabledChannels??[];
 return <>
  <Field label="Nama menu" value={name} maxLength={80} onChange={setName}/>
  <div className="inline fields"><Choice label="Tipe" value={addingType?'+ Tambah tipe':type} options={[...types,'+ Tambah tipe']} onChange={v=>{setAddingType(v==='+ Tambah tipe');if(v!=='+ Tambah tipe')setType(v);}}/><label className="field"><span>Kode unik</span><input aria-label="Kode unik" readOnly value={alias}/></label></div>
  {addingType&&<Field label="Nama tipe baru" value={customType} maxLength={40} onChange={setCustomType} placeholder="Contoh: Spesial"/>}
  <p className="hint">Kode tipe tampil di Kasir. Kode menu {sku?.code??nextSKUCode(state.catalog,alias)} dibuat otomatis.</p>
  {selectedType==='Paket'&&<p className="hint">Tipe Paket adalah label menu dengan stok sendiri.</p>}
  {selectedType==='Promo'&&<p className="hint">Diskon diatur melalui Atur promo SKU setelah menu disimpan.</p>}
  <Choice label="Kategori" value={category} options={[...new Set(['Tanpa kategori',...(state.settings.menuCategories??[]),...source?.category?[source.category]:[]])]} onChange={setCategory}/>
  {!state.settings.menuCategories?.length&&<p className="hint">Tambahkan kategori di Pengaturan → Kategori menu.</p>}
  <Tick label="Menu ini punya pilihan ukuran / rasa" value={hasVariants} onChange={v=>{setHasVariants(v);if(!v&&!sku)setVariants([variants[0]]);}} disabled={!!sku||!!template}/>
  <section className="menu-variant-section" aria-label="Varian / ukuran">
   {variants.map((row,index)=><div className="menu-variant-row" key={row.key}>
    {hasVariants&&<div className="variant-heading"><Field label="Ukuran / rasa" value={row.variant} maxLength={80} onChange={v=>updateRow(row.key,'variant',v)} placeholder={index===0?'Contoh: Regular':'Contoh: Medium'}/>{variants.length>1&&<button className="icon-button" aria-label={`Hapus pilihan ${row.variant||index+1}`} onClick={()=>setVariants(rows=>rows.filter(x=>x.key!==row.key))}><Trash2 aria-hidden="true"/></button>}</div>}
    <div className="inline fields"><Field label="Harga Toko (Rp)" value={row.price} type="number" onChange={v=>updateRow(row.key,'price',v)}/>{source&&hasCountedStock(source)?<div className="field"><span>Total stok</span><p>{source.stock} unit</p><small>Ubah melalui Tambah stok / Koreksi stok.</small></div>:<Field label="Total stok (wajib)" required type="number" value={row.stock} onChange={v=>updateRow(row.key,'stock',v)}/>}</div>
    {enabled.map(channel=><Field key={channel} label={`Harga ${channel} (Rp)`} type="number" value={row[channel as 'GoFood'|'GrabFood'|'ShopeeFood']} onChange={v=>updateRow(row.key,channel,v)}/>)}
   </div>)}
   {hasVariants&&!sku&&<button disabled={variants.length>=30} onClick={()=>setVariants(rows=>[...rows,blankVariant(Math.max(...rows.map(x=>x.key))+1)])}><Plus aria-hidden="true"/>Tambah ukuran / rasa</button>}
  </section>
  <Field label="Stok Minimal" value={threshold} type="number" onChange={setThreshold}/>
  <p className="hint">Peringatan muncul saat stok mencapai angka ini atau lebih rendah.</p>
  <Tick label="Tambahkan topping (opsional)" value={showToppings} onChange={setShowToppings}/>
  {showToppings&&<section className="menu-topping-section" aria-label="Topping">
   {state.toppings.map(top=><Tick key={top.id} label={`${top.name} +Rp${top.price.toLocaleString('id-ID')}`} value={toppingIds.includes(top.id)} onChange={v=>setToppingIds(ids=>v?[...ids,top.id]:ids.filter(x=>x!==top.id))}/>)}
   {newToppings.map(top=><div className="topping-row" key={top.key}><Field label="Nama topping" value={top.name} maxLength={80} onChange={v=>setNewToppings(tops=>tops.map(x=>x.key===top.key?{...x,name:v}:x))}/><Field label="Tambahan harga (Rp)" type="number" value={top.price} onChange={v=>setNewToppings(tops=>tops.map(x=>x.key===top.key?{...x,price:v}:x))}/><button className="icon-button" aria-label={`Hapus topping ${top.name||'baru'}`} onClick={()=>setNewToppings(tops=>tops.filter(x=>x.key!==top.key))}><Trash2 aria-hidden="true"/></button></div>)}
   <button onClick={()=>setNewToppings(tops=>[...tops,{key:Math.max(0,...tops.map(x=>x.key))+1,name:'',price:''}])}><Plus aria-hidden="true"/>Topping baru</button>
  </section>}
  {sku&&<><button onClick={()=>onPromo(sku)}>Atur promo SKU</button><Tick label="Arsipkan menu ini" value={archived} onChange={setArchived}/><Field label="Alasan perubahan" value={reason} onChange={setReason}/></>}
  <button className="primary" disabled={busy} onClick={()=>onSave({autoCode:true,sku:sku?.id,stockGroup:source?stockKey(source):undefined,recipes:source?.recipes,name,type:addingType?customType.trim():selectedType,requireVariants:hasVariants,category:category==='Tanpa kategori'?'':category,threshold,mode:'quantity',available:source?.available??true,archived,variants:variants.map(row=>({...row,variant:hasVariants?row.variant:'Reguler'})),toppings:showToppings?toppingIds:[],newToppings:showToppings?newToppings:[]},reason||(sku?'':'Menambahkan menu'))}>Simpan menu</button>
 </>;
}
