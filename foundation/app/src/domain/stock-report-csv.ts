import { csv, type Cell } from './csv';
import type { StockReport } from './stock-report';
export function exportStockReportCsv(input:StockReport):{balances:string;ledger:string} {
 if(input.status!=='complete') throw new Error('Ekspor ditahan: sumber laporan belum lengkap');
 const prefix:Cell[][]=[['cakupan',input.scope],['keterangan','CSV bukan backup'],['store_id',input.storeId],['checkpoint_schema',input.checkpoint.schema],['checkpoint_boundary_json',JSON.stringify(input.checkpoint.boundary)],[]];
 return {balances:csv([...prefix,['group_id','revisi','baseline','saldo','minimum','kondisi','sku_ids_json'],...input.groups.map(g=>[g.groupId,g.revision,g.baseline,g.balance,g.minimum,g.condition,JSON.stringify(g.skuIds)])]),ledger:csv([...prefix,['ledger_id','operation_id','group_id','revisi','jenis','order_id','source_id','refund_id','cancellation_id','payment_id','unit_ids_json','actor_id','waktu_kejadian_utc','waktu_pencatatan_utc','alasan','delta','saldo_sebelum','saldo_sesudah'],...input.ledger.map(e=>[e.ledgerId,e.operationId,e.groupId,e.revision,e.kind,e.orderId,e.sourceId,e.refundId,e.cancellationId,e.paymentId,JSON.stringify(e.unitIds),e.actorId,e.occurredAt,e.recordedAt,e.reason,e.delta,e.before,e.after])])};
}
