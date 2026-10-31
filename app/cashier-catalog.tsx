import type {ReactNode} from 'react';
import type {cashierRows} from '@/lib/berrie/cashier';
import type {SKU} from '@/lib/berrie/domain';

type Props={
 rows:ReturnType<typeof cashierRows>;
 controls:ReactNode;
 tabs:string[];
 activeTab:string;
 onTab:(tab:string)=>void;
 disabled:boolean;
 isSimple:(sku:SKU)=>boolean;
 onChoose:(skus:SKU[])=>void;
 onClear:()=>void;
};

export function CashierCatalog({rows,controls,tabs,activeTab,onTab,disabled,onChoose,onClear,isSimple}:Props){
 return <section className="catalog cashier-catalog" aria-label="Pilih menu">
  {controls}
  <div className="category-tabs" role="group" aria-label="Filter menu">{tabs.map(tab=><button key={tab} aria-pressed={activeTab===tab} onClick={()=>onTab(tab)}>{tab}</button>)}</div>
  <div className="catalog-scroll cashier-menu-grid">{rows.map(row=>{
   const sku=row.skus[0];
   const unavailable=disabled||row.unavailable;
   return <article className="cashier-menu-card" key={row.key} data-unavailable={row.unavailable||undefined}>
    <button className="cashier-menu-add" aria-label={`Pilih ${row.name}`} aria-haspopup={isSimple(sku)?undefined:"dialog"} disabled={unavailable} onClick={()=>onChoose(row.skus)}>
     <span className="cashier-menu-type">{row.skus.length>1?'Pilihan tersedia':!isSimple(sku)?'Pilihan tersedia':''}{row.promoLabel&&<span> · {row.promoLabel}</span>}{sku.stock>0&&sku.stock<=sku.threshold&&<span> · Sisa {sku.stock}</span>}</span>
     <span className="cashier-menu-name">{row.name}</span>
     <span className="cashier-menu-bottom"><span>Rp{row.price||'—'}</span></span>
    </button>
    {row.reason&&<p className="cashier-menu-reason">{sku.stock===0?'Habis':row.reason}</p>}
   </article>;
  })}{!rows.length&&<div className="empty"><h3>{activeTab==='Favorit'?'Tidak ada favorit yang cocok':'Menu tidak ditemukan'}</h3>{activeTab==='Favorit'&&<p>Pilih dan urutkan favorit di Menu &amp; Stok → Favorit.</p>}<button onClick={onClear}>{activeTab==='Favorit'?'Lihat semua menu':'Hapus filter'}</button></div>}</div>
 </section>;
}
