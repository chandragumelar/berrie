import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction,createOrder,makeUnits,expected,permission,type Action,type State,type Activity} from './domain.ts';
import {catalogDraft,type MenuRow,currentRecapRows} from './workshop.ts';
import {combinationKey,validateVariables,validateValues,variablesForSKU,valuesForSKU,type MenuVariable} from './menu-variables.ts';
const a=(kind:string,data:Record<string,unknown>={},activity:Activity='Rutin'):Action=>({kind,data,activity,reason:'Uji perubahan',amount:0});
const vars:MenuVariable[]=[{id:'cup',name:'Cup',multiple:false,pricing:'combination',options:['Kecil','Besar'],defaults:[]},{id:'top',name:'Tambahan',multiple:true,pricing:'combination',options:['Keju','Jamur'],defaults:[]},{id:'heat',name:'Suhu',multiple:false,pricing:'free',options:['Hangat','Panas'],defaults:['Hangat']}];
const menuRows=():MenuRow[]=>[15000,22000].map((price,i)=>({key:'new'+i,group:'pizza',name:'Pizza uji',flavour:'',size:'',category:'Makanan',type:'Normal',price:String(price),stock:'30',threshold:'5',available:true,archived:false,toppings:[],recipes:[],variables:structuredClone(vars),variableValues:{cup:[i?'Besar':'Kecil'],top:i?['Keju','Jamur']:[],heat:['Hangat']}}));
const setup=()=>reduceAction(fixture(),a('menuGrid',{rows:menuRows()},'Harga / impor'),'menu');
test('custom multi-select combination has one explicit price, shared stock and immutable variable snapshot',()=>{
 const s=setup(),sku=s.catalog.at(-1)!,o=createOrder(s),choices={cup:['Besar'],top:['Jamur','Keju'],heat:['Panas']};
 assert.equal(valuesForSKU(sku).heat,undefined);const defaults={...Object.fromEntries(vars.map(v=>[v.id,v.defaults])),...valuesForSKU(sku)};assert.deepEqual(makeUnits(s,o,sku,1,[],'Bungkus','',undefined,{},defaults)[0].variableValues?.heat,['Hangat']);
 const u=makeUnits(s,o,sku,1,[],'Bungkus','',undefined,{},choices)[0];assert.equal(u.price,22000);assert.equal(u.toppingPrice,0);assert.deepEqual(u.variableValues?.top,['Keju','Jamur']);assert.deepEqual(u.recipes,['Cup: Besar','Tambahan: Keju + Jamur','Suhu: Panas']);
 assert.throws(()=>makeUnits(s,o,sku,1,[],'Bungkus','',undefined,{}, {...choices,top:['Jamur']}),/belum memiliki harga/);
 const old=structuredClone(u);sku.variables![2].name='Temperatur';sku.price=99000;const edited=makeUnits(s,o,sku,2,[],'Bungkus','catatan',old,{},choices);assert.equal(edited[0].price,22000);assert.equal(edited[0].variableGroups![2].name,'Suhu');assert.deepEqual(edited[0].recipes,u.recipes);assert.throws(()=>makeUnits(s,o,sku,1,[],'Bungkus','',old,{}, {...choices,cup:['Kecil']}),/item baru/);
 assert.equal(s.catalog.filter(x=>x.stockGroup==='pizza').every(x=>x.stock===30),true);
});
test('no variables stays empty; optional value and validation reject free text, duplicate options, excessive variables',()=>{
 assert.deepEqual(variablesForSKU(fixture(),fixture().catalog.find(x=>x.id==='teh')!),[]);
 assert.deepEqual(validateValues(vars,{cup:[],top:[],heat:[]}),{cup:[],top:[],heat:[]});
 for(const input of [{cup:'Besar'},{cup:['Besar','Kecil']},{top:['Keju','Keju']},{top:['Daging']},{unknown:[]}])assert.throws(()=>validateValues(vars,input));
 assert.throws(()=>validateVariables([{...vars[0],options:['A','a']}]));assert.throws(()=>validateVariables(Array.from({length:13},(_,i)=>({...vars[0],id:String(i),name:String(i)}))));
 assert.equal(combinationKey(vars,{top:['Keju','Jamur']}),combinationKey(vars,{top:['Jamur','Keju'],heat:['Panas']}));
});
test('menu save rejects mismatched definitions or duplicate combination atomically',()=>{
 const s=setup(),rows=catalogDraft(s),before=structuredClone(s);rows.at(-1)!.variables![0].name='Berbeda';assert.throws(()=>reduceAction(s,a('menuGrid',{rows},'Harga / impor'),'bad'),/Varian harus sama/);assert.deepEqual(s,before);
 const duplicate=menuRows();duplicate[1].variableValues=duplicate[0].variableValues;assert.throws(()=>reduceAction(fixture(),a('menuGrid',{rows:duplicate},'Harga / impor'),'duplicate'),/sel/);
});
const withRecap=()=>{let s=setup();s.settings.onlineStockEnabled=true;s.settings.onlineReviewedThrough=Date.now()-120000;s=reduceAction(s,a('onlineRecap',{from:s.settings.onlineReviewedThrough,until:Date.now()-60000,rows:[{group:'pizza',quantity:8}],excludesRecorded:true},'Rekap stok online'),'recap');return s;};
const correction=(quantity:number,revision=0)=>a('onlineRecapCorrection',{recap:'recap',revision,rows:[{group:'pizza',quantity}]},'Koreksi stok');
test('recap corrections apply only difference, retain original/period and retry once',()=>{
 const s=withRecap(),original=structuredClone(s.onlineRecaps![0]),until=s.settings.onlineReviewedThrough,action=correction(3),n=reduceAction(s,action,'correction');
 assert.equal(n.catalog.at(-1)!.stock,27);assert.deepEqual(n.onlineRecaps![0].rows,original.rows);assert.equal(n.settings.onlineReviewedThrough,until);assert.deepEqual(n.cash,s.cash);assert.deepEqual(n.orders,s.orders);assert.equal(currentRecapRows(n.onlineRecaps![0])[0].quantity,3);assert.equal(reduceAction(n,action,'correction'),n);
 const m=reduceAction(n,correction(5,1),'correction2');assert.equal(m.catalog.at(-1)!.stock,25);assert.equal(m.onlineRecaps![0].corrections!.length,2);assert.throws(()=>reduceAction(m,correction(4),'stale'),/sudah dikoreksi/);
});
test('recap correction validates permission, reason, quantities and shortage before any mutation',()=>{
 const s=withRecap(),before=structuredClone(s);for(const quantity of [-1,1.5,31])assert.throws(()=>reduceAction(s,correction(quantity),'invalid'+quantity));assert.deepEqual(s,before);
 assert.throws(()=>reduceAction(s,{...correction(3),reason:''},'reason'),/alasan/);assert.throws(()=>reduceAction(s,{...correction(3),activity:'Rutin'},'bypass'),/Koreksi stok/);
 const staff={...s,actor:'a'} as State;assert.equal(permission(staff,correction(3)),'Perlu persetujuan owner');assert.throws(()=>reduceAction(staff,correction(3),'staff'),/Persetujuan/);
 const wrong=correction(3);wrong.data.rows=[{group:'unknown',quantity:3}];assert.throws(()=>reduceAction(s,wrong,'wrong'),/rekap asal/);assert.deepEqual(s,before);
});
test('stock count replaces physical balance; stock input adds quantity; minimal only changes threshold',()=>{
 let s=setup();s=reduceAction(s,a('stockGrid',{rows:[{group:'pizza',mode:'in',amount:4,reason:'Produksi'}]},'Stok masuk'),'in');assert.equal(s.catalog.at(-1)!.stock,34);
 s=reduceAction(s,a('stockGrid',{rows:[{group:'pizza',mode:'count',amount:0,reason:'Hitung fisik'}]},'Koreksi stok'),'count');assert.equal(s.catalog.at(-1)!.stock,0);const ledger=s.stockLedger.length;
 s=reduceAction(s,a('stockThreshold',{rows:[{group:'pizza',threshold:12}]},'Pengaturan'),'threshold');assert.equal(s.stockLedger.length,ledger);assert.equal(s.catalog.at(-1)!.threshold,12);
});
test('same person can close directly; handover needs distinct count purpose and keeps one session/ledger',()=>{
 let s=reduceAction(fixture(),a('open',{amount:100000}),'open');const session=s.cash.id;
 s=reduceAction(s,a('count',{amount:100000}),'count');assert.throws(()=>reduceAction(s,a('handover',{actor:'a',accepted:100000,pin:'123456'}),'wrong-purpose'),/serah-terima/);
 const closed=reduceAction(s,a('close'),'close');assert.equal(closed.cash.open,false);assert.equal(closed.cash.segments.length,1);assert.equal(closed.cash.closed!.difference,0);
 s=reduceAction(s,a('cancelCount'),'cancel');assert.equal(s.cash.count,undefined);assert.equal(s.cash.countRevision.length,1);assert.deepEqual(s.cash.segments[0].counts,[100000]);s=reduceAction(s,a('count',{amount:100000,handover:true}),'handover-count');assert.throws(()=>reduceAction(s,a('close'),'wrong-close'),/hitungan akhir/);
 s=reduceAction(s,a('handover',{actor:'a',accepted:100000,pin:'123456'}),'handover');assert.equal(s.cash.id,session);assert.equal(s.cash.open,true);assert.equal(s.cash.segments.length,2);assert.equal(expected(s),100000);assert.equal(s.cash.entries.length,0);
 s=reduceAction(s,a('count',{amount:100000}),'final-count');s=reduceAction(s,a('close'),'final-close');assert.equal(s.cash.open,false);assert.equal(s.cash.segments.length,2);
});
test('count freezes mutations; cancel restores service; closed session refuses new counts',()=>{
 let s=reduceAction(fixture(),a('open',{amount:100000}),'open');const cash=a('cash',{amount:1000,direction:1,category:'Modal'},'Kas nonpenjualan');s=reduceAction(s,a('count',{amount:100000}),'count');assert.throws(()=>reduceAction(s,cash,'frozen'),/Penghitungan/);
 s=reduceAction(s,a('cancelCount'),'cancel');s=reduceAction(s,cash,'cash');assert.equal(expected(s),101000);s=reduceAction(s,a('count',{amount:101000}),'count2');s=reduceAction(s,a('close'),'close');assert.throws(()=>reduceAction(s,a('count',{amount:0}),'closed'),/Buka kas/);
});
test('owner-approved staff recap correction executes once with approver audit and rejects changed payload',()=>{
 const s=withRecap();s.actor='a';const request=correction(3);s.approvals.push({id:'approve',action:structuredClone(request),actor:'a',policy:s.policyReceived,session:s.cash.id,created:Date.now(),status:'approved',reason:'Diperiksa owner',operation:'approved-correction',decided:Date.now()});
 const changed={...request,data:{...request.data,rows:[{group:'pizza',quantity:4}]}};assert.throws(()=>reduceAction(s,changed,'changed','approve'),/Persetujuan/);
 const n=reduceAction(s,request,'approved-correction','approve');assert.equal(n.catalog.at(-1)!.stock,27);assert.equal(n.audits.at(-1)!.actor,'a');assert.equal(n.audits.at(-1)!.approver,'owner');assert.equal(n.audits.at(-1)!.object,'recap');assert.equal(reduceAction(n,request,'approved-correction','approve'),n);
});
test('handover differences remain visible in final shop difference without double counting',()=>{
 let s=reduceAction(fixture(),a('open',{amount:100000}),'open');s=reduceAction(s,a('count',{amount:95000,handover:true}),'first-count');s=reduceAction(s,a('handover',{actor:'a',accepted:95000,pin:'123456'}),'handover');assert.equal(s.cash.segments[0].difference,-5000);assert.equal(expected(s),100000);assert.equal(s.cash.countPurpose,undefined);
 s=reduceAction(s,a('count',{amount:105000}),'last-count');s=reduceAction(s,a('close'),'close');assert.equal(s.cash.closed!.difference,5000);assert.equal(s.cash.segments.reduce((n,x)=>n+(x.difference??0),0),5000);assert.equal(s.cash.entries.length,0);
});
test('unfinished order blocks final count but can continue in a new custody segment',()=>{
 let s=reduceAction(fixture(),a('open',{amount:0}),'open');const o=createOrder(s);o.identity='12';o.units=makeUnits(s,o,s.catalog.find(x=>x.id==='teh')!,1,[],'Bungkus','');o.saved=true;s.orders.push(o);const before=structuredClone(s);
 assert.throws(()=>reduceAction(s,a('count',{amount:0}),'close-count'),/Bereskan/);assert.deepEqual(s,before);
 s=reduceAction(s,a('count',{amount:0,handover:true}),'count');s=reduceAction(s,a('handover',{actor:'a',accepted:0,pin:'123456'}),'handover');assert.deepEqual(s.orders,before.orders);assert.equal(s.cash.open,true);
});
