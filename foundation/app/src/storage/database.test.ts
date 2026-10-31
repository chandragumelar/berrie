import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BerrieDatabase } from './database';
import { canonical, commitChange, type AtomicChange, type LockProvider } from './commit';
const locks:LockProvider={request:async(_name,fn)=>fn()};
const change=(op:string,revision:number|null):AtomicChange=>({operationId:op,storeId:'store',deviceId:'device',deviceEpoch:1,localSequence:1,kind:'test',targetId:'stock',actorId:'actor',policyVersion:1,payload:{qty:1},state:[{key:'stock',expectedRevision:revision,value:4}],ledger:[{id:'ledger-'+op,operationId:op,value:-1}],audit:[{id:'audit-'+op,operationId:op,value:'x'}],outbox:{id:'outbox-'+op,operationId:op,value:'x'},result:'ok'});
it('rollback saat event gagal dan tidak menyimpan hasil parsial',async()=>{const db=new BerrieDatabase(`test-${crypto.randomUUID()}`);await db.ledger.add({id:'ledger-op',operationId:'other',value:0});await expect(commitChange(db,change('op',null),locks)).rejects.toThrow();expect(await Promise.all([db.state.count(),db.audit.count(),db.outbox.count(),db.receipts.count()])).toEqual([0,0,0,0]);await db.delete();});
it('retry identik setelah reload tidak menggandakan, perubahan payload ditolak',async()=>{const name=`test-${crypto.randomUUID()}`, db=new BerrieDatabase(name), c=change('op',null);expect(await commitChange(db,c,locks)).toBe('ok');db.close();const reopened=new BerrieDatabase(name);expect(await commitChange(reopened,c,locks)).toBe('ok');await expect(commitChange(reopened,{...c,payload:{qty:2}},locks)).rejects.toThrow('Konflik');expect(await reopened.ledger.count()).toBe(1);await reopened.delete();});
it('revisi stale dan envelope invalid ditolak',async()=>{const db=new BerrieDatabase(`test-${crypto.randomUUID()}`);await commitChange(db,change('op',null),locks);await expect(commitChange(db,change('other',null),locks)).rejects.toThrow('Revisi');await expect(commitChange(db,{...change('bad',0),actorId:''},locks)).rejects.toThrow('Envelope');expect(await db.receipts.count()).toBe(1);await db.delete();});

import { checkpoint, stageSnapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';
it('staging gagal tidak menyentuh data asal atau meninggalkan hasil parsial',async()=>{const source=new BerrieDatabase(`test-${crypto.randomUUID()}`),target=new BerrieDatabase(`test-${crypto.randomUUID()}`);await commitChange(source,change('op',null),locks);const snapshot=await checkpoint(source);await expect(stageSnapshot(target,{...snapshot,ledger:[...snapshot.ledger,...snapshot.ledger]})).rejects.toThrow();expect(await target.state.count()).toBe(0);expect(await source.ledger.count()).toBe(1);await stageSnapshot(target,snapshot);expect(await checkpoint(target)).toEqual(snapshot);await source.delete();await target.delete();});

it('membekukan input operasi saat menunggu lock tanpa mengubah objek pemanggil',async()=>{
 const db=new BerrieDatabase(`test-${crypto.randomUUID()}`),stage=new BerrieDatabase(`stage-${crypto.randomUUID()}`);
 const input:AtomicChange={...change('original',null),payload:{nested:{qty:1}},state:[{key:'stock',expectedRevision:null,value:{nested:{qty:4}}}],ledger:[{id:'ledger-original',operationId:'original',value:{nested:1}}],audit:[{id:'audit-original',operationId:'original',value:{nested:2}}],outbox:{id:'outbox-original',operationId:'original',value:{nested:3}},result:{nested:{ok:true}}};
 const original=structuredClone(input);let release!:()=>void;let entered!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve}),requested=new Promise<void>(resolve=>{entered=resolve});
 const blocking:LockProvider={request:async(_name,fn)=>{entered();await held;return fn()}};
 const pending=commitChange(db,input,blocking);await requested;
 input.operationId='changed';input.storeId='changed';input.deviceId='changed';input.deviceEpoch=2;input.localSequence=2;input.kind='changed';input.targetId='changed';input.actorId='changed';input.policyVersion=2;
 (input.payload as {nested:{qty:number}}).nested.qty=99;(input.state[0].value as {nested:{qty:number}}).nested.qty=99;input.state[0].key='changed';
 input.ledger[0].id='changed';(input.ledger[0].value as {nested:number}).nested=99;input.audit[0].id='changed';(input.audit[0].value as {nested:number}).nested=99;input.outbox.id='changed';(input.outbox.value as {nested:number}).nested=99;(input.result as {nested:{ok:boolean}}).nested.ok=false;
 release();expect(await pending).toEqual(original.result);
 const snapshot=await checkpoint(db);expect(snapshot.state).toEqual([{key:'stock',revision:0,value:original.state[0].value}]);expect(snapshot.ledger).toEqual(original.ledger);expect(snapshot.audit).toEqual(original.audit);expect(snapshot.outbox).toEqual([original.outbox]);expect(snapshot.receipts).toEqual([{id:original.operationId,payload:canonical(original),result:original.result}]);expect(snapshot.sequences).toEqual([{key:JSON.stringify(['store','device',1]),sequence:1}]);
 expect(validateCheckpoint(snapshot)).toEqual(snapshot);await stageSnapshot(stage,snapshot);expect(await checkpoint(stage)).toEqual(snapshot);
 expect(await commitChange(db,original,locks)).toEqual(original.result);expect(await checkpoint(db)).toEqual(snapshot);
 await expect(commitChange(db,{...original,payload:{nested:{qty:2}}},locks)).rejects.toThrow('Konflik');expect(await checkpoint(db)).toEqual(snapshot);
 await db.delete();await stage.delete();
});
