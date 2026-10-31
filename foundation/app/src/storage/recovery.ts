import { BerrieDatabase, type EventRow, type OperationRow, type RecordRow, type SequenceRow } from './database';
export interface Snapshot { schema:1; state:RecordRow[]; ledger:EventRow[]; audit:EventRow[]; outbox:EventRow[]; receipts:OperationRow[]; sequences:SequenceRow[] }
/** Consistent local checkpoint for migration; not an encrypted user backup. */
export async function checkpoint(db:BerrieDatabase):Promise<Snapshot> {
 return db.transaction('r',[db.state,db.ledger,db.audit,db.outbox,db.receipts,db.sequences],async()=>({schema:1,state:await db.state.toArray(),ledger:await db.ledger.toArray(),audit:await db.audit.toArray(),outbox:await db.outbox.toArray(),receipts:await db.receipts.toArray(),sequences:await db.sequences.toArray()}));
}
/** Stage only in an empty database. Active database is never replaced here. */
export async function stageSnapshot(db:BerrieDatabase, snapshot:Snapshot):Promise<void> {
 if(!snapshot || snapshot.schema!==1 || ![snapshot.state,snapshot.ledger,snapshot.audit,snapshot.outbox,snapshot.receipts,snapshot.sequences].every(Array.isArray)) throw new Error('Schema pemulihan tidak dikenal');
 const ids=new Set(snapshot.receipts.map(r=>r.id));
 if(snapshot.receipts.some(r=>!r.id || !r.payload) || snapshot.state.some(s=>!s.key || !Number.isSafeInteger(s.revision) || s.revision<0) || [...snapshot.ledger,...snapshot.audit,...snapshot.outbox].some(e=>!e.id || !ids.has(e.operationId))) throw new Error('Snapshot tidak valid');
 await db.transaction('rw',[db.state,db.ledger,db.audit,db.outbox,db.receipts,db.sequences],async()=>{
  if((await Promise.all([db.state.count(),db.ledger.count(),db.audit.count(),db.outbox.count(),db.receipts.count(),db.sequences.count()])).some(n=>n!==0)) throw new Error('Staging tidak kosong');
  await db.state.bulkAdd(snapshot.state);await db.ledger.bulkAdd(snapshot.ledger);await db.audit.bulkAdd(snapshot.audit);await db.outbox.bulkAdd(snapshot.outbox);await db.receipts.bulkAdd(snapshot.receipts);await db.sequences.bulkAdd(snapshot.sequences);
 });
}
