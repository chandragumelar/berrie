import { validateBusinessRecord, type BusinessRecord } from '../domain/business-record';
import { planDraftStockDebits } from '../domain/draft-stock';
import { BerrieDatabase } from './database';
import { mappingKey, mappingRecord } from './sku-stock-mappings';
import { canonical, type AtomicChange } from './commit';
/** Read-only snapshot; confirmation must re-read and validate every source. */
export async function planStoredDraftStock(db:BerrieDatabase,storeId:string,orderId:string) {
 if(![storeId,orderId].every(x=>typeof x==='string' && !!x.trim() && x.length<=200)) throw new Error('Identitas tidak sah');
 return db.transaction('r',[db.state,db.receipts],async()=>{
  const row=await db.state.get(`draft:${orderId}`);validateBusinessRecord(row?.value);
  if(!row?.value || typeof row.value!=='object' || !('recordType' in row.value) || row.value.recordType!=='draft') throw new Error('Draft tidak ditemukan');
  if(!Number.isSafeInteger(row.revision) || row.revision<0) throw new Error('Revisi draft tidak sah');
  const draft=(row.value as Extract<BusinessRecord,{recordType:'draft'}>).draft;
  if(draft.orderId!==orderId) throw new Error('Identitas draft berbeda');
  const history=(await db.receipts.toArray()).map(r=>JSON.parse(r.payload) as AtomicChange).filter(c=>c.state.some(s=>s.key===`draft:${orderId}`));
  if(!history.length || history.some(c=>c.storeId!==storeId)) throw new Error('Toko draft berbeda');
  const latest=history.flatMap(c=>c.state.filter(s=>s.key===`draft:${orderId}`)).find(s=>(s.expectedRevision ?? -1)+1===row.revision);
  if(!latest || canonical(latest.value)!==canonical(row.value)) throw new Error('Histori draft tidak sesuai');
  const mappings=[] as {skuId:string;groupId:string;revision:number}[], groups=new Map<string,{groupId:string;balance:number;revision:number}>();
  for(const skuId of new Set(draft.items.map(i=>i.skuId))) {
   const source=await db.state.get(mappingKey(storeId,skuId));if(!source) throw new Error('Pemetaan tidak ditemukan');
   if(!Number.isSafeInteger(source.revision) || source.revision!==0) throw new Error('Revisi pemetaan tidak sah');
   const m=mappingRecord(source.value).mapping;if(m.storeId!==storeId || m.skuId!==skuId) throw new Error('Identitas pemetaan berbeda');
   mappings.push({skuId,groupId:m.groupId,revision:source.revision});
   if(!groups.has(m.groupId)) {
    const g=await db.state.get(`stock-group:${m.groupId}`);validateBusinessRecord(g?.value);
    if(!g?.value || typeof g.value!=='object' || !('recordType' in g.value) || g.value.recordType!=='stock-group') throw new Error('Grup stok tidak ditemukan');
    if(!Number.isSafeInteger(g.revision) || g.revision<0) throw new Error('Revisi grup tidak sah');
    const stock=(g.value as Extract<BusinessRecord,{recordType:'stock-group'}>).stockGroup;
    if(stock.storeId!==storeId || stock.groupId!==m.groupId) throw new Error('Identitas grup berbeda');
    groups.set(m.groupId,{groupId:m.groupId,balance:stock.balance,revision:g.revision});
   }
  }
  const balances=[...groups.values()];
  return {plan:planDraftStockDebits({draft,skuGroups:mappings,balances}),sources:{draftRevision:row.revision,mappings,groups:balances}};
 });
}
