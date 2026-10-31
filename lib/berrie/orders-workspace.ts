import {active,counts,groupUnits,totals,unpaidBalance,type Order} from './domain.ts';
export type OrderGroup='Aktif'|'Tersimpan';
export interface OrderQuery {group:OrderGroup;search:string;work:string;payment:string}
export const initialOrderQuery=():OrderQuery=>({group:'Aktif',search:'',work:'Semua',payment:'Semua'});
export const switchOrderGroup=(group:OrderGroup):OrderQuery=>({...initialOrderQuery(),group});
export const storedDraft=(o:Order)=>o.saved&&!o.settlement&&!o.batches.length&&!o.units.some(u=>u.debited||u.state==='requested'||u.state==='served')&&counts(o).draft>0&&o.refundDue===0;
export function partitionOrders(orders:Order[]){return {Aktif:orders.filter(o=>active(o)&&!storedDraft(o)),Tersimpan:orders.filter(o=>active(o)&&storedDraft(o))};}
const validTime=(t:number|undefined):t is number=>typeof t==='number'&&Number.isFinite(t)&&t>0;
export function servingProgress(o:Order){const c=counts(o);return {served:c.served,total:c.served+c.requested,pending:c.requested};}
export function confirmationTime(o:Order,pendingOnly=false){
 const units=o.units.filter(u=>pendingOnly?u.state==='requested':u.state==='requested'||u.state==='served'||u.debited);
 if(!units.length)return undefined;
 const times=units.map(u=>o.batches.find(b=>b.number===u.batch&&b.units.includes(u.id))?.time);
 // Unknown batch time may be earlier than every known batch; never guess.
 return times.every(validTime)?Math.min(...times):undefined;
}
export function waitingLabel(o:Order,now:number){const time=confirmationTime(o,true);if(!validTime(time)||now<time)return 'Waktu tidak tersedia';return `${Math.floor((now-time)/60000)} menit menunggu`;}
const compareTime=(a:number|undefined,b:number|undefined,descending=false)=>!validTime(a)?validTime(b)?1:0:!validTime(b)?-1:descending?b-a:a-b;
export function orderQueue(orders:Order[],group:OrderGroup){return [...orders].sort((a,b)=>{
 if(group==='Tersimpan')return compareTime(a.savedAt,b.savedAt,true)||a.id.localeCompare(b.id);
 const ap=counts(a).requested>0,bp=counts(b).requested>0;
 return Number(bp)-Number(ap)||compareTime(confirmationTime(a,ap),confirmationTime(b,bp))||a.id.localeCompare(b.id);
});}
export function queryOrders(orders:Order[],q:OrderQuery){return orderQueue(partitionOrders(orders)[q.group].filter(o=>{
 if(!`${o.number} ${o.identity} ${o.externalId}`.toLocaleLowerCase('id').includes(q.search.trim().toLocaleLowerCase('id')))return false;
 if(q.group==='Tersimpan')return true;
 const p=servingProgress(o);
 return (q.work==='Semua'||(q.work==='Belum disajikan'?p.pending>0:p.total>0&&p.pending===0))&&(q.payment==='Semua'||(q.payment==='Lunas'?!!o.settlement:!o.settlement));
 }),q.group);}
export const retainedSelection=(id:string,orders:Order[],q:OrderQuery)=>queryOrders(orders,q).some(o=>o.id===id)?id:'';
export const orderSummary=(o:Order)=>groupUnits(o).map(us=>`${us.length}× ${us[0].name} · ${us[0].serving}${us[0].toppingNames.length?' · '+us[0].toppingNames.join(', '):''}${us[0].state==='cancelled'?' · Dibatalkan':''}`);
export const orderAmounts=(o:Order)=>({unpaid:unpaidBalance(o),draft:o.settlement?.total??totals(o).total,refundDue:o.refundDue});
export function resumeDraft(o:Order){if(!storedDraft(o))throw Error('Hanya draft tersimpan yang dapat dilanjutkan.');return structuredClone(o);}
