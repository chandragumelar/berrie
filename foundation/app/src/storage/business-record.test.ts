import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { freezeSettlement, refund, type SaleLine } from '../domain/settlement';
import { createRefundHistoryRecord, createSettlementRecord } from '../domain/business-record';
import { BerrieDatabase } from './database';
import { canonical, commitChange, type AtomicChange, type LockProvider } from './commit';
import { checkpoint, stageSnapshot } from './recovery';
import { validateCheckpoint } from './validate-checkpoint';

const locks:LockProvider={request:async(_name,fn)=>fn()};
const line=(ids:string[],price:number):SaleLine=>({unitIds:ids,skuId:'sku',skuPrice:price,toppingPrice:0,promo:{kind:'none',revision:1}});
const settlement=()=>freezeSettlement('order',[line(['A'],10000),line(['B'],20000)],{kind:'amount',value:1000},1000,500,'payment');
const promo=()=>freezeSettlement('promo',[{...line(['a','b','c'],10000),promo:{kind:'buyXGetY',buy:2,free:1,promotionId:'p',revision:1},identity:{toppings:[],choices:[],serving:'takeaway',note:''}}],{kind:'none'},0,0,'payment');
const change=(value:unknown,op='one',revision:number|null=null,sequence=1):AtomicChange=>({operationId:op,storeId:'s',deviceId:'d',deviceEpoch:1,localSequence:sequence,kind:'test',targetId:'x',actorId:'a',policyVersion:1,payload:{},state:[{key:'x',expectedRevision:revision,value}],ledger:[{id:'l'+op,operationId:op,value:1}],audit:[{id:'a'+op,operationId:op,value:1}],outbox:{id:'o'+op,operationId:op,value:1},result:'ok'});
const db=()=>new BerrieDatabase(`business-${crypto.randomUUID()}`);
it('settlement, promo dan refund bertahap round-trip serta replay tanpa mutasi input',async()=>{
 const s=settlement(),a=refund(s,[],['A']),b=refund(s,[a],['B']);expect(s.totals.total).toBe(33350);expect([a.amount,b.amount]).toEqual([11117,22233]);
 const input=structuredClone(s),history=[a,b],before=structuredClone(history);
 const values=[createSettlementRecord(s),createSettlementRecord(promo()),createRefundHistoryRecord(s,history),{kind:'settlement',legacy:true}];
 expect(s).toEqual(input);expect(history).toEqual(before);s.units[0].skuPrice=1;expect((values[0] as {settlement:typeof s}).settlement).toEqual(input);
 const source=db(),target=db();try {
  for(let i=0;i<values.length;i++){const c=change(values[i],String(i),i===0?null:i-1,i+1);await commitChange(source,c,locks);const after=await checkpoint(source);expect(after.state[0].value).toEqual(values[i]);expect(await commitChange(source,c,locks)).toBe('ok');expect(await checkpoint(source)).toEqual(after);}
  const snapshot=await checkpoint(source);validateCheckpoint(snapshot);await stageSnapshot(target,snapshot);expect(await checkpoint(target)).toEqual(snapshot);expect((await checkpoint(source))).toEqual(snapshot);
 } finally {await source.delete();await target.delete();}
});
it('menolak semua record rusak sebelum mengubah isi enam tabel',async()=>{
 const s=settlement(),a=refund(s,[],['A']);const good=createSettlementRecord(s),p=createSettlementRecord(promo());
 const total=structuredClone(good);total.settlement.totals.total++;
 const allocation=structuredClone(good);allocation.settlement.totals.allocations[0].total++;
 const brokenPromo=structuredClone(p);brokenPromo.settlement.units[0].promoAmount++;
 const invalid:unknown[]=[total,allocation,brokenPromo,{recordType:'unknown',schemaVersion:1},{...good,schemaVersion:2},{recordType:'settlement',schemaVersion:1}, {recordType:'refund-history',schemaVersion:1,settlement:s,refunds:[a,a]}, {recordType:'refund-history',schemaVersion:1,settlement:s,refunds:[{...a,amount:33351}]}, {recordType:'refund-history',schemaVersion:1,settlement:s,refunds:[{...a,source:'platform'}]}, {recordType:'refund-history',schemaVersion:1,settlement:s,refunds:[{...a,unitIds:['wrong']}]}];
 const source=db();try {await commitChange(source,change({kind:'legacy'}),locks);const before=await checkpoint(source);
  for(const value of invalid){const input=change(value,'bad',0,2),copy=structuredClone(input);await expect(commitChange(source,input,locks)).rejects.toThrow();expect(input).toEqual(copy);expect(await checkpoint(source)).toEqual(before);}
  expect(()=>createSettlementRecord(total.settlement)).toThrow();expect(()=>createRefundHistoryRecord(s,[a,a])).toThrow();
 } finally {await source.delete();}
});
it('checkpoint menolak record terkini dan receipt historis invalid sebelum staging',async()=>{
 const source=db(),target=db();try {const good=createSettlementRecord(settlement());await commitChange(source,change(good),locks);await commitChange(source,change(good,'two',0,2),locks);const original=await checkpoint(source),empty=await checkpoint(target);
  for(const historical of [false,true]) {const damaged=structuredClone(original);const index=historical?0:1;const receipt=damaged.receipts[index];const parsed=JSON.parse(receipt.payload);parsed.state[0].value.settlement.totals.total++;receipt.payload=canonical(parsed);if(!historical) damaged.state[0].value=parsed.state[0].value;
   const input=structuredClone(damaged);expect(()=>validateCheckpoint(damaged)).toThrow();await expect(stageSnapshot(target,damaged)).rejects.toThrow();expect(damaged).toEqual(input);expect(await checkpoint(source)).toEqual(original);expect(await checkpoint(target)).toEqual(empty);
  }
 } finally {await source.delete();await target.delete();}
});
