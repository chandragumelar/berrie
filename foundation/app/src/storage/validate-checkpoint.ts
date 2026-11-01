import { validateBusinessRecord } from '../domain/business-record';
import { canonical } from './commit';
import type { Snapshot } from './recovery';
import { validateTransitions } from './transitions';

type Obj = Record<string, unknown>;
function fail(path:string, reason:string):never { throw new Error(`Checkpoint ${path}: ${reason}`); }
function object(value:unknown, path:string):Obj {
 if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(path, 'harus berupa objek');
 return value as Obj;
}
function id(value:unknown, path:string):string {
 if (typeof value !== 'string' || !value.trim() || value.length > 200) fail(path, 'ID wajib berupa teks tidak kosong (maksimal 200 karakter)');
 return value;
}
function integer(value:unknown, min:number, path:string):number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail(path, `harus integer aman minimal ${min}`);
 return value;
}
function data(value:unknown, path:string):string {
 try { return canonical(value); } catch { return fail(path, 'nilai bukan data operasi yang didukung'); }
}
function array(value:unknown, path:string):unknown[] {
 if (!Array.isArray(value)) fail(path, 'koleksi wajib berupa array');
 return value;
}
function uniqueRows(rows:unknown[], key:string, path:string):Obj[] {
 const seen=new Set<string>();
 return rows.map((value,i)=>{const row=object(value,`${path}[${i}]`);const k=path==='sequences' && typeof row[key]==='string' && row[key] ? row[key] as string : id(row[key],`${path}[${i}].${key}`);if(seen.has(k)) fail(path, `kunci duplikat: ${k}`);seen.add(k);return row;});
}
function event(value:unknown, path:string, operationId?:string):Obj {
 const row=object(value,path); id(row.id,`${path}.id`); const op=id(row.operationId,`${path}.operationId`);
 if(operationId !== undefined && op !== operationId) fail(path, 'operationId berbeda dari receipt');
 data(row, path); return row;
}
function business(value:unknown, path:string):void {
 try { validateBusinessRecord(value); } catch { fail(path, 'record bisnis tidak sah'); }
}
/** Validates storage and marked business records, not authenticity or untyped business values. */
export function validateCheckpoint(input:unknown):Snapshot {
 const root=object(input,'root'); if(root.schema!==1) fail('schema','versi tidak didukung');
 const state=uniqueRows(array(root.state,'state'),'key','state');
 const ledger=uniqueRows(array(root.ledger,'ledger'),'id','ledger');
 const audit=uniqueRows(array(root.audit,'audit'),'id','audit');
 const outbox=uniqueRows(array(root.outbox,'outbox'),'id','outbox');
 const receipts=uniqueRows(array(root.receipts,'receipts'),'id','receipts');
 const sequences=uniqueRows(array(root.sequences,'sequences'),'key','sequences');
 for(const row of state) { integer(row.revision,0,`state ${row.key}.revision`); data(row.value,`state ${row.key}.value`); business(row.value,`state ${row.key}.value`); }
 const receiptIds=new Set(receipts.map(r=>r.id));
 for(const [name,rows] of [['ledger',ledger],['audit',audit],['outbox',outbox]] as const) for(const row of rows) {
  event(row,`${name} ${row.id}`); if(!receiptIds.has(row.operationId)) fail(name,`receipt tidak ditemukan untuk ${row.operationId}`);
 }
 const expectedEvents = {ledger:new Map<string,string>(),audit:new Map<string,string>(),outbox:new Map<string,string>()};
 const history=new Map<string,Map<number,string>>();
 const seqs=new Map<string,Set<number>>();
 for(const receipt of receipts) {
  const path=`receipts ${receipt.id}`;
  if(typeof receipt.payload!=='string') fail(`${path}.payload`,'harus berupa JSON operasi');
  let parsed:unknown; try { parsed=JSON.parse(receipt.payload); } catch { fail(`${path}.payload`,'JSON operasi rusak'); }
  const change=object(parsed,`${path}.payload`);
  if(data(change,`${path}.payload`)!==receipt.payload) fail(`${path}.payload`,'format operasi tidak kanonis');
  if(change.operationId!==receipt.id) fail(path,'operationId berbeda dari ID receipt');
  for(const field of ['operationId','storeId','deviceId','kind','targetId','actorId']) id(change[field],`${path}.${field}`);
  for(const field of ['deviceEpoch','localSequence','policyVersion']) integer(change[field],1,`${path}.${field}`);
  if(data(change.result,`${path}.result`)!==data(receipt.result,`${path}.result`)) fail(path,'hasil berbeda dari operasi');
  const states=array(change.state,`${path}.state`); if(!states.length) fail(path,'state operasi kosong');
  const keys=new Set<string>();
  for(const item of states) {
   const row=object(item,`${path}.state`); const key=id(row.key,`${path}.state.key`); if(keys.has(key)) fail(path,'state operasi duplikat'); keys.add(key);
   const rev=row.expectedRevision===null ? 0 : integer(row.expectedRevision,0,`${path}.expectedRevision`)+1;
   if(!Number.isSafeInteger(rev)) fail(path,'revisi melampaui batas');
   business(row.value,`${path}.state.value`); const value=data(row.value,`${path}.state.value`); const versions=history.get(key) ?? new Map<number,string>(); if(versions.has(rev)) fail(path,'revisi state duplikat'); versions.set(rev,value);history.set(key,versions);
  }
  for(const name of ['ledger','audit','outbox'] as const) {
   const rows=name==='outbox'?[change.outbox]:array(change[name],`${path}.${name}`);
   if(name==='audit' && !rows.length) fail(path,'audit operasi kosong');
   for(const item of rows) {const row=event(item,`${path}.${name}`,receipt.id as string);const key=row.id as string;if(expectedEvents[name].has(key)) fail(path,`event ${name} duplikat`);expectedEvents[name].set(key,data(row,path));}
  }
  const seqKey=JSON.stringify([change.storeId,change.deviceId,change.deviceEpoch]); const n=change.localSequence as number;
  const numbers=seqs.get(seqKey) ?? new Set<number>();if(numbers.has(n)) fail(path,'urutan operasi duplikat');numbers.add(n);seqs.set(seqKey,numbers);
 }
 for(const [name,rows] of [['ledger',ledger],['audit',audit],['outbox',outbox]] as const) {
  const expected=expectedEvents[name]; if(rows.length!==expected.size) fail(name,'jumlah event tidak sesuai receipt');
  for(const row of rows) if(expected.get(row.id as string)!==data(row,name)) fail(name,`event ${row.id} tidak sesuai receipt`);
 }
 if(state.length!==history.size) fail('state','jumlah state tidak sesuai receipt');
 for(const row of state) {const versions=history.get(row.key as string); const rev=row.revision as number;
  if(!versions || versions.size!==rev+1 || [...versions.keys()].some(v=>v>rev) || versions.get(rev)!==data(row.value,'state.value')) fail('state',`riwayat revisi ${row.key} tidak sesuai receipt`);
 }
 if(sequences.length!==seqs.size) fail('sequences','jumlah sequence tidak sesuai receipt');
 for(const row of sequences) {const n=integer(row.sequence,1,`sequences ${row.key}.sequence`);const numbers=seqs.get(row.key as string);
  if(!numbers || numbers.size!==n || [...numbers].some(v=>v>n) || !numbers.has(n)) fail('sequences',`urutan ${row.key} tidak sesuai receipt`);
 }
 try { validateTransitions((input as Snapshot).receipts,(input as Snapshot).state); } catch { fail('histori','transisi record bisnis tidak sah'); }
 return input as Snapshot;
}
