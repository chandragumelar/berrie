import 'fake-indexeddb/auto';
import { expect,it } from 'vitest';
import { createPinVerifier, MIN_ITERATIONS } from '../domain/local-pin';
import { permitBytes, type PermitPayload } from '../domain/offline-permit';
import { defaults, policyHash, type PermissionMode } from '../domain/permission-policy';
import { BerrieDatabase } from './database';
import { LocalPinSecurity } from './local-pin';
import { OfflinePermitStorage } from './offline-permit';
import { AuthorizedReports } from './authorized-reports';
import { checkpoint } from './recovery';
import { commitChange, type LockProvider } from './commit';
import { readInternalSalesReports } from './reports';
import { readInternalStockReport } from './stock-report';
import { exportSalesReportCsv } from '../domain/sales-report-csv';
import { exportStockReportCsv } from '../domain/stock-report-csv';
import { openCashSession } from './cash-sessions';
import { createStockGroup } from './stock-groups';
function locks():LockProvider {
 const queues=new Map<string,Promise<unknown>>();
 return {request<T>(name:string,fn:()=>Promise<T>){const old=queues.get(name) ?? Promise.resolve(),next=old.then(fn,fn);queues.set(name,next.catch(()=>{}));return next;}};
}
const sessionId='11111111-1111-4111-8111-111111111111';
async function setup(role:'owner'|'staff'='owner',mode:PermissionMode='allow',active=true,version:1|2=2) {
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const name=`cash-auth-${crypto.randomUUID()}`,lock=locks(),identity={storeId:'store',deviceId:'device',epoch:1,actorId:'actor'};
 let wall=Date.parse('2026-11-01T00:00:00Z'),mono=1000000;
 const now=()=>wall,clock=()=>mono,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,lock,now,clock),permit=new OfflinePermitStorage(name,{key:pair.publicKey},lock,now,clock),gateway=new AuthorizedReports(db,pin,permit,lock);
 const policy={version:1,storeId:'store',actors:[{id:'actor',role,active}],matrix:{...defaults,'stock-recap':mode},discountLimit:{rupiah:null,basisPoints:null}};
 const p:PermitPayload={version,algorithm:'ES256',keyId:'key',...identity,role,scope:'cashier',sequence:1,verifiedAt:wall,entitlementEnd:wall+30*86400000,...(version===2?{policyVersion:1,policyHash:await policyHash(policy)}:{})};
 const sign=async(payload:PermitPayload)=>{const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,permitBytes(payload)));return {payload,signature:btoa(String.fromCharCode(...signature)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};};
 await pin.installVerifier(identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(identity,'123456');await permit.install(await sign(p),identity,version===2?policy:undefined);
 return {db,pin,permit,gateway,identity,lock,policy,p,sign,now,advance:(n:number)=>{wall+=n;mono+=n},wall:(n:number)=>{wall=n},close:()=>{pin.close();permit.close();db.close();}};
}

