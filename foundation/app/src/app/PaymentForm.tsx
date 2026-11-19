import { useEffect, useState } from 'react';
import type { OwnerView, SaleOrder } from '../application/owner-cashier';
import type { NoncashDetails } from '../storage/noncash-payment';
const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
type Method='cash'|'qris'|'transfer'|'ewallet';
export function PaymentForm({order,view,busy,onPayCash,onPayNoncash,onBack,onSettings,cashOnly=false}:{order:SaleOrder;view:OwnerView;busy:boolean;onPayCash:(received:number)=>void;onPayNoncash:(details:NoncashDetails)=>void;onBack:()=>void;onSettings:()=>void;cashOnly?:boolean}){
 const [method,setMethod]=useState<Method>('cash'),[received,setReceived]=useState(''),[note,setNote]=useState(''),[verified,setVerified]=useState(false);
 const revision=`${order.id}:${order.revision}:${order.batchRevision}:${order.total}:${view.cash?.revision}:${view.paymentMethods.revision}`;
 useEffect(()=>{setVerified(false);},[revision,method]);
 const enabled=view.paymentMethods.methods;
 const amount=Number(received),cashValid=received!==''&&Number.isSafeInteger(amount)&&amount>=order.total;
 return <section aria-label="Bayar"><h3>Bayar · {order.number}</h3><p>Total {money(order.total)}</p>{cashOnly?<p>Tunai</p>:<label>Metode pembayaran<select value={method} onChange={e=>{setMethod(e.target.value as Method);setReceived('');setVerified(false);}}><option value="cash">Tunai</option>{enabled.qris&&<option value="qris">QRIS</option>}{enabled.transfer&&<option value="transfer">Transfer</option>}{enabled.ewallet&&<option value="ewallet">E-wallet</option>}</select></label>}
 {method==='cash'?<><label>Diterima (Rp)<input type="number" min={order.total} step="1" value={received} onChange={e=>setReceived(e.target.value)}/></label><p>Kembali {cashValid?money(amount-order.total):'—'}</p></>:<><label>Catatan opsional<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><label><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Pembayaran sudah saya verifikasi berhasil</label></>}
 <div className="actions"><button disabled={busy||order.total<=0||(method==='cash'?!cashValid:!verified)} onClick={()=>method==='cash'?onPayCash(amount):onPayNoncash({expectedSessionRevision:view.cash!.revision,expectedMethodsRevision:view.paymentMethods.revision!,method,verified:true,note:note.trim().slice(0,500)||null})}>Simpan pembayaran</button><button disabled={busy} onClick={onBack}>Kembali ke pesanan</button><button disabled={busy} onClick={onSettings}>Atur metode</button></div></section>;
}
