import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import type { BerrieDatabase } from './database';

/** Called inside the writer transaction, after replay has been checked. */
export async function requireOrderSession(db:BerrieDatabase, storeId:string, sessionId:string):Promise<{id:string;revision:number}> {
 const row=await db.state.get(`cash-session:${sessionId}`);
 if(!row) throw new Error('Sesi kas asal tidak ditemukan');
 validateBusinessRecord(row.value);
 const value=row.value as BusinessRecord;
 if(value?.recordType!=='cash-session' || value.session.id!==sessionId || value.session.storeId!==storeId) throw new Error('Sesi kas asal tidak sesuai toko');
 return {id:sessionId,revision:row.revision};
}