const calendar={kind:'calendar' as const,start:'2026-11-01',end:'2026-11-02',zone:'Asia/Jakarta'};
const meta=(operationId:string,localSequence:number)=>({operationId,localSequence,storeId:'store',deviceId:'device',deviceEpoch:1,actorId:'actor',policyVersion:1,recordedAt:'2026-11-01T00:00:00Z',storeTimeZone:'Asia/Jakarta'});
async function fixture(s:Awaited<ReturnType<typeof setup>>) {
 await openCashSession(s.db,{sessionId,number:'1',initialCustodian:'actor',openingAmount:1200,timeZone:'Asia/Jakarta'},meta('open',1),s.lock);
 await createStockGroup(s.db,{groupId:'=Kopi',balance:12},meta('stock',2),s.lock,()=> '2026-11-01T00:00:00Z');
}
async function all(s:Awaited<ReturnType<typeof setup>>,i=s.identity) {return Promise.all([s.gateway.sales(i,calendar),s.gateway.salesCsv(i,calendar),s.gateway.stock(i),s.gateway.stockCsv(i)]);}
it('owner membaca dan ekspor identik dengan primitive, kalender dan sesi, tanpa mengubah checkpoint',async()=>{const s=await setup();try{
 await fixture(s);const before=await checkpoint(s.db);
 for(const filter of [calendar,{kind:'session' as const,sessionId}]) {
  const report=await readInternalSalesReports(s.db,'store',filter);
  expect(await s.gateway.sales(s.identity,filter)).toEqual({status:'ok',value:report});
  const files=exportSalesReportCsv(report);expect(await s.gateway.salesCsv(s.identity,filter)).toEqual({status:'ok',value:files});expect(Object.keys(files)).toHaveLength(5);for(const csv of Object.values(files)) expect(csv.startsWith('\ufeff')).toBe(true);
 }
 const stock=await readInternalStockReport(s.db,'store'),files=exportStockReportCsv(stock);
 expect(await s.gateway.stock(s.identity)).toEqual({status:'ok',value:stock});expect(await s.gateway.stockCsv(s.identity)).toEqual({status:'ok',value:files});expect(Object.keys(files)).toHaveLength(2);expect(files.balances).toContain("'=Kopi");for(const csv of Object.values(files))expect(csv.startsWith('\ufeff')).toBe(true);
 expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['allow','approval','owner-only'] as const)('staf ditolak pada semua operasi pada mode %s',async mode=>{const s=await setup('staff',mode);try{await fixture(s);const before=await checkpoint(s.db);expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it('identitas, database, PIN, actor dan permit v1 ditolak tanpa data',async()=>{
 for(const [role,active,version] of [['owner',false,2],['owner',true,1]] as const){const s=await setup(role,'allow',active,version);try{expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));}finally{s.close();}}
 const s=await setup();try{await fixture(s);const before=await checkpoint(s.db);
 for(const id of [{...s.identity,storeId:'other'},{...s.identity,deviceId:'other'},{...s.identity,actorId:'other'},{...s.identity,epoch:2},{...s.identity,role:'owner'}]) expect(await all(s,id)).toEqual(Array(4).fill({status:'denied'}));
 const other=new BerrieDatabase(`${s.db.name}-other`);expect(await new AuthorizedReports(other,s.pin,s.permit,s.lock).stock(s.identity)).toEqual({status:'denied'});other.close();
 await s.pin.lock();expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}
});
it('permit hilang, signature salah dan policy tidak cocok ditolak',async()=>{const s=await setup();try{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),bad=new OfflinePermitStorage(s.db.name,{key:pair.publicKey},s.lock,s.now,()=>1000000);
 expect(await new AuthorizedReports(s.db,s.pin,bad,s.lock).stock(s.identity)).toEqual({status:'denied'});bad.close();
 const name=`missing-${crypto.randomUUID()}`,db=new BerrieDatabase(name),pin=new LocalPinSecurity(name,s.lock,s.now,()=>1000000),permit=new OfflinePermitStorage(name,{key:pair.publicKey},s.lock,s.now,()=>1000000);
 await pin.installVerifier(s.identity,await createPinVerifier('123456',MIN_ITERATIONS));await pin.unlock(s.identity,'123456');expect(await new AuthorizedReports(db,pin,permit,s.lock).stock(s.identity)).toEqual({status:'denied'});pin.close();permit.close();db.close();
 const Dexie=(await import('dexie')).default,security=new Dexie(`${s.db.name}-offline-permit-security`);security.version(1).stores({permits:'&key'});const table=security.table('permits'),row=await table.get('permit');await table.put({...row,policy:{...row.policy,version:2}});security.close();expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));
 }finally{s.close();}});
it('owner dapat membaca setelah expiry; clock fault menolak semua',async()=>{const s=await setup();try{await fixture(s);const before=await checkpoint(s.db);s.advance(7*86400000);await s.pin.unlock(s.identity,'123456');expect((await all(s)).map(r=>r.status)).toEqual(['ok','ok','ok','ok']);s.wall(s.now()+5000);expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));expect(await checkpoint(s.db)).toEqual(before);}finally{s.close();}});
it('input disalin sebelum antre dan input tidak valid ditolak',async()=>{const s=await setup();try{await fixture(s);
 let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),held=s.lock.request(`berrie-writer:${s.db.name}`,async()=>{entered();await gate;});await ready;
 const filter={...calendar},id={...s.identity},pending=s.gateway.sales(id,filter);filter.start='2026-11-02';id.storeId='other';release();await held;expect(await pending).toEqual({status:'ok',value:await readInternalSalesReports(s.db,'store',calendar)});
 expect(await s.gateway.sales(s.identity,{...calendar,end:calendar.start})).toEqual({status:'denied'});expect(await s.gateway.sales(s.identity,{...calendar,role:'owner'} as typeof calendar)).toEqual({status:'denied'});
 }finally{s.close();}});
