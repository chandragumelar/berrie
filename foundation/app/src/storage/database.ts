import Dexie, { type Table } from 'dexie';
export interface RecordRow { key: string; revision: number; value: unknown }
export interface EventRow { id: string; operationId: string; value: unknown }
export interface SequenceRow { key:string; sequence:number }
export interface OperationRow { id: string; payload: string; result: unknown }
export class BerrieDatabase extends Dexie {
 state!: Table<RecordRow,string>; ledger!: Table<EventRow,string>; audit!: Table<EventRow,string>; outbox!: Table<EventRow,string>; receipts!: Table<OperationRow,string>; sequences!: Table<SequenceRow,string>;
 constructor(name='berrie') { super(name); this.version(1).stores({state:'&key',ledger:'&id,operationId',audit:'&id,operationId',outbox:'&id,operationId',receipts:'&id',sequences:'&key'}); }
}
