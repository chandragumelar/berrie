import type {State,Action,Permission} from './domain.ts';
export interface StaffIdentity {id:string;name:string;active:boolean;pinRevision:number}
export const initialStaff:StaffIdentity[]=[{id:'a',name:'Rani',active:true,pinRevision:1},{id:'b',name:'Budi',active:true,pinRevision:1}];
export const staffList=(s:State)=>s.staff??initialStaff;
export const actorName=(s:State,actor:string)=>actor==='owner'?'Maya · Owner':(staffList(s).find(x=>x.id===actor)?.name??actor)+' · Kasir';
export function accessPermission(s:State,a:Action){
 if(s.actor!=='owner'||!s.online)throw Error('Pengelolaan staf dan izin memerlukan owner online.');
 if(s.surface==='Kasir'&&!s.writer)throw Error('Tab ini hanya membaca. Gunakan tab pemegang hak tulis.');
 if(a.activity!=='Pengaturan')throw Error('Pengelolaan akses memakai izin Pengaturan.');
 return 'Boleh kasir' as const;
}
/** Memory-only access administration. No PIN, verifier or server permit is created. */
export function applyAccess(s:State,a:Action,activities:readonly string[]){
 accessPermission(s,a);const d=a.data;
 if(a.kind==='accessAck'){if(s.surface!=='Kasir')throw Error('Penerimaan versi akses dilakukan di kasir aktif.');s.policyReceived=s.policyVersion;return;}
 if(a.kind==='staff'){
  const rows=s.staff??structuredClone(initialStaff),target=rows.find(x=>x.id===d.id);
  const name=String(d.name??'').trim();
  if(['add','rename'].includes(String(d.operation))){
   if(!name||name.length>80)throw Error('Isi nama staf 1–80 karakter.');
   if(rows.some(x=>x.id!==d.id&&x.name.toLocaleLowerCase('id')===name.toLocaleLowerCase('id')))throw Error('Nama staf sudah dipakai. Gunakan nama yang membedakan petugas.');
  }
  if(d.operation==='add'){
   if(typeof d.id!=='string'||!d.id||d.id==='owner'||rows.some(x=>x.id===d.id))throw Error('ID staf sudah dipakai atau tidak sah.');
   rows.push({id:d.id,name,active:true,pinRevision:1});
  }else{
   if(!target)throw Error('Identitas staf tidak ditemukan. Owner tidak dapat diubah lewat editor staf.');
   if(d.operation==='rename')target.name=name;
   else if(d.operation==='status'){
    if(typeof d.active!=='boolean'||d.confirmed!==true)throw Error('Konfirmasikan dampak perubahan status staf.');
    if(!d.active&&s.cash.open&&s.cash.segments.at(-1)?.actor===target.id)throw Error('Staf masih memegang laci. Selesaikan serah-terima kas sebelum menonaktifkan.');
    target.active=d.active;
   }else if(d.operation==='resetPin'){if(d.confirmed!==true)throw Error('Konfirmasikan reset PIN demo.');target.pinRevision++;}
   else throw Error('Tindakan staf tidak sah.');
  }
  s.staff=rows;
 }else{
  if(!d.rules||typeof d.rules!=='object'||Array.isArray(d.rules))throw Error('Kebijakan aktivitas tidak sah.');
  const rules=d.rules as Record<string,Permission>;
  for(const [activity,value] of Object.entries(rules))if(!activities.includes(activity)||!['Boleh kasir','Perlu persetujuan owner','Hanya owner'].includes(value))throw Error('Pilih aktivitas dan izin yang tersedia.');
  s.policy={...s.policy,...rules};
  const amount=Number(d.limitAmount??s.limitAmount),bp=Number(d.limitBp??s.limitBp);
  if(!/^\d+$/.test(String(d.limitAmount??s.limitAmount))||!/^\d+$/.test(String(d.limitBp??s.limitBp))||!Number.isSafeInteger(amount)||amount<0||amount>999999999||!Number.isSafeInteger(bp)||bp<0||bp>10000)throw Error('Batas diskon harus rupiah bulat ≥0 dan persen 0–100.');
  s.limitAmount=amount;s.limitBp=bp;
 }
 s.policyVersion++;if(s.surface==='Kasir')s.policyReceived=s.policyVersion;
}
