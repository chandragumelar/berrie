export interface SimpleCategory { id:string; name:string }
export interface SimpleMenu { id:string; skuId:string; stockGroupId:string; name:string; categoryId:string; code:string; typeLabel:'Normal'; price:number; active:true }
export interface SimpleCatalog { storeId:string; categories:SimpleCategory[]; menus:SimpleMenu[] }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const plain=(v:unknown,keys:string[])=>!!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype && Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export function validateSimpleCatalog(value:unknown):asserts value is SimpleCatalog {
 if(!plain(value,['storeId','categories','menus'])) throw new Error('Katalog tidak sah');
 const c=value as SimpleCatalog;
 if(typeof c.storeId!=='string'||!c.storeId.trim()||!Array.isArray(c.categories)||!Array.isArray(c.menus)) throw new Error('Katalog tidak sah');
 const ids=new Set<string>(),names=new Set<string>(),codes=new Set<string>();
 for(const x of c.categories){if(!plain(x,['id','name'])||!uuid.test(x.id)||typeof x.name!=='string'||x.name!==x.name.trim()||x.name.length<1||x.name.length>40||ids.has(x.id)||names.has(x.name.toLocaleLowerCase('id-ID')))throw new Error('Kategori tidak sah');ids.add(x.id);names.add(x.name.toLocaleLowerCase('id-ID'));}
 for(const x of c.menus){if(!plain(x,['id','skuId','stockGroupId','name','categoryId','code','typeLabel','price','active'])||![x.id,x.skuId,x.stockGroupId].every(i=>uuid.test(i))||ids.has(x.id)||ids.has(x.skuId)||ids.has(x.stockGroupId)||!ids.has(x.categoryId)||typeof x.name!=='string'||x.name!==x.name.trim()||x.name.length<1||x.name.length>80||typeof x.code!=='string'||!/^N-\d{3,}$/.test(x.code)||x.code.length>40||codes.has(x.code)||x.typeLabel!=='Normal'||x.active!==true||!Number.isSafeInteger(x.price)||x.price<0||x.price>999999999)throw new Error('Menu tidak sah');ids.add(x.id);ids.add(x.skuId);ids.add(x.stockGroupId);codes.add(x.code);}
}
export function nextSimpleCode(c:SimpleCatalog):string {const n=c.menus.reduce((max,m)=>Math.max(max,Number(m.code.slice(2))),0)+1;if(!Number.isSafeInteger(n))throw new Error('Kode menu habis');const code=`N-${String(n).padStart(3,'0')}`;if(code.length>40)throw new Error('Kode menu habis');return code;}
