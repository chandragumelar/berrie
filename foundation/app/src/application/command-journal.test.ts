import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import Dexie from 'dexie';
import {BerrieDatabase} from '../storage/database';
import {CommandJournal} from './command-journal';

it('unknown memakai operasi dan sequence semula, penolakan tidak membuat gap',async()=>{const name=crypto.randomUUID(),db=new BerrieDatabase(name),journal=new CommandJournal(db),stream=journal.stream('store','device',1);try{
 const first=await journal.prepare(stream,{kind:'draft',id:'a'},'op-1');expect(first.sequence).toBe(1);await journal.set('op-1','unknown');await expect(journal.prepare(stream,{kind:'cash',id:'b'},'op-2')).rejects.toThrow();expect((await journal.prepare(stream,{kind:'draft',id:'a'},'op-1')).sequence).toBe(1);
 await journal.set('op-1','rejected');const retry=await journal.prepare(stream,{kind:'draft',id:'a'},'op-1');expect(retry.sequence).toBe(1);await journal.set('op-1','committed',{id:'a'});await db.sequences.put({key:stream,sequence:1});expect((await journal.prepare(stream,{kind:'cash',id:'b'},'op-2')).sequence).toBe(2);
 }finally{journal.close();await db.delete();await Dexie.delete(`${name}-commands`);}});

it('intent tutup kas unknown membekukan revisi dan alasan sampai receipt diperiksa',async()=>{const name=crypto.randomUUID(),db=new BerrieDatabase(name),journal=new CommandJournal(db),stream=journal.stream('store','device',1);try{
 const intent={kind:'cash-count-close',input:{sessionId:'session-1',expectedSessionRevision:4,expectedCountRevision:2,reason:'Selisih fisik'}};
 const first=await journal.prepare(stream,intent,'close-op');await journal.set('close-op','unknown');
 const retried=await journal.prepare(stream,intent,'close-op');expect(retried).toMatchObject({id:first.id,sequence:first.sequence,recordedAt:first.recordedAt,intent:first.intent});
 await expect(journal.prepare(stream,{...intent,input:{...intent.input,reason:'Alasan baru'}},'close-op')).rejects.toThrow();
 await expect(journal.prepare(stream,{kind:'cash-count-save',input:{sessionId:'session-1',amount:0}},'count-op')).rejects.toThrow();
 await journal.set('close-op','committed',{sessionId:'session-1'});await db.sequences.put({key:stream,sequence:1});
 await expect(journal.prepare(stream,{...intent,input:{...intent.input,reason:'Alasan baru'}},'close-op')).rejects.toThrow('Konflik operation ID');
 const next=await journal.prepare(stream,{kind:'cash-count-save',input:{sessionId:'session-2',amount:0}},'count-op');expect(next.sequence).toBe(2);
 }finally{journal.close();await db.delete();await Dexie.delete(`${name}-commands`);}});
