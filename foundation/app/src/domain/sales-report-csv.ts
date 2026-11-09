import { csv, type Cell } from './csv';
import type { CountBoundary } from './cash-count';
import type { calculateReports, calculateDailyReports } from './reports';
type SalesReport = {storeId:string;filter:{kind:'calendar';start:string;end:string;zone:string}|{kind:'session';sessionId:string};zone:string;scope:string;checkpoint:{schema:1;boundary:CountBoundary[]};status:string;report:(ReturnType<typeof calculateReports> & {daily:ReturnType<typeof calculateDailyReports>})|null};
/** All exports derive exclusively from one complete, previously read report. */
export function exportSalesReportCsv(input:SalesReport):{summary:string;daily:string;methods:string;skus:string;events:string} {
 if(input.status!=='complete'||!input.report)throw new Error('Ekspor ditahan: sumber laporan belum lengkap');
 const {report,checkpoint}=input;
 const prefix:Cell[][]=[['cakupan',input.scope],['keterangan','CSV bukan backup'],['store_id',input.storeId],['filter_json',JSON.stringify(input.filter)],['zona_kalender',input.zone],['mata_uang','IDR'],['checkpoint_schema',checkpoint.schema],['checkpoint_boundary_json',JSON.stringify(checkpoint.boundary)],[]];
 const keys=Object.keys(report.totals) as (keyof typeof report.totals)[];
 const summary=csv([...prefix,['metrik','nilai'],...keys.map(k=>[k,report.totals[k]] as Cell[])]);
 const daily=csv([...prefix,['tanggal',...keys],...report.daily.map(d=>[d.date,...keys.map(k=>d.totals[k])])]);
 const methods=csv([...prefix,['metode','penerimaan_idr','refund_idr','koreksi_idr','penyesuaian_idr','neto_idr'],...report.methods.map(m=>[m.method,m.receipts,m.refunds,m.correction,m.adjustment,m.net])]);
 const skus=csv([...prefix,['sku_id','nama_snapshot_json','terjual','refund','neto','unit_gratis','dasar_neto_idr','sumber_json'],...report.skuByValue.map(s=>[s.skuId,JSON.stringify(s.names),s.sold,s.refunded,s.net,s.freeUnits,s.netBase,JSON.stringify(s.sources)])]);
 const rows:Cell[][]=[];
 for(const sale of report.details.sales) for(const u of sale.settlement.units) {
  const a=sale.settlement.totals.allocations.find(x=>x.id===u.id)!;
  rows.push(['settlement',new Date(sale.source.recordedAt).toISOString(),sale.source.orderId,sale.source.settlementId,sale.source.paymentId,sale.source.settlementOperationId,sale.source.operationId,sale.source.cashSessionId,null,u.id,u.skuId,sale.names[u.id],sale.method,null,null,u.skuPrice,u.toppingPrice,u.promoAmount,a.discount,a.base,a.tax,a.service,a.total]);
 }
 for(const refund of report.details.refunds) for(const id of refund.unitIds) {
  const u=refund.settlement.units.find(x=>x.id===id)!,a=refund.settlement.totals.allocations.find(x=>x.id===id)!;
  rows.push(['refund',new Date(refund.source.recordedAt).toISOString(),refund.source.orderId,refund.source.settlementId,refund.source.paymentId,refund.source.settlementOperationId,refund.source.operationId,refund.source.cashSessionId,refund.source.refundId,id,u.skuId,refund.names[id],refund.method,null,null,u.skuPrice,u.toppingPrice,u.promoAmount,a.discount,a.base,a.tax,a.service,a.total]);
 }
 for(const c of report.details.classifications)rows.push([c.administrative?'penyesuaian':'koreksi',new Date(c.source.recordedAt).toISOString(),c.source.orderId,c.source.settlementId,c.source.paymentId,c.source.settlementOperationId,c.source.operationId,c.source.cashSessionId,null,null,null,null,null,c.from,c.to,null,null,null,null,null,null,null,c.amount]);
 rows.sort((a,b)=>String(a[1]).localeCompare(String(b[1]))||String(a[6]).localeCompare(String(b[6]))||String(a[9]??'').localeCompare(String(b[9]??'')));
 const events=csv([...prefix,['jenis','waktu_utc','order_id','settlement_id','payment_id','operasi_settlement_id','operasi_kejadian_id','sesi_id','refund_id','unit_id','sku_id','nama_snapshot','metode','dari_metode','ke_metode','harga_sku_idr','topping_idr','promo_idr','diskon_idr','dasar_idr','pajak_idr','layanan_idr','jumlah_idr'],...rows]);
 return {summary,daily,methods,skus,events};
}
