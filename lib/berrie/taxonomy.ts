import {configuredTypes,typeLabel,autoAliases} from './menu-config.ts';
import {validateMenuCategories} from './menu-filters.ts';
import type {State} from './domain.ts';
export function applyTaxonomy(s:State,d:Record<string,unknown>){
 if(!['category','type'].includes(String(d.kind)))throw Error('Pilih kategori atau tipe.');
 const category=d.kind==='category',key=category?'menuCategories':'menuTypes',list=category?s.settings.menuCategories??[]:configuredTypes(s),old=String(d.old??''),name=category?validateMenuCategories([d.name])[0]:typeLabel(d.name);
 if(!['add','rename','delete'].includes(String(d.operation)))throw Error('Tindakan pengaturan tidak sah.');
 if(d.operation!=='add'&&!list.includes(old))throw Error('Nama tidak ditemukan. Muat ulang daftar.');
 if(d.operation!=='delete'&&list.some(x=>x!==old&&x.toLocaleLowerCase('id')===name.toLocaleLowerCase('id')))throw Error('Nama sudah dipakai.');
 if(d.operation==='delete'){
  if(s.catalog.some(x=>!x.archived&&(category?x.category:x.type??'Normal')===old))throw Error('Masih dipakai menu. Pindahkan menu ke pilihan lain sebelum menghapus.');
  s.settings[key]=list.filter(x=>x!==old);
 }else{
  s.settings[key]=d.operation==='add'?[...list,name]:list.map(x=>x===old?name:x);
  if(d.operation==='rename')for(const sku of s.catalog){if(category&&sku.category===old)sku.category=name;else if(!category&&sku.type===old)sku.type=name;}
 }
 if(!category){const aliases={...s.settings.typeAliases};if(d.operation==='rename'&&aliases[old])aliases[name]=aliases[old];if(d.operation!=='add')delete aliases[old];s.settings.typeAliases=autoAliases(s.settings.menuTypes??[],aliases);}
}
