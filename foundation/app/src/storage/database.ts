import Dexie, { type Table } from 'dexie';
export interface RecordRow { key: string; revision: number; value: unknown }
export interface EventRow { id: string; operationId: string; value: unknown }
export interface SequenceRow { key:string; sequence:number }
export interface OperationRow { id: string; payload: string; result: unknown }
/**
 * Printer state deliberately lives outside the business checkpoint.  An
 * attempt records that the system dialog was requested, never that paper was
 * produced.  This lets a cashier recover a doubtful print without changing a
 * payment, stock or serving record.
 */
export interface PrintConfigRow { key:string; value:unknown }
export interface PrintAttemptRow { id:string; scope:string; jobKey:string; requestKey:string; value:unknown }
export class BerrieDatabase extends Dexie {
 state!: Table<RecordRow,string>; ledger!: Table<EventRow,string>; audit!: Table<EventRow,string>; outbox!: Table<EventRow,string>; receipts!: Table<OperationRow,string>; sequences!: Table<SequenceRow,string>;
 printConfigs!: Table<PrintConfigRow,string>; printAttempts!: Table<PrintAttemptRow,string>;
 constructor(name='berrie') {
  super(name);
  this.version(1).stores({state:'&key',ledger:'&id,operationId',audit:'&id,operationId',outbox:'&id,operationId',receipts:'&id',sequences:'&key'});
  this.version(2).stores({state:'&key',ledger:'&id,operationId',audit:'&id,operationId',outbox:'&id,operationId',receipts:'&id',sequences:'&key',printConfigs:'&key',printAttempts:'&id,scope,jobKey,requestKey'});
 }
}
