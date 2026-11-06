import { correctionDeltas, validateMethodCorrection, type MethodCorrection } from './payment';
import { draftDateCode } from './draft';
import { validateServedRefundEvent, type ServedRefundEvent } from './served-refund';

export interface CashSession { id:string; storeId:string; number:string; openedBy:string; initialCustodian:string; openedAt:string; timeZone:string; businessDate:string; openingAmount:number }
export type CashMovement = { kind:'opening'|'in'|'out'|'sale'; sessionId:string; storeId:string; amount:number; category:string; description:string } | { kind:'method-correction'; sessionId:string; storeId:string; correction:MethodCorrection; legs:ReturnType<typeof correctionDeltas> } | { kind:'method-adjustment'; sessionId:string; storeId:string; correction:MethodCorrection; legs:ReturnType<typeof correctionDeltas> } | {kind:'refund';sessionId:string;storeId:string;refund:ServedRefundEvent};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function text(v:unknown):v is string { return typeof v==='string' && !!v.trim() && v.length<=200; }
export function businessDate(time:string, zone:string):string {
 draftDateCode(time,zone);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value ?? '').join('-');
}
export function validateCashSession(v:unknown): asserts v is CashSession {
 if(!v || typeof v!=='object' || Array.isArray(v) || Object.getPrototypeOf(v)!==Object.prototype) throw new Error('Sesi kas tidak sah');
 const s=v as Record<string,unknown>;
 if(Object.keys(s).sort().join(',')!=='businessDate,id,initialCustodian,number,openedAt,openedBy,openingAmount,storeId,timeZone' || typeof s.id!=='string' || !uuid.test(s.id) || ![s.storeId,s.number,s.openedBy,s.initialCustodian,s.openedAt,s.timeZone,s.businessDate].every(text) || !Number.isSafeInteger(s.openingAmount) || (s.openingAmount as number)<0) throw new Error('Sesi kas tidak sah');
 if(s.businessDate!==businessDate(s.openedAt as string,s.timeZone as string)) throw new Error('Tanggal bisnis tidak sesuai');
}
export function cashBalance(entries:CashMovement[], session:CashSession):number {
 validateCashSession(session);
 if(!Array.isArray(entries) || !entries.length) throw new Error('Ledger kas kosong');
 let balance=0;
 entries.forEach((e,i)=>{
  if(e?.kind==='refund') {
   if(i===0 || Object.keys(e).sort().join(',')!=='kind,refund,sessionId,storeId' || e.sessionId!==session.id || e.storeId!==session.storeId) throw new Error('Ledger refund tidak sah');
   validateServedRefundEvent(e.refund);
   if(e.refund.cashSessionId!==session.id || e.refund.storeId!==session.storeId) throw new Error('Sesi refund tidak sesuai');
   if(e.refund.method==='cash') balance-=e.refund.amount;
   if(!Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak sah');
   return;
  }
  if(e?.kind==='method-correction' || e?.kind==='method-adjustment') {
   if(i===0 || Object.keys(e).sort().join(',')!=='correction,kind,legs,sessionId,storeId' || e.sessionId!==session.id || e.storeId!==session.storeId) throw new Error('Ledger koreksi tidak sah');
   validateMethodCorrection(e.correction);
   if((e.kind==='method-correction' ? e.correction.cashSessionId!==session.id || e.correction.executionSessionId!==undefined : e.correction.executionSessionId!==session.id) || e.correction.storeId!==session.storeId || (!Array.isArray(e.legs) || e.legs.length!==2 || e.legs.some((leg,index)=>!leg || Object.keys(leg).sort().join(',')!=='delta,method' || leg.method!==correctionDeltas(e.correction)[index].method || leg.delta!==correctionDeltas(e.correction)[index].delta))) throw new Error('Ledger koreksi tidak sah');
   for(const leg of e.legs) if(leg.method==='cash') balance+=leg.delta;
   if(!Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak sah');
   return;
  }
  if(!e || typeof e!=='object' || Object.keys(e).sort().join(',')!=='amount,category,description,kind,sessionId,storeId' || e.sessionId!==session.id || e.storeId!==session.storeId || !Number.isSafeInteger(e.amount) || e.amount<0 || (i===0 ? e.kind!=='opening' || e.amount!==session.openingAmount || e.category!=='' || e.description!=='' : (e.kind!=='in' && e.kind!=='out' && e.kind!=='sale') || e.amount===0 || (e.kind==='sale' ? e.category!=='' || e.description!=='' : !text(e.category) || !text(e.description)))) throw new Error('Ledger kas tidak sah');
  balance+=e.kind==='out'?-e.amount:e.amount;
  if(!Number.isSafeInteger(balance) || balance<0) throw new Error('Saldo kas tidak sah');
 });
 return balance;
}
