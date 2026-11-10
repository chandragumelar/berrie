import { permitExpiry } from '../domain/offline-permit';
import { configurableActivities, discountWithinLimit, type ConfigurableActivity } from '../domain/permission-policy';
import { integer } from '../domain/money';
import { canonical } from './commit';
import { evaluatePermit, type Capability } from './permit-capability';
import type { OfflinePermitStorage } from './offline-permit';
import type { LocalPinSecurity, PinIdentity } from './local-pin';
import type { BerrieDatabase } from './database';

const configurable:Record<ConfigurableActivity,Capability>={refund:'complete-unit','cancel-confirmed':'complete-unit',discount:'new-order','free-settlement':'complete-unit','stock-correction':'stock-for-unit','stock-in':'stock-general','cash-adjustment':'cash-support','price-change':'stock-general','sku-promo':'stock-general','payment-correction':'complete-unit',archive:'stock-general','sale-status':'stock-general','late-order':'new-order','platform-adjustment':'cash-support','stock-recap':'stock-general'};
const regular={sale:'new-order',addition:'new-addition',payment:'complete-unit',process:'complete-unit',serve:'complete-unit','cancel-draft':'complete-unit','cash-open':'cash-support','cash-close':'cash-support','cash-handover':'cash-support',read:'read'} as const satisfies Record<string,Capability>;
const owner={settings:'catalog',staff:'catalog',security:'catalog',recovery:'restore',export:'export',backup:'backup',reports:'read','menu-management':'catalog'} as const satisfies Record<string,Capability>;
export type Activity=ConfigurableActivity|keyof typeof regular|keyof typeof owner;
export type ActivityDecision={result:'allow'|'approval-required'|'deny';reason:string};
/** Decision is advisory. Recheck the exact payload and source revisions within the future atomic command. */
export async function evaluateActivity(storage:OfflinePermitStorage,pin:LocalPinSecurity,identity:PinIdentity,db:BerrieDatabase,input:{activity:string;deviceScope:'cashier'|'phone'|'reader';unit?:{orderId:string;unitId:string};discount?:{subtotal:number;amount:number;revision:number}}):Promise<ActivityDecision> {
 identity={...identity};
 input=input && {...input,unit:input.unit && {...input.unit},discount:input.discount && {...input.discount}};
 const deny=(reason:string):ActivityDecision=>({result:'deny',reason});
 try {
 if(!input || input.deviceScope!=='cashier') return deny('device-scope');
 const activity=input.activity;
 if(typeof activity!=='string' || !(Object.hasOwn(configurable,activity)||Object.hasOwn(regular,activity)||Object.hasOwn(owner,activity))) return deny('unknown-activity');
 const first=await storage.read(identity);
 if(first.permit.payload.version!==2 || !first.policy) return deny('policy-unavailable');
 const actor=first.policy.actors.find(a=>a.id===identity.actorId);
 if(!actor || !actor.active || actor.role!==first.permit.payload.role) return deny('inactive-or-mismatched-actor');
 if(Object.hasOwn(owner,activity) && actor.role!=='owner') return deny('owner-only');
 const capability=(Object.hasOwn(configurable,activity)?configurable[activity as ConfigurableActivity]:Object.hasOwn(regular,activity)?regular[activity as keyof typeof regular]:owner[activity as keyof typeof owner]);
 const permitted=await evaluatePermit(storage,pin,identity,db,capability,input.unit);
 const final=await storage.read(identity);
 if(canonical(first.permit)!==canonical(final.permit)||canonical(first.policy)!==canonical(final.policy)) return deny('policy-changed');
 if((permitted.status==='normal' && final.now>=permitExpiry(final.permit.payload)) || !await pin.checkIdentity(identity)) return deny('session-or-expiry-changed');
 if(!permitted.allowed || final.clockFault) return deny(permitted.status==='online-required'?'clock-fault':permitted.status==='limited'?'limited-mode':'pin-or-scope');
 if(activity==='discount') {
  const d=input.discount;
  try { if(!d) return deny('discount-input'); integer(d.revision,1,Number.MAX_SAFE_INTEGER); integer(d.subtotal,0,Number.MAX_SAFE_INTEGER); integer(d.amount,0,d.subtotal); } catch { return deny('discount-input'); }
 }
 if(actor.role==='owner') return {result:'allow',reason:'owner'};
 if(configurableActivities.includes(activity as ConfigurableActivity)) {
  const mode=first.policy.matrix[activity as ConfigurableActivity];
  if(mode==='owner-only') return deny('owner-only');
  if(mode==='approval') return {result:'approval-required',reason:'policy'};
  if(activity==='discount' && !discountWithinLimit(input.discount!.subtotal,input.discount!.amount,first.policy.discountLimit)) return {result:'approval-required',reason:'discount-limit'};
 }
 return {result:'allow',reason:'policy'};
 } catch { return deny('security-unavailable'); }
}
