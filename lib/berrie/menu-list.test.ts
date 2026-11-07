import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,reduceAction,type Action} from './domain.ts';
import {catalogDraft} from './workshop.ts';
import {bulkMenuDraft,filterMenuGroups,menuGroups,replaceMenuDraft} from './menu-list.ts';

test('groups use IDs, retain mixed status and category, and combine filters',()=>{
 const rows=catalogDraft(fixture()),first=rows[0];
 const members=[{...first,key:'a',group:'one',name:'Sama',category:'Minuman',available:true,price:'100'}, {...first,key:'b',group:'one',name:'Sama',category:'Makanan',available:false,price:'200',variables:[{id:'size',name:'Ukuran',multiple:false,pricing:'combination' as const,options:['Besar'],defaults:['Besar']}],variableValues:{size:['Besar']}}, {...first,key:'c',group:'two',name:'Sama',available:true}, {...first,key:'d',group:'one',archived:true}];
 const groups=menuGroups(members);assert.equal(groups.length,2);assert.equal(groups[0].status,'Sebagian dijual');assert.equal(groups[0].category,'Beragam');assert.deepEqual([groups[0].minPrice,groups[0].maxPrice],[100,200]);
 assert.deepEqual(filterMenuGroups(groups,'besar','Makanan','Sebagian dijual').map(x=>x.id),['one']);assert.equal(filterMenuGroups(groups,'besar','Minuman','Dijual').length,0);
});

test('replacing one menu retains all other rows and existing SKU identity',()=>{
 const rows=catalogDraft(fixture()),group=rows[0].group,other=structuredClone(rows.filter(r=>r.group!==group));
 const replacement=rows.filter(r=>r.group===group).map(r=>({...r,name:'Nama baru'}));
 const result=replaceMenuDraft(rows,group,replacement);
 assert.deepEqual(result.filter(r=>r.group!==group),other);
 assert.deepEqual(result.filter(r=>r.group===group).map(r=>r.sku),replacement.map(r=>r.sku));
 assert.throws(()=>replaceMenuDraft(rows,group,[{...replacement[0],group:'other'}]));
});

test('committing one menu preserves other catalog entries and order history byte for byte',()=>{
 const s=fixture(),rows=catalogDraft(s),group=rows.find(r=>r.name==='Es Teh')!.group;
 const updated=rows.map(r=>r.group===group?{...r,name:'Es Teh baru'}:r);
 const a:Action={kind:'menuGrid',activity:'Harga / impor',data:{rows:updated},reason:'Edit menu',amount:0};
 const n=reduceAction(s,a,'one-menu');
 assert.deepEqual(n.catalog.filter(x=>(x.stockGroup??x.id)!==group),s.catalog.filter(x=>(x.stockGroup??x.id)!==group));
 assert.deepEqual(n.orders,s.orders);
 assert.equal(n.catalog.find(x=>x.id==='teh')?.name,'Es Teh baru');
});

test('bulk draft targets only selected active SKUs and one channel; failed commit is atomic',()=>{
 const s=fixture(),rows=catalogDraft(s),target=rows[0].group,old=structuredClone(s),draft=bulkMenuDraft(rows,[target],{kind:'discount',channel:'GoFood',value:'missing'});
 for(let i=0;i<rows.length;i++){if(rows[i].group===target&&!rows[i].archived){assert.equal(draft[i].discountAssignments?.GoFood,'missing');assert.equal(draft[i].discountAssignments?.Toko,rows[i].discountAssignments?.Toko);}else assert.deepEqual(draft[i],rows[i]);}
 const a:Action={kind:'menuGrid',activity:'Harga / impor',data:{rows:draft},reason:'Edit massal',amount:0};assert.throws(()=>reduceAction(s,a,'bulk-invalid'));assert.deepEqual(s,old);
});

test('bulk commit changes only selected group and requested channel, with replay idempotent',()=>{
 const s=fixture(),rows=catalogDraft(s),target=rows[0].group,definition=s.discounts!.find(d=>!d.archived)!;
 const draft=bulkMenuDraft(rows,[target],{kind:'discount',channel:'Toko',value:definition.id});
 const a:Action={kind:'menuGrid',activity:'Harga / impor',data:{rows:draft,catalogVersion:JSON.stringify(s.catalog)},reason:'Edit massal',amount:0};
 const n=reduceAction(s,a,'bulk-valid');
 for(const old of s.catalog){const result=n.catalog.find(x=>x.id===old.id)!;if((old.stockGroup??old.id)===target&&!old.archived){assert.equal(result.discountAssignments?.Toko,definition.id);assert.deepEqual(result.discountAssignments?.GoFood,old.discountAssignments?.GoFood);}else assert.deepEqual(result,old);}
 assert.deepEqual(reduceAction(n,a,'bulk-valid'),n);assert.deepEqual(n.orders,s.orders);assert.deepEqual(n.stockLedger,s.stockLedger);
});
