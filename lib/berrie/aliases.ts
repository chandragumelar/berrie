export function validateAliases(value:unknown,types:string[]):Record<string,string>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Isi alias untuk setiap tipe.');
 const source=value as Record<string,unknown>,result:Record<string,string>={},used=new Set<string>();
 for(const type of types){const alias=String(source[type]??'').trim().toUpperCase();if(!/^[A-Z0-9]{1,3}$/.test(alias))throw Error(`Alias ${type} wajib 1–3 huruf/angka.`);if(used.has(alias))throw Error('Alias harus unik, tanpa membedakan kapital.');used.add(alias);result[type]=alias;}
 if(Object.keys(source).some(k=>!types.includes(k)))throw Error('Alias tidak boleh membuat tipe baru.');return result;
}
