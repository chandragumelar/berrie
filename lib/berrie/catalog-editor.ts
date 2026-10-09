import {stockKey,groupBalance,stockBaseline} from './shared-stock.ts';
import {validateRecipes} from './recipes.ts';
import {integer,id,hasCountedStock,type State,type SKU,type Channel} from './domain.ts';
import {autoAliases,configuredTypes,nextSKUCode,typeLabel} from './menu-config.ts';
import {validateAliases} from './aliases.ts';
export function applyCatalogEdit(s:State,d:Record<string,unknown>){
 const rows=Array.isArray(d.variants)?d.variants as Record<string,unknown>[]:[d];
 if(!rows.length||rows.length>30)throw Error('Isi 1–30 pilihan ukuran / rasa.');
 const name=String(d.name??'').trim(),category=String(d.category??'').trim();
 if(!name||name.length>80||category.length>40)throw Error('Periksa nama menu (maks. 80 karakter) dan kategori.');
 // Existing categories removed from settings may be retained, but cannot be assigned to new menus.
 if(category&&!(s.settings.menuCategories??[]).includes(category)&&!rows.every(row=>s.catalog.find(x=>x.id===row.sku)?.category===category))throw Error('Pilih kategori yang diatur owner di Pengaturan.');
 const inputType=typeLabel(d.type??s.catalog.find(x=>x.id===d.sku)?.type),types=configuredTypes(s),type=types.find(x=>x.toLowerCase()===inputType.toLowerCase())??inputType;
 if(!types.includes(type)){if(s.actor!=='owner')throw Error('Tipe baru hanya dapat dibuat owner.');types.push(type);}
 const aliases=validateAliases(autoAliases(types,s.settings.typeAliases),types);s.settings.menuTypes=types;s.settings.typeAliases=aliases;
 const toppingIds=Array.isArray(d.toppings)?d.toppings.map(String):[];
 if(new Set(toppingIds).size!==toppingIds.length||toppingIds.some(t=>!s.toppings.some(x=>x.id===t)))throw Error('Pilihan topping tidak ditemukan.');
 const newToppings=Array.isArray(d.newToppings)?d.newToppings as Record<string,unknown>[]:[];
 for(const top of newToppings){const topName=String(top.name??'').trim();if(!topName||topName.length>80||s.toppings.some(x=>x.name.toLowerCase()===topName.toLowerCase()))throw Error('Nama topping wajib dan tidak boleh duplikat.');const topping={id:id(),name:topName,price:integer(top.price),available:true};s.toppings.push(topping);toppingIds.push(topping.id);}
 const variants=new Set<string>();
 for(const row of rows){if(d.requireVariants&&!String(row.variant??'').trim())throw Error('Isi nama setiap ukuran / rasa.');const sku=s.catalog.find(x=>x.id===row.sku);if(row.sku&&!sku)throw Error('SKU tidak ditemukan.');const variant=String(row.variant??d.variant??'Reguler').trim()||'Reguler';
  if(variant.length>80||variants.has(variant.toLowerCase()))throw Error('Nama varian wajib berbeda, maksimal 80 karakter.');variants.add(variant.toLowerCase());
  if(d.mode!==undefined&&d.mode!=='quantity')throw Error('Stok wajib dihitung; mode quantity diperlukan.');
  if(sku&&d.archived&&s.orders.some(o=>o.units.some(u=>u.sku===sku.id&&u.state==='draft')))throw Error('Selesaikan draft aktif sebelum mengarsipkan menu.');
  const code=sku?.code??(d.autoCode?nextSKUCode(s.catalog,aliases[type]):String(row.code??d.code??'').trim());
  if(!code||code.length>40||s.catalog.some(x=>x.id!==sku?.id&&x.code.toLowerCase()===code.toLowerCase()))throw Error('Kode wajib unik, maksimal 40 karakter.');
  const price=integer(row.price??d.price,1),channelPrices={...sku?.channelPrices,Toko:price} as Record<Channel,number>;
  for(const ch of ['GoFood','GrabFood','ShopeeFood'] as const){const value=row[ch]??d[ch]??(d.channelPrices as Partial<Record<Channel,number>>|undefined)?.[ch];if((s.settings.enabledChannels??[]).includes(ch)&&!value)throw Error(`Isi harga ${ch} untuk ${variant}.`);channelPrices[ch]=value!==undefined&&value!==''?integer(value,1):sku?.channelPrices[ch]??0;}
  const group=sku?.stockGroup??(d.stockGroup?String(d.stockGroup):undefined),member=group?s.catalog.find(x=>stockKey(x)===group):undefined;
  if(sku&&d.stockGroup&&stockKey(sku)!==d.stockGroup)throw Error('Grup stok existing tidak dapat dipindah tanpa hitungan fisik.');
  const value:SKU={stockBaseline:sku&&!hasCountedStock(sku)?integer(row.stock??d.stock):sku?.stockBaseline??(member&&hasCountedStock(member)?stockBaseline(s,member):integer(row.stock??d.stock)),stockGroup:group,flavour:sku?.flavour,size:sku?.size,recipes:d.recipes===undefined?sku?.recipes??[]:validateRecipes(d.recipes),type,promos:sku?.promos??{},id:sku?.id??id(),code,name,variant,category,price,stock:sku&&!hasCountedStock(sku)?integer(row.stock??d.stock):member?groupBalance(s,member):sku&&hasCountedStock(sku)?sku.stock:integer(row.stock??d.stock),available:d.available!==false,archived:!!d.archived,threshold:integer(d.threshold??5),channelPrices,toppings:d.toppings===undefined&&!newToppings.length?sku?.toppings??[]:toppingIds};
  const repaired=!!sku&&!hasCountedStock(sku);
  if(repaired){for(const other of s.catalog.filter(x=>group&&stockKey(x)===group))other.stock=value.stock;}
  if(repaired||!sku&&!member)s.stockLedger.push({group,sku:value.id,delta:value.stock,actor:s.actor,before:0,after:value.stock,reason:sku?'Hitungan awal data lama':'Stok awal',time:Date.now(),reference:code});
  if(sku)s.catalog[s.catalog.indexOf(sku)]=value;else s.catalog.push(value);
 }
}
