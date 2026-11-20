import Dexie, { type Table } from 'dexie';
import { canonical, copyInput } from '../storage/commit';
import type { BerrieDatabase } from '../storage/database';

/**
 * A command journal is recovery metadata, not a business receipt.  In
 * particular, `moneyConfirmedAt` is the durable acknowledgement that the
 * cashier has already handed money to the customer; old `moneyReturned` in a
 * frozen business payload is deliberately not used as that acknowledgement.
 */
export interface PreparedCommand { id:string; stream:string; sequence:number; intent:string; recordedAt:string; status:'prepared'|'awaiting_money'|'money_confirmed'|'unknown'|'committed'|'rejected'|'abandoned'; moneyConfirmedAt?:string; result?:unknown }
class JournalDatabase extends Dexie {commands!:Table<PreparedCommand,string>;constructor(name:string){super(`${name}-commands`);this.version(1).stores({commands:'&id,stream,status'});}}
/** The journal is local recovery metadata, separate from business receipts and ledger. Production backup integration remains pending. */
export class CommandJournal {
 private journal:JournalDatabase;
 constructor(private business:BerrieDatabase){this.journal=new JournalDatabase(business.name);}
 close(){this.journal.close();}
 stream(storeId:string,deviceId:string,epoch:number){return JSON.stringify([storeId,deviceId,epoch]);}
 async pending(stream:string){return (await this.journal.commands.where('stream').equals(stream).toArray()).filter(x=>x.status==='prepared'||x.status==='awaiting_money'||x.status==='money_confirmed'||x.status==='unknown');}
 async prepare(stream:string,intent:unknown,operationId:string,status:Extract<PreparedCommand['status'],'prepared'|'awaiting_money'>='prepared'){
  const frozen=canonical(copyInput(intent));
  // Dexie transactions cannot await a different IndexedDB database.  The
  // command lock held by callers makes this sequence read stable for prepare.
  const business=await this.business.sequences.get(stream);
  return this.journal.transaction('rw',this.journal.commands,async()=>{
   const prior=(await this.journal.commands.where('stream').equals(stream).toArray()).filter(x=>x.status==='prepared'||x.status==='awaiting_money'||x.status==='money_confirmed'||x.status==='unknown');
   if(prior.length){const matching=prior.find(x=>x.id===operationId&&x.intent===frozen);if(matching)return matching;throw new Error('Operasi sebelumnya belum dipastikan');}
   const existing=await this.journal.commands.get(operationId);if(existing&&existing.intent!==frozen)throw new Error('Konflik operation ID');if(existing)return existing;
   const command:PreparedCommand={id:operationId,stream,sequence:(business?.sequence??0)+1,intent:frozen,recordedAt:new Date().toISOString(),status};
   await this.journal.commands.put(command);return command;
  });
 }
 async set(id:string,status:PreparedCommand['status'],result?:unknown){await this.journal.transaction('rw',this.journal.commands,async()=>{const old=await this.journal.commands.get(id);if(!old)throw new Error('Intent tidak ditemukan');await this.journal.commands.put({...old,status,...(result===undefined?{}:{result:copyInput(result)})});});}
 async confirmMoney(id:string,stream:string){return this.journal.transaction('rw',this.journal.commands,async()=>{const old=await this.journal.commands.get(id);if(!old||old.stream!==stream||old.status!=='awaiting_money')throw new Error('Refund tidak menunggu konfirmasi uang');const next={...old,status:'money_confirmed' as const,moneyConfirmedAt:new Date().toISOString()};await this.journal.commands.put(next);return next;});}
 async abandonAwaitingMoney(id:string,stream:string){return this.journal.transaction('rw',this.journal.commands,async()=>{const old=await this.journal.commands.get(id);if(!old||old.stream!==stream||old.status!=='awaiting_money')throw new Error('Persiapan refund tidak dapat dibatalkan');const next={...old,status:'abandoned' as const};await this.journal.commands.put(next);return next;});}
 async get(id:string){return this.journal.commands.get(id);}
}
