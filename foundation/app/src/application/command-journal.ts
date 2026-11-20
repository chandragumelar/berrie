import Dexie, { type Table } from 'dexie';
import { canonical, copyInput } from '../storage/commit';
import type { BerrieDatabase } from '../storage/database';

export interface PreparedCommand { id:string; stream:string; sequence:number; intent:string; recordedAt:string; status:'prepared'|'awaiting_money'|'money_confirmed'|'unknown'|'committed'|'rejected'; result?:unknown }
class JournalDatabase extends Dexie {commands!:Table<PreparedCommand,string>;constructor(name:string){super(`${name}-commands`);this.version(1).stores({commands:'&id,stream,status'});}}
/** The journal is local recovery metadata, separate from business receipts and ledger. Production backup integration remains pending. */
export class CommandJournal {
 private journal:JournalDatabase;
 constructor(private business:BerrieDatabase){this.journal=new JournalDatabase(business.name);}
 close(){this.journal.close();}
 stream(storeId:string,deviceId:string,epoch:number){return JSON.stringify([storeId,deviceId,epoch]);}
 async pending(stream:string){return (await this.journal.commands.where('stream').equals(stream).toArray()).filter(x=>x.status==='prepared'||x.status==='awaiting_money'||x.status==='money_confirmed'||x.status==='unknown');}
 async prepare(stream:string,intent:unknown,operationId:string){const frozen=canonical(copyInput(intent));const prior=await this.pending(stream);if(prior.length){const matching=prior.find(x=>x.id===operationId&&x.intent===frozen);if(matching)return matching;throw new Error('Operasi sebelumnya belum dipastikan');}const business=await this.business.sequences.get(stream);const existing=await this.journal.commands.get(operationId);if(existing&&existing.intent!==frozen)throw new Error('Konflik operation ID');if(existing)return existing;const command:PreparedCommand={id:operationId,stream,sequence:(business?.sequence??0)+1,intent:frozen,recordedAt:new Date().toISOString(),status:'prepared'};await this.journal.commands.put(command);return command;}
 async set(id:string,status:PreparedCommand['status'],result?:unknown){const old=await this.journal.commands.get(id);if(!old)throw new Error('Intent tidak ditemukan');await this.journal.commands.put({...old,status,...(result===undefined?{}:{result:copyInput(result)})});}
 async get(id:string){return this.journal.commands.get(id);}
}
