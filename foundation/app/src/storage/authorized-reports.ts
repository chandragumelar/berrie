import { exportSalesReportCsv } from '../domain/sales-report-csv';
import { exportStockReportCsv } from '../domain/stock-report-csv';
import { canonical, copyInput, type LockProvider } from './commit';
import type { BerrieDatabase } from './database';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { OfflinePermitStorage } from './offline-permit';
import { readInternalSalesReports, validateReportFilter, type ReportFilter } from './reports';
import { readInternalStockReport } from './stock-report';

function copyIdentity(value:PinIdentity):PinIdentity {
 const i=copyInput(value) as PinIdentity;
 if(!i || typeof i!=='object' || Array.isArray(i) || Object.keys(i).sort().join(',')!=='actorId,deviceId,epoch,storeId' || ![i.storeId,i.deviceId,i.actorId].every(x=>typeof x==='string' && x.trim().length>0 && x.length<=200) || !Number.isSafeInteger(i.epoch) || i.epoch<1) throw new Error('Identitas tidak sah');
 return i;
}
/** Internal owner-only boundary; raw report primitives remain internal. */
export class AuthorizedReports {
 constructor(private db:BerrieDatabase, private pin:LocalPinSecurity, private permits:OfflinePermitStorage, private locks:LockProvider=navigator.locks) {}
 private async execute<T>(identity:PinIdentity, work:(storeId:string)=>Promise<T>):Promise<{status:'denied'}|{status:'ok';value:T}> {
  try {
   const checkCaptured=this.pin.captureIdentity(identity);
   if(this.db.name!==this.pin.businessName || this.db.name!==this.permits.businessName || !this.locks || typeof this.locks.request!=='function') return {status:'denied'};
   const first=await this.permits.read(identity);
   return await this.pin.withAuthorizationLock(checkPin=>this.permits.withAuthorizationLock(readPermit=>this.locks.request(`berrie-writer:${this.db.name}`,async()=>{
    checkCaptured();
    const pinGuard=await checkPin(identity), current=await readPermit(identity);
    if(canonical(first.permit)!==canonical(current.permit) || canonical(first.policy ?? null)!==canonical(current.policy ?? null) || current.clockFault || current.permit.payload.version!==2 || !current.policy) return {status:'denied'} as const;
    const p=current.permit.payload, actor=current.policy.actors.find(a=>a.id===identity.actorId);
    if(!actor || !actor.active || actor.role!=='owner' || p.role!=='owner' || current.policy.version!==p.policyVersion) return {status:'denied'} as const;
    const guard=()=>{checkCaptured();pinGuard();current.assertTime();};
    guard();
    const value=await work(p.storeId);
    const finalPinGuard=await checkPin(identity), finalPermit=await readPermit(identity);
    if(finalPermit.clockFault || canonical(current.permit)!==canonical(finalPermit.permit) || canonical(current.policy)!==canonical(finalPermit.policy ?? null)) return {status:'denied'} as const;
    guard();finalPinGuard();finalPermit.assertTime();
    return {status:'ok',value} as const;
   })));
  } catch {
   try {await this.pin.checkIdentity(identity);} catch { /* fail closed */ }
   try {await this.permits.read(identity);} catch { /* fail closed */ }
   return {status:'denied'};
  }
 }
 sales(identity:PinIdentity,filter:ReportFilter) {
  try {const i=copyIdentity(identity), f=copyInput(filter) as ReportFilter;canonical({i,f});validateReportFilter(f);return this.execute(i,storeId=>readInternalSalesReports(this.db,storeId,f));} catch {return Promise.resolve({status:'denied'} as const);}
 }
 salesCsv(identity:PinIdentity,filter:ReportFilter) {
  try {const i=copyIdentity(identity), f=copyInput(filter) as ReportFilter;canonical({i,f});validateReportFilter(f);return this.execute(i,async storeId=>exportSalesReportCsv(await readInternalSalesReports(this.db,storeId,f)));} catch {return Promise.resolve({status:'denied'} as const);}
 }
 stock(identity:PinIdentity) {
  try {const i=copyIdentity(identity);return this.execute(i,storeId=>readInternalStockReport(this.db,storeId));} catch {return Promise.resolve({status:'denied'} as const);}
 }
 stockCsv(identity:PinIdentity) {
  try {const i=copyIdentity(identity);return this.execute(i,async storeId=>exportStockReportCsv(await readInternalStockReport(this.db,storeId)));} catch {return Promise.resolve({status:'denied'} as const);}
 }
}
