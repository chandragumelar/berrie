'use client';
import React,{useRef,useEffect} from 'react';
import {Choice} from './berrie-controls';
import {financeLabel,money,type Order} from '@/lib/berrie/domain';
import {partitionOrders,queryOrders,orderSummary,orderAmounts,servingProgress,waitingLabel,type OrderQuery,type OrderGroup} from '@/lib/berrie/orders-workspace';
export function OrdersWorkspace({orders,query,onQuery,selected,onSelect,detail,showDetail,onBack,now,zone,disabled}:{orders:Order[];query:OrderQuery;onQuery:(q:OrderQuery)=>boolean;selected:string;onSelect:(o:Order)=>void;detail:React.ReactNode;showDetail:boolean;onBack:()=>void;now:number;zone:string;disabled:boolean}){
 const detailPanel=useRef<HTMLElement>(null);
 useEffect(()=>{detailPanel.current?.scrollTo(0,0);},[selected]);
 const list=useRef<HTMLDivElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
 const groups=partitionOrders(orders),rows=queryOrders(orders,query);
 const reset=()=>onQuery({...query,search:'',work:'Semua',payment:'Semua'});
 const date=(time:number|undefined)=>time&&Number.isFinite(time)?new Date(time).toLocaleString('id-ID',{timeZone:zone}):'Waktu tidak tersedia';
 return <div className={`orders-workspace ${showDetail?'show-order-detail':''}`}>
 <section className="orders-list" aria-label="Daftar pesanan" ref={list}>
 <div className="orders-controls"><div className="filter-tabs" role="group" aria-label="Kelompok pesanan">{(['Aktif','Tersimpan'] as OrderGroup[]).map(group=><button key={group} disabled={disabled} aria-pressed={query.group===group} onClick={()=>{if(onQuery({group,search:'',work:'Semua',payment:'Semua'}))list.current?.scrollTo(0,0);}}>{group} ({groups[group].length})</button>)}</div>
 <label className="search"><span className="sr-only">Cari pesanan</span><input aria-label="Cari pesanan" placeholder="Nomor, nama, atau ID platform…" value={query.search} disabled={disabled} onChange={e=>onQuery({...query,search:e.target.value})}/></label>
 {query.group==='Aktif'&&<div className="orders-filters"><Choice disabled={disabled} label="Pengerjaan" value={query.work} options={['Semua','Belum disajikan','Sudah disajikan']} onChange={work=>onQuery({...query,work})}/><Choice disabled={disabled} label="Pembayaran" value={query.payment} options={['Semua','Belum bayar','Lunas']} onChange={payment=>onQuery({...query,payment})}/></div>}</div>
 <div className="orders-entries">{rows.map(order=>{const p=servingProgress(order),summary=orderSummary(order),amount=orderAmounts(order);return <button className="order-entry" key={order.id} disabled={disabled} aria-pressed={selected===order.id} onClick={e=>{lastTrigger.current=e.currentTarget;onSelect(order);requestAnimationFrame(()=>document.querySelector<HTMLElement>('.orders-detail h2')?.focus());}}>
 <span className="order-entry-title"><strong>{order.number.slice(-4)} · {order.identity}</strong>{selected===order.id&&<span className="order-selected">✓ Dipilih</span>}</span><span>{order.channel}{order.externalId?' · '+order.externalId:''}</span>
 <span className="order-summary">{summary.slice(0,2).map((line,i)=><span key={i}>{line}</span>)}{summary.length>2&&<span>+{summary.length-2} baris lainnya</span>}</span>
 {query.group==='Aktif'?<><span className="order-entry-status"><span>{p.served}/{p.total} disajikan</span><span>{financeLabel(order)}</span></span><strong>Sisa tagihan {money(amount.unpaid)}</strong>{p.pending>0&&<span>{waitingLabel(order,now)}</span>}{amount.refundDue>0&&<span className="warning-text">Refund tertunda {money(amount.refundDue)}</span>}{order.units.some(u=>u.state==='draft')&&<span>Tambahan belum diminta dibuat</span>}</>:<><strong>Total draft {money(amount.draft)}</strong><span>Terakhir disimpan · {date(order.savedAt)}</span></>}
 </button>;})}</div>
 {!rows.length&&<div className="empty"><h3>{groups[query.group].length===0?query.group==='Aktif'?'Belum ada pesanan aktif':'Belum ada pesanan tersimpan':'Tidak ada hasil yang cocok'}</h3>{groups[query.group].length>0&&<button onClick={reset}>Reset pencarian dan filter</button>}</div>}
 </section><section ref={detailPanel} className="orders-detail" aria-label="Detail pesanan"><button className="orders-back" disabled={disabled} onClick={()=>{onBack();requestAnimationFrame(()=>lastTrigger.current?.focus({preventScroll:true}));}}>Kembali ke pesanan</button>{showDetail?detail:<div className="empty"><h2 tabIndex={-1}>Pilih pesanan untuk melihat detail</h2></div>}</section></div>;
}
