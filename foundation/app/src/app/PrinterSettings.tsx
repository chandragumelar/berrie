import { useEffect, useState } from 'react';
import type { OwnerCashier } from '../application/owner-cashier';
import type { PaperWidth, PrintableDocument } from '../domain/print-documents';
import { PrintDocumentView } from './SystemPrint';

const sample=(mode:'original'|'copy'):PrintableDocument=>({id:'printer-test',jobKey:'printer-test',orderId:'printer-test',kind:'customer',batch:null,title:'LUNAS',orderNumber:'COBA-001',customer:'Data fiktif',at:new Date().toISOString(),timeZone:'Asia/Jakarta',lines:[{name:'Kopi dengan nama sangat panjang untuk cek bungkus teks',quantity:1,choices:['Panas'],toppings:['Susu'],note:'Tanpa gula, mohon dibaca penuh',serving:'takeaway',cancelledQuantity:0}],settlement:{total:10000,method:'cash',received:10000,change:0},mode});
export function PrinterSettings({service,onTest}:{service:OwnerCashier;onTest:(document:PrintableDocument)=>void}){
 const [width,setWidth]=useState<PaperWidth>('58'),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void service.printerConfiguration().then(config=>{if(config){setWidth(config.paperWidth);setSaved(true);}}).catch(error=>setMessage(error instanceof Error?error.message:'Konfigurasi printer tidak dapat dibaca'));},[service]);
 const save=async()=>{setBusy(true);setMessage('');try{await service.savePrinterConfiguration(width);setSaved(true);setMessage('Pengaturan printer tersimpan di perangkat ini. Pemilihan printer tetap melalui dialog sistem.');}catch(error){setMessage(error instanceof Error?error.message:'Pengaturan printer tidak dapat disimpan');}finally{setBusy(false);}};
 return <section aria-label="Printer"><h2>Printer</h2><p>Gunakan satu printer sistem untuk dapur dan pelanggan. Berrie tidak menyatakan printer tersambung atau kertas sudah keluar.</p><label>Lebar kertas<select value={width} onChange={event=>{setWidth(event.target.value as PaperWidth);setSaved(false);}}><option value="58">58 mm</option><option value="80">80 mm</option></select></label><div className="actions"><button disabled={busy||saved} onClick={()=>void save()}>Simpan pengaturan</button><button disabled={busy||!saved} onClick={()=>onTest(sample('original'))}>Uji cetak</button></div>{message&&<p role="status">{message}</p>}<h3>Pratinjau konfigurasi</h3><PrintDocumentView document={sample('original')} width={width} preview/></section>;
}
