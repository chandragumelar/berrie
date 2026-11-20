import { useEffect, useState } from 'react';
import type { OwnerCashier } from '../application/owner-cashier';
import { formatPrintDocument, type PaperWidth, type PrintableDocument, type PrintMode } from '../domain/print-documents';

export interface PrintTask { document:PrintableDocument; mode:PrintMode; requestKey:string }
export function PrintDocumentView({document,width,preview=false}:{document:PrintableDocument;width:PaperWidth;preview?:boolean}){
 const text=formatPrintDocument(document,width);
 return <article className={`print-paper print-paper-${width}${preview?' print-preview':''}`} aria-label={`Pratinjau ${document.title}`}><pre>{text}</pre></article>;
}
/** Serializes browser system dialogs. Completion means only the dialog returned; paper remains unconfirmed. */
export function SystemPrintQueue({service,tasks,onDone,onNotice,width}:{service:OwnerCashier;tasks:PrintTask[];onDone:(task:PrintTask)=>void;onNotice:(message:string)=>void;width:PaperWidth}){
 const [active,setActive]=useState<PrintableDocument|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{if(busy||!tasks[0])return;let cancelled=false;const task=tasks[0];void (async()=>{setBusy(true);try{const attempt=await service.reservePrint(task.document,task.mode,task.requestKey);if(cancelled)return;const document={...task.document,mode:task.mode,...(task.mode==='copy'?{copiedAt:new Date().toISOString()}: {})};setActive(document);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(cancelled)return;try{window.print();await service.finishPrint(attempt.id,'unknown');onNotice('Hasil cetak belum diketahui. Periksa kertas; cetak ulang memakai SALINAN.');}catch(error){await service.finishPrint(attempt.id,'failed',error instanceof Error?error.message:'Dialog sistem gagal');onNotice('Perintah cetak gagal. Pembayaran dan pesanan tetap tersimpan.');}}catch(error){onNotice(error instanceof Error?error.message:'Attempt cetak tidak dapat disimpan. Dokumen tidak dikirim.');}finally{if(!cancelled){setActive(null);setBusy(false);onDone(task);}}})();return()=>{cancelled=true;};},[busy,tasks,service,onDone,onNotice]);
 return <>{active&&<div className="print-host"><style media="print">{`@page { size: ${width}mm auto; margin: 0; }`}</style><PrintDocumentView document={active} width={width}/></div>}</>;
}
