'use client';
import React,{useState,useEffect} from 'react';
import {Plus,Search} from 'lucide-react';
import {catalogDraft,type MenuRow,type OnlineRecap} from '@/lib/berrie/workshop';
import {menuGroups,filterMenuGroups} from '@/lib/berrie/menu-list';
import {configuredTypes} from '@/lib/berrie/menu-config';
import {type State,type Action,type Channel,id} from '@/lib/berrie/domain';
import {combinationLabel} from '@/lib/berrie/menu-variables';
import {DiscountWorkspace} from './discount-workspace';
import {actorName} from '@/lib/berrie/staff';
import {FavoriteWorkspace} from './favorite-workspace';
import {TaxonomyWorkspace} from './taxonomy-workspace';
import {MenuBulk} from './menu-bulk';
import {MenuDetail} from './menu-detail';
import {StockWorkspace} from './stock-workspace';
import {RecapWorkspace} from './recap-workspace';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
type Props={channelContext?:Channel|null;state:State;hidden:boolean;tab:string;setTab:(tab:string)=>void;busy:boolean;onSave:(a:Action)=>Promise<State|undefined>;onCorrection:(recap:OnlineRecap)=>void;onCheckResult?:()=>void;onDirtyChange:(dirty:boolean)=>void;onOrder:(id:string)=>void};
const blank=():MenuRow=>({key:id(),group:id(),name:'',flavour:'',size:'',variables:[],variableValues:{},category:'',type:'Normal',price:'',stock:'',threshold:'5',available:true,archived:false,toppings:[],recipes:[]});
const makeAction=(kind:string,data:Record<string,unknown>,activity:Action['activity'],reason:string):Action=>({kind,activity,data,reason,amount:0});
const atTime=(n:number)=>new Date(n).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function MenuWorkspace({channelContext,state:s,hidden,tab,setTab,busy,onSave,onCorrection,onCheckResult,onDirtyChange,onOrder}:Props){
 const [taxonomyDirty,setTaxonomyDirty]=useState(false);
 const [taxonomy,setTaxonomy]=useState<''|'category'|'type'>('');
 const [discountDirty,setDiscountDirty]=useState(false);
 const [rows,setRows]=useState(()=>catalogDraft(s)),[base,setBase]=useState(s.catalog),[query,setQuery]=useState(''),[localError,setLocalError]=useState('');
 const [newMenu,setNewMenu]=useState<MenuRow|null>(null);
 const [selectedGroup,setSelectedGroup]=useState<string|null>(null),[categoryFilter,setCategoryFilter]=useState(''),[statusFilter,setStatusFilter]=useState('');
 const [bulk,setBulk]=useState(false),[bulkSelected,setBulkSelected]=useState<string[]>([]),[bulkForm,setBulkForm]=useState(false);
 const [detailDirty,setDetailDirty]=useState(false);
 const [deletingMenu,setDeletingMenu]=useState(''),[deleteGroup,setDeleteGroup]=useState<string|null>(null),[deleteError,setDeleteError]=useState('');
 const [stockDirty,setStockDirty]=useState(false),[recapDirty,setRecapDirty]=useState(false),[recapId,setRecapId]=useState('');
 if(base!==s.catalog){setBase(s.catalog);setRows(catalogDraft(s));}
 const recorded=(hash:string)=>!!hash&&Object.values(s.operations).some(op=>op.hash===hash);
 if(recorded(deletingMenu)){setDeletingMenu('');setDeleteGroup(null);}

 const add=()=>{setSelectedGroup(null);setNewMenu({...blank(),type:configuredTypes(s)[0]??''});};
 const switchMenu=(group:string)=>{if(detailDirty&&!window.confirm('Buang perubahan menu yang belum disimpan? Pilih Batal untuk lanjut mengedit.'))return;setNewMenu(null);setSelectedGroup(group);};
 const listGroups=filterMenuGroups(menuGroups(rows),query,categoryFilter,statusFilter);
 const createLabel=async(kind:'category'|'type',name:string)=>{const n=await onSave(makeAction('taxonomy',{kind,operation:'add',name},'Pengaturan','Menambah '+name));return !!n;};
 const hasDraft=tab==='Diskon'&&discountDirty||taxonomyDirty||detailDirty||bulkForm||stockDirty||recapDirty||!!newMenu;
 useEffect(()=>{onDirtyChange(hasDraft);},[hasDraft,onDirtyChange]);
 useEffect(()=>{const discard=()=>{setNewMenu(null);setSelectedGroup(null);setTaxonomy('');setBulkForm(false);setBulkSelected([]);};window.addEventListener('berrie-discard-editor',discard);return()=>window.removeEventListener('berrie-discard-editor',discard);},[]);
 useEffect(()=>{if(!hasDraft)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[hasDraft]);

 return <section hidden={hidden} className="panel menu-workspace" aria-label="Pengelolaan menu dan stok">
 {tab!=='Diskon'&&<div className="workspace-toolbar"><div className="filter-tabs" role="group" aria-label="Bagian Menu dan Stok">{['Menu','Stok','Favorit','Rekap online'].map(x=><button key={x} disabled={busy} aria-pressed={tab===x} onClick={()=>{if(x!==tab&&(detailDirty||stockDirty||recapDirty||taxonomyDirty)&&!window.confirm('Buang perubahan yang belum disimpan?'))return;if(x!==tab&&(stockDirty||recapDirty))window.dispatchEvent(new Event('berrie-discard-editor')); if(x!==tab){setSelectedGroup(null);setNewMenu(null);}setTab(x);setLocalError('');}}>{x}{(x==='Menu'&&detailDirty||x==='Stok'&&stockDirty||x==='Rekap online'&&recapDirty)?' · Belum disimpan':''}</button>)}</div>{tab==='Menu'&&<button className="primary" onClick={add} disabled={busy||detailDirty||s.actor!=='owner'}><Plus aria-hidden="true"/>Menu</button>}</div>}
 {tab==='Favorit'&&<FavoriteWorkspace state={s} busy={busy} onSave={onSave}/>}
 {tab==='Menu'&&<><button disabled={busy||detailDirty||s.actor!=='owner'} onClick={()=>{if(taxonomyDirty&&!window.confirm('Buang perubahan yang belum disimpan?'))return;setTaxonomy(taxonomy?'':'category');}}>{taxonomy?'Kembali ke Menu':'Kelola kategori & tipe'}</button>{taxonomy&&<><div className="filter-tabs"><button aria-pressed={taxonomy==='category'} onClick={()=>{if(!taxonomyDirty||window.confirm('Buang perubahan yang belum disimpan?'))setTaxonomy('category');}}>Kategori menu</button><button aria-pressed={taxonomy==='type'} onClick={()=>{if(!taxonomyDirty||window.confirm('Buang perubahan yang belum disimpan?'))setTaxonomy('type');}}>Tipe menu</button></div><TaxonomyWorkspace key={taxonomy} state={s} kind={taxonomy} busy={busy} onDirty={setTaxonomyDirty} onSave={onSave} onCheckResult={onCheckResult}/></>}<div hidden={!!taxonomy}><div className="workspace-search"><label className="search"><Search aria-hidden="true"/><input aria-label="Cari menu" disabled={bulkForm} value={query} placeholder="Cari menu atau pilihan…" onChange={e=>{setQuery(e.target.value);setBulkSelected([]);}}/></label><label>Kategori <select disabled={bulkForm} value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setBulkSelected([]);}}><option value="">Semua</option>{(s.settings.menuCategories??[]).map(c=><option key={c}>{c}</option>)}</select></label><label>Status jual <select disabled={bulkForm} value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setBulkSelected([]);}}><option value="">Semua</option>{['Dijual','Tidak dijual','Sebagian dijual'].map(x=><option key={x}>{x}</option>)}</select></label><button disabled={bulkForm} onClick={()=>{setQuery('');setCategoryFilter('');setStatusFilter('');setBulkSelected([]);}}>Reset filter</button></div>
 <div className="bulk-toolbar"><button disabled={bulkForm||detailDirty||busy||s.actor!=='owner'} onClick={()=>{setBulk(!bulk);setBulkSelected([]);setSelectedGroup(null);}}>{bulk?'Selesai edit massal':'Edit massal'}</button>{bulk&&<><label><input type="checkbox" disabled={bulkForm} checked={listGroups.length>0&&listGroups.every(g=>bulkSelected.includes(g.id))} onChange={e=>setBulkSelected(e.target.checked?listGroups.map(g=>g.id):[])}/> Pilih semua hasil</label><span>{bulkSelected.length} menu terpilih</span><button disabled={!bulkSelected.length||busy} onClick={()=>setBulkForm(true)}>Atur perubahan</button></>}</div>
 {bulkForm&&<MenuBulk state={s} groups={listGroups} selected={bulkSelected} busy={busy} onSave={onSave} onCheckResult={onCheckResult} onClose={()=>{setBulkForm(false);setBulkSelected([]);}}/>}
 <div className="menu-list-editor"><div className="menu-list" aria-label="Daftar menu"><div className="menu-list-head" aria-hidden="true"><span>Nama menu</span><span>Kategori</span><span>Harga Toko</span><span>Status jual</span><span>Aksi</span></div>{listGroups.map(g=><article key={g.id} className="menu-list-row"><div>{bulk&&<label><input type="checkbox" disabled={bulkForm} checked={bulkSelected.includes(g.id)} onChange={e=>setBulkSelected(e.target.checked?[...bulkSelected,g.id]:bulkSelected.filter(id=>id!==g.id))}/> Pilih {g.name}</label>}<button className="text-button" disabled={bulk||busy} onClick={()=>switchMenu(g.id)}>{g.name}</button></div><span>{g.category}</span><span>Rp{g.minPrice===g.maxPrice?g.minPrice.toLocaleString('id-ID'):`${g.minPrice.toLocaleString('id-ID')}–${g.maxPrice.toLocaleString('id-ID')}`}</span><span>{g.status}</span><div><button disabled={bulk||busy} onClick={()=>switchMenu(g.id)}>Edit</button><details><summary>Aksi lainnya</summary><button disabled={busy||detailDirty||s.actor!=='owner'} onClick={()=>{setDeleteGroup(g.id);setDeleteError('');}}>Hapus menu</button></details></div>{g.rows.length>1&&<details><summary>{g.rows.length} kombinasi</summary>{g.rows.map(r=><p key={r.key}>{combinationLabel(r.variables??[],r.variableValues??{})} · Rp{Number(r.price).toLocaleString('id-ID')} · {r.category} · {r.available?'Dijual':'Tidak dijual'}</p>)}</details>}</article>)}{!listGroups.length&&<p className="empty">Tidak ada menu yang cocok. Ubah atau reset filter.</p>}</div>
 {(selectedGroup||newMenu)&&<MenuDetail initialChannel={channelContext} key={selectedGroup??newMenu!.group} initial={newMenu?[newMenu]:rows.filter(r=>r.group===selectedGroup)} isNew={!!newMenu} state={s} busy={busy} onSave={onSave} onCheckResult={onCheckResult} onCreateLabel={createLabel} onDirty={setDetailDirty} onClose={()=>{setSelectedGroup(null);setNewMenu(null);}}/>}</div>

 </div></>}
 {tab==='Menu'&&!taxonomy&&<details className="stock-history"><summary>Log menu dihapus · {s.audits.filter(x=>x.action==='deleteMenu').length}</summary><div className="sheet-scroll"><table><thead><tr><th>Tanggal & jam</th><th>Pelaku</th><th>Menu</th><th>Keterangan</th></tr></thead><tbody>{s.audits.filter(x=>x.action==='deleteMenu').slice().reverse().map(x=><tr key={x.id}><td>{atTime(x.time)}</td><td>{actorName(s,x.actor)}</td><td>{x.object}</td><td>{x.reason}</td></tr>)}</tbody></table></div>{!s.audits.some(x=>x.action==='deleteMenu')&&<p className="hint">Belum ada menu dihapus.</p>}</details>}
 <div hidden={tab!=='Stok'}><StockWorkspace state={s} busy={busy} onSave={onSave} onCheckResult={onCheckResult} onDirty={setStockDirty} onRecap={id=>{setRecapId(id);setTab('Rekap online');}} onOrder={onOrder}/></div>
 <div hidden={tab!=='Rekap online'}><RecapWorkspace state={s} busy={busy} onSave={onSave} onCorrection={onCorrection} onCheckResult={onCheckResult} onDirty={setRecapDirty} selectedId={recapId} onSelect={setRecapId}/></div>
 {tab==='Diskon'&&<DiscountWorkspace onDirtyChange={setDiscountDirty} state={s} busy={busy} onSave={onSave} onCheckResult={onCheckResult}/>}
 {deleteGroup&&<Dialog open onOpenChange={open=>{if(!open&&!busy)setDeleteGroup(null);}}><DialogContent className="berrie-dialog"><DialogTitle>Hapus menu {rows.find(r=>r.group===deleteGroup)?.name}?</DialogTitle><DialogDescription>Seluruh varian menu ini akan hilang dari daftar Menu, Stok dan Kasir. Riwayat transaksi serta log stok tetap tersimpan.</DialogDescription>{deleteError&&<p className="error" role="alert">{onCheckResult?'Hasil hapus belum diketahui. Periksa operasi yang sama.':deleteError}</p>}{onCheckResult&&<button onClick={onCheckResult}>Periksa hasil operasi</button>}<div className="variable-footer"><button disabled={busy} onClick={()=>setDeleteGroup(null)}>Batal</button><button className="danger" disabled={busy} onClick={async()=>{const operation=makeAction('deleteMenu',{group:deleteGroup,confirmed:true},'Arsip menu','Menghapus menu '+rows.find(r=>r.group===deleteGroup)?.name);setDeletingMenu(JSON.stringify(operation));const n=await onSave(operation);if(n){setRows(catalogDraft(n));setBase(n.catalog);setDeleteGroup(null);}else setDeleteError('Menu belum dihapus. Periksa pesanan aktif atau pesan penyimpanan, lalu coba lagi.');}}>Ya, hapus menu</button></div></DialogContent></Dialog>}
 {localError&&<p className="error" role="alert">{localError}</p>}
 </section>;
}