it.each(['pin','policy','actor'] as const)('perubahan %s saat antre menolak hasil tanpa bocor',async change=>{const s=await setup();try{await fixture(s);const before=await checkpoint(s.db);
 let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),read=s.permit.read.bind(s.permit);s.permit.read=async identity=>{const result=await read(identity);entered();await gate;return result;};
 const pending=s.gateway.stock(s.identity);await ready;
 if(change==='pin')await s.pin.lock();else {const policy={...s.policy,version:2,actors:change==='actor'?[{...s.policy.actors[0],active:false}]:s.policy.actors};const payload={...s.p,sequence:2,policyVersion:2,policyHash:await policyHash(policy)};await s.permit.install(await s.sign(payload),s.identity,policy);}
 release();expect(await pending).toEqual({status:'denied'});expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('pemeriksaan waktu akhir gagal tanpa data; sumber incomplete tidak diekspor',async()=>{const s=await setup();try{
 await commitChange(s.db,{operationId:'legacy',storeId:'store',deviceId:'legacy',deviceEpoch:1,localSequence:1,kind:'legacy',targetId:'unknown',actorId:'actor',policyVersion:1,payload:{},state:[{key:'order:unknown',expectedRevision:null,value:{old:true}}],ledger:[],audit:[{id:'audit',operationId:'legacy',value:{}}],outbox:{id:'outbox',operationId:'legacy',value:{}},result:{}},s.lock);
 const before=await checkpoint(s.db);expect(await s.gateway.sales(s.identity,calendar)).toMatchObject({status:'ok',value:{status:'incomplete'}});expect(await s.gateway.stock(s.identity)).toMatchObject({status:'ok',value:{status:'incomplete'}});expect(await s.gateway.salesCsv(s.identity,calendar)).toEqual({status:'denied'});expect(await s.gateway.stockCsv(s.identity)).toEqual({status:'denied'});
 const original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>fn(async identity=>{const current=await read(identity);let n=0;return {...current,assertTime:()=>{if(++n===2)throw new Error('fault');return current.assertTime();}};}));
 expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});

const now=()=> '2026-11-01T00:00:00Z';
const draft=()=>({orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000003',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:now(),items:[{id:'00000000-0000-4000-8000-000000000004',unitIds:['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007'],skuId:'00000000-0000-4000-8000-000000000006',name:' \t=Kopi, café',skuPrice:13750,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0});
it('penjualan berisi transaksi, filter dan CSV mempertahankan UTF-8 serta perlindungan formula',async()=>{const s=await setup();try{
 const {createDraft}=await import('./drafts'),{registerSkuStockMapping}=await import('./sku-stock-mappings'),{planStoredDraftStock}=await import('./draft-stock'),{payDraftCash}=await import('./confirm-first-batch');const d=draft();
 await openCashSession(s.db,{sessionId:d.cashSessionId,number:'1',initialCustodian:'actor',openingAmount:0,timeZone:'Asia/Jakarta'},meta('cash',1),s.lock);
 await createStockGroup(s.db,{groupId:'g',balance:2},meta('stock',2),s.lock,now);await registerSkuStockMapping(s.db,{skuId:d.items[0].skuId,groupId:'g'},meta('map',3),s.lock,now);await createDraft(s.db,d,meta('draft',4),s.lock,now);
 const {sources}=await planStoredDraftStock(s.db,'store',d.orderId);await payDraftCash(s.db,{orderId:d.orderId,expectedDraftRevision:sources.draftRevision,mappings:sources.mappings,groups:sources.groups,expectedSessionRevision:0,received:50000},meta('pay',5),s.lock,now);
 const before=await checkpoint(s.db);for(const filter of [calendar,{kind:'session' as const,sessionId:d.cashSessionId}]){const report=await readInternalSalesReports(s.db,'store',filter),files=exportSalesReportCsv(report);expect(report.report?.totals.gross).toBe(27500);expect(await s.gateway.sales(s.identity,filter)).toEqual({status:'ok',value:report});expect(await s.gateway.salesCsv(s.identity,filter)).toEqual({status:'ok',value:files});expect(files.events).toContain("' \t=Kopi, café");for(const file of Object.values(files)){expect(file.startsWith('\ufeff')).toBe(true);expect(file).toContain('checkpoint_boundary_json');}}
 expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it.each(['pin','permit'] as const)('kegagalan pemeriksaan akhir %s tidak melepas hasil lengkap',async failure=>{const s=await setup();try{
 await fixture(s);const before=await checkpoint(s.db);
 if(failure==='permit'){const original=s.permit.withAuthorizationLock.bind(s.permit);s.permit.withAuthorizationLock=fn=>original(read=>{let count=0;return fn(async identity=>{if(++count===2)throw new Error('final permit failure');return read(identity);});});}
 else {const original=s.pin.withAuthorizationLock.bind(s.pin);s.pin.withAuthorizationLock=fn=>original(check=>{let count=0;return fn(async identity=>{if(++count===2)throw new Error('final PIN failure');return check(identity);});});}
 expect(await all(s)).toEqual(Array(4).fill({status:'denied'}));expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
it('filter sesi toko lain dan sesi tidak dikenal tidak membocorkan laporan',async()=>{const s=await setup();try{
 await openCashSession(s.db,{sessionId,number:'1',initialCustodian:'actor',openingAmount:9999,timeZone:'Asia/Jakarta'},{...meta('other',1),storeId:'other',deviceId:'other-device'},s.lock);
 const before=await checkpoint(s.db);for(const id of [sessionId,'22222222-2222-4222-8222-222222222222']){const filter={kind:'session' as const,sessionId:id};expect(await s.gateway.sales(s.identity,filter)).toEqual({status:'denied'});expect(await s.gateway.salesCsv(s.identity,filter)).toEqual({status:'denied'});}expect(await checkpoint(s.db)).toEqual(before);
 }finally{s.close();}});
