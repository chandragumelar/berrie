export interface PaymentMethods { storeId:string; qris:boolean; transfer:boolean; ewallet:boolean }
export function validatePaymentMethods(value:unknown):asserts value is PaymentMethods {
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('Konfigurasi metode tidak sah');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='ewallet,qris,storeId,transfer' || typeof v.storeId!=='string' || !v.storeId.trim() || v.storeId.length>200 || typeof v.qris!=='boolean' || typeof v.transfer!=='boolean' || typeof v.ewallet!=='boolean') throw new Error('Konfigurasi metode tidak sah');
}
