import { expect, it } from "vitest";
import { freezeSettlement } from "./settlement";
import { initialServing } from "./serving";
import { planFreeCancellation } from "./free-cancellation";
import type { FirstBatch } from "./first-batch";
const batch:FirstBatch={storeId:'store',number:1,confirmedAt:'2026-11-01T00:00:00Z',skuGroups:[{skuId:'00000000-0000-4000-8000-000000000004',groupId:'group'}],draft:{orderId:'00000000-0000-4000-8000-000000000001',displayNumber:'261101-E1-0001',cashSessionId:'00000000-0000-4000-8000-000000000002',customer:'A',channel:'store',channelAccountId:'',externalOrderId:'',serving:'takeaway',note:'',savedAt:'2026-11-01T00:00:00Z',items:[{id:'00000000-0000-4000-8000-000000000003',unitIds:['00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005'],skuId:'00000000-0000-4000-8000-000000000004',name:'Kopi',skuPrice:10000,toppingPrice:0,promo:{kind:'none',revision:0},choices:[],toppings:[],serving:'takeaway',note:''}],discount:{kind:'none'},taxBp:0,serviceBp:0}};
function snapshot() { const d=batch.draft; return freezeSettlement(d.orderId,d.items.map(i=>({unitIds:i.unitIds,skuId:i.skuId,skuPrice:i.skuPrice,toppingPrice:i.toppingPrice,promo:i.promo})),{kind:"percent",value:10000},0,0,"free"); }
it("selects only processed free units",()=>{
 const b=structuredClone(batch); b.draft.discount={kind:"percent",value:10000}; const s=initialServing(b), item=b.draft.items[0];
 expect(planFreeCancellation(b,snapshot(),s,[{itemId:item.id,quantity:1}])).toEqual([item.unitIds[1]]);
 s.units[1].status="cancelled"; s.units[0].status="served";
 expect(()=>planFreeCancellation(b,snapshot(),s,[{itemId:item.id,quantity:1}])).toThrow();
 expect(()=>planFreeCancellation(b,snapshot(),s,[{itemId:item.id,quantity:1},{itemId:item.id,quantity:1}])).toThrow();
});
