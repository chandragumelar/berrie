import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { BerrieDatabase } from './database';
import { commitChange, type AtomicChange, type LockProvider } from './commit';
import { checkpoint, stageSnapshot } from './recovery';

const locks:LockProvider={request:async(_name,fn)=>fn()};
const change:AtomicChange={operationId:'op',storeId:'store',deviceId:'device',deviceEpoch:1,localSequence:1,kind:'test',targetId:'stock',actorId:'actor',policyVersion:1,payload:{qty:1},state:[{key:'stock',expectedRevision:null,value:{qty:4}}],ledger:[{id:'ledger',operationId:'op',value:-1}],audit:[{id:'audit',operationId:'op',value:'x'}],outbox:{id:'outbox',operationId:'op',value:'x'},result:'ok'};
const db=()=>new BerrieDatabase(`recovery-test-${crypto.randomUUID()}`);
const copy=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
it('round-trip JSON mempertahankan enam koleksi dan sumber, input tidak berubah',async()=>{
 const source=db(), target=db();try {await commitChange(source,change,locks);const original=await checkpoint(source), input=copy(original), before=copy(input);await stageSnapshot(target,input);expect(input).toEqual(before);expect(await checkpoint(target)).toEqual(original);expect(await checkpoint(source)).toEqual(original);} finally {await source.delete();await target.delete();}
});
it('menolak checkpoint rusak sebelum menulis dan tanpa mengubah input atau sumber',async()=>{
 const source=db(), target=db();try {await commitChange(source,change,locks);const original=await checkpoint(source), empty=await checkpoint(target);
 const invalid:unknown[]=[null,[],{...original,state:undefined},{...original,state:[null]}, {...original,state:[{...original.state[0],key:42}]},{...original,state:[{...original.state[0],revision:-1}]},{...original,sequences:[{...original.sequences[0],sequence:1.5}]},{...original,ledger:[...original.ledger,...original.ledger]},{...original,ledger:[{...original.ledger[0],operationId:'missing'}]},{...original,receipts:[{...original.receipts[0],payload:'{'}]},{...original,receipts:[{...original.receipts[0],payload:original.receipts[0].payload.replace('"operationId":"op"','"operationId":"other"')}]},{...original,schema:2}];
 for(const input of invalid){const before=structuredClone(input);await expect(stageSnapshot(target,input)).rejects.toThrow(/Checkpoint/);expect(input).toEqual(before);expect(await checkpoint(target)).toEqual(empty);expect(await checkpoint(source)).toEqual(original);}
 } finally {await source.delete();await target.delete();}
});
it('staging terisi ditolak tanpa perubahan',async()=>{
 const source=db(), target=db();try {await commitChange(source,change,locks);const snapshot=await checkpoint(source);await stageSnapshot(target,snapshot);const before=await checkpoint(target);await expect(stageSnapshot(target,snapshot)).rejects.toThrow('Staging tidak kosong');expect(await checkpoint(target)).toEqual(before);expect(await checkpoint(source)).toEqual(snapshot);} finally {await source.delete();await target.delete();}
});
it('kegagalan penulisan di tengah transaksi membatalkan enam koleksi',async()=>{
 const source=db(), target=db();try {await commitChange(source,change,locks);const snapshot=await checkpoint(source), before=await checkpoint(target);const spy=vi.spyOn(target.outbox,'bulkAdd').mockRejectedValueOnce(new Error('penulisan gagal'));await expect(stageSnapshot(target,snapshot)).rejects.toThrow('penulisan gagal');spy.mockRestore();expect(await checkpoint(target)).toEqual(before);expect(await checkpoint(source)).toEqual(snapshot);} finally {await source.delete();await target.delete();}
});
