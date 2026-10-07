'use client';
import {useState} from 'react';
import {CircleAlert,CircleCheck,LoaderCircle,ShoppingBag,X} from 'lucide-react';
import {TableRow,TableCell} from '@/components/ui/table';
import {Badge,Choice,DataTable,Field,QuantityField,ServingControl,Tick} from './berrie-controls';

/** Visual fixtures only; this panel never calls transaction operations. */
export function ComponentReview({onOpenDialog}:{onOpenDialog:()=>void}) {
 const [search,setSearch]=useState(''),[note,setNote]=useState(''),[choice,setChoice]=useState('Toko');
 const [quantity,setQuantity]=useState('1'),[serving,setServing]=useState('Bungkus');
 const [checked,setChecked]=useState(false),[radio,setRadio]=useState('Tunai'),[toggle,setToggle]=useState(false),[promo,setPromo]=useState(false);
 return <details className="component-review">
  <summary>Komponen & aksesibilitas · D-49</summary>
  <p className="hint">Apple system / Inter lokal · isi 14/400, label 14/500, halaman 18/600, dialog 20/600, total 22/600. Target 44 px; kontrol utama 48 px.</p>
  <section className="review-section"><h3>Tombol dan keadaan</h3>
   <div className="component-row"><button className="primary">Utama</button><button>Sekunder</button><button className="text-button">Plain</button><button className="text-button danger">Batalkan</button><button className="icon-button" aria-label="Tutup contoh"><X aria-hidden="true"/></button><button disabled>Nonaktif</button><button className="primary" disabled aria-busy="true"><LoaderCircle aria-hidden="true" className="busy-spinner"/>Menyimpan…</button></div>
   <button className="review-floating primary"><ShoppingBag aria-hidden="true"/>Keranjang · 3 item · Rp45.000</button>
  </section>
  <section className="review-section"><h3>Form dan pilihan</h3>
   <Field label="Pencarian contoh" value={search} onChange={setSearch} placeholder="Cari menu atau varian…"/>
   <Choice label="Channel contoh" value={choice} onChange={setChoice} options={['Toko','GoFood','ShopeeFood']}/>
   <Field label="Catatan contoh · opsional" value={note} onChange={setNote} multiline placeholder="Tanpa gula, saus dipisah"/>
   <label className="field"><span>Uang diterima · contoh error</span><input aria-invalid="true" aria-describedby="review-field-error" value="10.000" readOnly inputMode="numeric"/><span id="review-field-error" className="field-error">Uang kurang Rp26.000. Isi nominal yang diterima.</span></label>
   <Tick label="Pembayaran sudah diperiksa" value={checked} onChange={setChecked}/>
   <Tick label="Pilihan nonaktif" value={false} onChange={()=>{}} disabled/>
   <fieldset className="review-radios"><legend>Metode contoh</legend>{['Tunai','QRIS'].map(v=><label className="tick" key={v}><input type="radio" name="review-method" value={v} checked={radio===v} onChange={()=>setRadio(v)}/>{v}</label>)}</fieldset>
   <button className="review-toggle" role="switch" aria-checked={toggle} onClick={()=>setToggle(!toggle)}><span className={`cash-track ${toggle?'on':''}`} aria-hidden="true"><span/></span>Pengaturan contoh · {toggle?'Aktif':'Nonaktif'}</button>
   <QuantityField value={quantity} onChange={setQuantity}/>
   <ServingControl value={serving} onChange={setServing}/>
   <div className="category-tabs"><button aria-pressed={promo} onClick={()=>setPromo(!promo)}>Sedang promo</button></div>
   <div className="component-row"><span className="tag">Besar</span><Badge>3 item</Badge><Badge tone="green"><CircleCheck aria-hidden="true"/>Lunas</Badge><Badge tone="warning"><CircleAlert aria-hidden="true"/>Perlu diperiksa</Badge></div>
  </section>
  <section className="review-section"><h3>Navigasi, tabel, dan fixture</h3>
   <div className="review-navigation"><button className="nav-button" data-active="true"><ShoppingBag aria-hidden="true"/>Kasir</button><button className="nav-button">Pengaturan</button></div>
   <div className="review-table"><DataTable heads={['Menu','Sisa','Diskon','Rp harga']} label="Fixture komponen">
    <TableRow><TableCell>Es Kopi Susu · Besar</TableCell><TableCell className="amount">10</TableCell><TableCell className="amount">10</TableCell><TableCell className="amount">18.000</TableCell></TableRow>
    <TableRow><TableCell>Es Teh<small>Stok tidak dihitung</small></TableCell><TableCell/><TableCell className="amount">0</TableCell><TableCell className="amount">5.000</TableCell></TableRow>
    <TableRow><TableCell>Kentang Goreng<small>Stok habis</small></TableCell><TableCell className="amount">0</TableCell><TableCell className="amount">0</TableCell><TableCell className="amount">15.000</TableCell></TableRow>
    <TableRow><TableCell>Roti Bakar Cokelat Keju Spesial Keluarga dengan Saus Cokelat dan Taburan Kacang Renyah</TableCell><TableCell className="amount">8</TableCell><TableCell className="amount">0</TableCell><TableCell className="amount">98.765.432</TableCell></TableRow>
   </DataTable></div>
   <dl className="totals"><div className="grand"><dt>Total contoh</dt><dd>Rp98.765.432</dd></div></dl>
   <div className="empty-cart"><ShoppingBag aria-hidden="true"/><h3>Keranjang masih kosong</h3><p>Pilih yang dipesan pelanggan.</p></div>
  </section>
  <section className="review-section"><h3>Feedback, overlay, dan material</h3>
   <p className="review-feedback good"><CircleCheck aria-hidden="true"/>Pembayaran contoh tercatat. Penyajian belum dicatat.</p>
   <p className="review-feedback review-warning"><CircleAlert aria-hidden="true"/>Hasil pencatatan belum diketahui. Periksa operasi yang sama sebelum mengulang penerimaan uang.</p>
   <p className="error">Perubahan belum tersimpan. Input tetap ada; coba simpan lagi setelah gangguan dimatikan.</p>
   <button onClick={onOpenDialog}>Buka dialog / sheet contoh</button>
   <p className="hint">Dropdown di atas menunjukkan popover. Form transaksi selalu solid.</p>
   <div className="review-material"><nav className="material-sample" aria-label="Contoh navigasi material"><button className="text-button">Kasir</button><span>Material</span></nav></div>
   <nav className="solid-sample" aria-label="Contoh fallback solid"><button className="text-button">Kasir</button><span>Fallback solid</span></nav>
   <p className="hint">Tab untuk memeriksa fokus; pointer untuk hover/pressed. Reduced motion, reduced transparency, increased contrast, dan forced colors memakai preferensi browser. Bukan hasil UT peserta.</p>
  </section>
 </details>;
}
