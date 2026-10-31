import {fixture,createOrder,makeUnits,reduceAction,type Action,type State} from './domain.ts';
// Explicit review-only fixture. Never loaded by product navigation or real storage.
export function ordersReviewFixture(now:number):State{
 let s=fixture();s.settings.enabledChannels=['GoFood'];s.settings.channelAccounts={GoFood:'Outlet contoh'};s.catalog.forEach(x=>x.stock=1000);
 const apply=(kind:string,data:Record<string,unknown>={},reason='')=>{const o=s.orders.at(-1);const a:Action={kind,activity:'Rutin',order:kind==='open'?undefined:o?.id,revision:kind==='open'?undefined:o?.revision,data,reason,amount:0};s=reduceAction(s,a,`review-${s.seq}-${kind}-${s.orders.at(-1)?.revision??0}`);};
 apply('open',{amount:'1000000'});
 const pay=()=>apply('settle',{source:'Payment',method:'Tunai',received:'1000000'});
 for(let i=0;i<22;i++){
  const o=createOrder(s);o.identity=['Rani · Lunas belum disajikan','Budi · Sudah disajikan belum bayar','Sari · Sebagian disajikan','Keluarga Pak Ahmad dengan pesanan bersama untuk acara kantor sore ini','Dewi · Refund tertunda'][i]??`Pelanggan antrean ${i+1}`;
  if(i===8){o.channel='GoFood';o.externalId='GF-ANTREAN-009';}
  o.units=[...makeUnits(s,o,s.catalog.find(x=>x.id==='air')!,3,[],'Bungkus',''),...makeUnits(s,o,s.catalog.find(x=>x.id==='teh')!,2,[],'Makan di tempat','Tanpa gula')];s.orders.push(o);s.seq++;
  if(i===5||i===6){apply('save');s.orders.at(-1)!.savedAt=now-(i-4)*60000;continue;}
  apply('process');s.orders.at(-1)!.batches[0].time=now-(40-i)*60000;
  if(i===0||i===4)pay();
  if(i===1)apply('serve',{units:s.orders.at(-1)!.units.map(u=>u.id)});
  if(i===2||i===3)apply('serve',{units:s.orders.at(-1)!.units.slice(0,2).map(u=>u.id)});
  if(i===3){const current=s.orders.at(-1)!;current.units.push(...makeUnits(s,current,s.catalog.find(x=>x.id==='roti')!,2,[],'Bungkus',''));apply('process');s.orders.at(-1)!.batches[1].time=now-2*60000;const last=s.orders.at(-1)!;last.units.push(...makeUnits(s,last,s.catalog.find(x=>x.id==='jus')!,1,[],'Makan di tempat',''));}
  if(i===4)apply('cancel',{units:s.orders.at(-1)!.units.map(u=>u.id),kitchen:true},'Pelanggan membatalkan setelah bayar');
  if(i===21)s.orders.at(-1)!.batches[0].time=Number.NaN;
 }
 return s;
}
