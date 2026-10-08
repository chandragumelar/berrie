export interface RecipeGroup {name:string;options:string[];default:string;}
export const coffeeRecipe:RecipeGroup[]=[{name:'Es',options:['Normal','Less ice','Tanpa es'],default:'Normal'},{name:'Gula',options:['Normal','Less sugar','Tanpa gula'],default:'Normal'}];
export function validateRecipes(value:unknown):RecipeGroup[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>8)throw Error('Pilihan racikan maksimal 8 kelompok.');
 const groups=value.map(raw=>{if(!raw||typeof raw!=='object')throw Error('Periksa pilihan racikan.');const x=raw as Record<string,unknown>,name=String(x.name??'').trim();if(!name||name.length>40||!Array.isArray(x.options)||x.options.length<2||x.options.length>12)throw Error('Isi nama racikan dan 2–12 pilihan.');const options=x.options.map(y=>String(y).trim());if(options.some(y=>!y||y.length>40)||new Set(options.map(y=>y.toLowerCase())).size!==options.length)throw Error('Pilihan racikan harus terisi dan unik.');const def=String(x.default??options[0]);if(!options.includes(def))throw Error('Pilihan bawaan racikan tidak ditemukan.');return{name,options,default:def};});
 if(new Set(groups.map(x=>x.name.toLowerCase())).size!==groups.length)throw Error('Nama kelompok racikan harus unik.');return groups;
}
export function recipeSnapshot(groups:RecipeGroup[],input:Record<string,string>={}){if(Object.keys(input).some(name=>!groups.some(g=>g.name===name)))throw Error('Kelompok racikan tidak ditemukan.');return groups.map(g=>{const option=input[g.name]??g.default;if(!g.options.includes(option))throw Error(`Pilihan ${g.name} tidak tersedia.`);return `${g.name}: ${option}`;});}
