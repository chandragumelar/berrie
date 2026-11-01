import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { createSettlementRecord } from '../domain/business-record';
import { freezeSettlement } from '../domain/settlement';
import { BerrieDatabase } from './database';
import { canonical, commitChange, type AtomicChange, type LockProvider } from './commit';
import { checkpoint } from './recovery';
const locks:LockProvider={request:async(_name,fn)=>fn()};
it('menolak settlement kedua pada key berbeda tanpa efek parsial',async()=>{
 const db=new BerrieDatabase(`transition-${crypto.randomUUID()}`);
 const value=createSettlementRecord(freezeSettlement('order',[{unitIds:['a'],skuId:'s',skuPrice:100,toppingPrice:0,promo:{kind:'none',revision:1}}],{kind:'none'},0,0,'payment'));
 const change=(operationId:string,key:string,localSequence:number):AtomicChange=>({operationId,storeId:'store',deviceId:'device',deviceEpoch:1,localSequence,kind:'test',targetId:'order',actorId:'actor',policyVersion:1,payload:{},state:[{key,expectedRevision:null,value}],ledger:[],audit:[{id:`a-${operationId}`,operationId,value:1}],outbox:{id:`o-${operationId}`,operationId,value:1},result:'ok'});
 try {await commitChange(db,change('one','one',1),locks);const before=await checkpoint(db);await expect(commitChange(db,change('two','two',2),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);} finally {await db.delete();}
});

it('menjaga histori refund dan menolak perubahan tanpa efek parsial',async()=>{
 const {createRefundHistoryRecord}=await import('../domain/business-record');const {refund}=await import('../domain/settlement');
 const db=new BerrieDatabase(`transition-${crypto.randomUUID()}`),stage=new BerrieDatabase(`stage-${crypto.randomUUID()}`);
 const s=freezeSettlement('order',[{unitIds:['a','b'],skuId:'s',skuPrice:100,toppingPrice:0,promo:{kind:'none',revision:1}}],{kind:'none'},0,0,'payment');
 const a=refund(s,[],['a']),b=refund(s,[a],['b']);
 const mk=(id:string,key:string,value:unknown,revision:number|null,seq:number):AtomicChange=>({operationId:id,storeId:'store',deviceId:'device',deviceEpoch:1,localSequence:seq,kind:'test',targetId:'order',actorId:'actor',policyVersion:1,payload:{},state:[{key,expectedRevision:revision,value}],ledger:[{id:`l-${id}`,operationId:id,value:1}],audit:[{id:`a-${id}`,operationId:id,value:1}],outbox:{id:`o-${id}`,operationId:id,value:1},result:'ok'});
 try {
  await commitChange(db,mk('s','settlement',createSettlementRecord(s),null,1),locks);
  await commitChange(db,mk('a','refund',createRefundHistoryRecord(s,[a]),null,2),locks);
  const before=await checkpoint(db);
  const other=freezeSettlement('order',[{unitIds:['a','b'],skuId:'s',skuPrice:101,toppingPrice:0,promo:{kind:'none',revision:1}}],{kind:'none'},0,0,'payment');
  const invalid=[mk('x','settlement',createSettlementRecord(other),0,3),mk('x','settlement',{legacy:true},0,3),mk('x','refund',createRefundHistoryRecord(s,[]),0,3),mk('x','refund',{legacy:true},0,3),mk('x','other',createRefundHistoryRecord(other,[]),null,3),mk('x','other',createRefundHistoryRecord(s,[a]),null,3),mk('x','refund',{recordType:'refund-history',schemaVersion:1,settlement:s,refunds:[a,a]},0,3)];
  for(const change of invalid) {await expect(commitChange(db,change,locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(before);}
  const valid=mk('b','refund',createRefundHistoryRecord(s,[a,b]),0,3);await commitChange(db,valid,locks);expect(a.amount+b.amount).toBe(s.totals.total);const after=await checkpoint(db);
  await expect(commitChange(db,mk('x','refund',createRefundHistoryRecord(s,[b,a]),1,4),locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(after);
  db.close();await db.open();expect(await commitChange(db,valid,locks)).toBe('ok');await expect(commitChange(db,{...valid,payload:{different:true}},locks)).rejects.toThrow();expect(await checkpoint(db)).toEqual(after);
  const {stageSnapshot}=await import('./recovery');
  const corrupted=structuredClone(after);const receipt=corrupted.receipts.find(r=>r.id==='a')!;const parsed=JSON.parse(receipt.payload);parsed.state[0].value=createRefundHistoryRecord(s,[b]);receipt.payload=canonical(parsed);const empty=await checkpoint(stage);await expect(stageSnapshot(stage,corrupted)).rejects.toThrow();expect(await checkpoint(stage)).toEqual(empty);expect(await checkpoint(db)).toEqual(after);
  const wrong=structuredClone(after);for(const r of wrong.receipts) {const c=JSON.parse(r.payload);if(c.state[0].key==='refund') {const n=c.operationId==='a'?1:2;const x=refund(other,[],['a']);const y=refund(other,[x],['b']);c.state[0].value=createRefundHistoryRecord(other,n===1?[x]:[x,y]);r.payload=canonical(c);}}wrong.state.find(row=>row.key==='refund')!.value=createRefundHistoryRecord(other,[refund(other,[],['a']),refund(other,[refund(other,[],['a'])],['b'])]);await expect(stageSnapshot(stage,wrong)).rejects.toThrow();expect(await checkpoint(stage)).toEqual(empty);expect(await checkpoint(db)).toEqual(after);
  await stageSnapshot(stage,{...after,receipts:[...after.receipts].reverse()});expect((await checkpoint(stage)).state).toEqual(after.state);
 } finally {await db.delete();await stage.delete();}
});
