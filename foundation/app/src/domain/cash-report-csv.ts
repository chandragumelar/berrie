import type { CashReport } from './cash-report';
type Cell=string|number|null;
function cell(value:Cell):string {
 if(value===null) return '';
 if(typeof value==='number') {if(!Number.isSafeInteger(value)) throw new Error('Angka CSV tidak aman');return String(value);}
 // Spreadsheet programs may ignore whitespace/control characters before a formula.
 const first=[...value].find(ch=>ch.charCodeAt(0)>31 && !/\s/u.test(ch));
 const protectedText=first && '=+-@'.includes(first)?`'${value}`:value;
 return `"${protectedText.replaceAll('"','""')}"`;
}
function csv(rows:Cell[][]):string {return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
/** CSV is a scoped report, never a backup; incomplete evidence cannot be exported. */
export function exportCashReportCsv(input:CashReport):{summary:string;ledger:string;segments:string} {
 if(input.status!=='complete') throw new Error('Ekspor ditahan: sumber laporan belum lengkap');
 const {session,checkpoint,report}=input;
 const prefix:Cell[][]=[['cakupan','satu sesi kas; CSV bukan backup'],['store_id',input.storeId],['session_id',session.id],['nomor_sesi',session.number],['zona_waktu',session.timeZone],['waktu_buka_utc',session.openedAt],['mata_uang','IDR'],['checkpoint_schema',checkpoint.schema],['checkpoint_boundary_json',JSON.stringify(checkpoint.boundary)],[]];
 const s=report.summary;
 const summary=csv([...prefix,['kolom','nilai_idr'],...Object.entries(s).map(([k,v])=>[k,v] as Cell[])]);
 const ledger=csv([...prefix,['ledger_id','operation_id','source_id','payment_id','refund_id','sesi_asal_id','waktu_utc','actor_id','jenis','jumlah_idr','delta_saldo_idr','metode','alasan','referensi'],...report.ledger.map(e=>{
  const m=e.movement;let amount:number,delta:number,method:string;
  if(m.kind==='method-correction' || m.kind==='method-adjustment') {amount=m.correction.amount;delta=m.legs.find(l=>l.method==='cash')?.delta ?? 0;method=`${m.correction.from} -> ${m.correction.to}`;}
  else if(m.kind==='refund') {amount=m.refund.amount;delta=m.refund.method==='cash'?-amount:0;method=m.refund.method;}
  else {amount=m.amount;delta=m.kind==='out'?-amount:amount;method='cash';}
  return [e.ledgerId,e.operationId,e.sourceId,e.paymentId,e.refundId,e.originSessionId,e.occurredAt,e.actorId,m.kind,amount,delta,method,e.reason,e.reference];
 })]);
 const segments=csv([...prefix,['penanggung_jawab','fisik_awal_idr','ekspektasi_awal_idr','batas_awal_json','fisik_akhir_idr','ekspektasi_sesi_akhir_idr','batas_akhir_json','ekspektasi_segmen_idr','selisih_idr','operasi_akhir','operasi_hitungan','actor_akhir','waktu_akhir_utc','alasan'],...report.segments.map(x=>[x.custodian,x.openingPhysical,x.openingExpected,x.openingBoundary===null?null:JSON.stringify(x.openingBoundary),x.closingPhysical,x.closingExpected,x.closingBoundary===null?null:JSON.stringify(x.closingBoundary),x.segmentExpected,x.difference,x.closingOperationId,x.countOperationId,x.closingActor,x.closingAt,x.reason])]);
 return {summary,ledger,segments};
}
