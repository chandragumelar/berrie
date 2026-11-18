import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const foundation=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
console.log('Menjalankan Supabase lokal terisolasi; unduhan pertama dapat memakan waktu.');
// CLI startup output contains local service keys; capture it without printing.
const started=spawnSync('supabase',['start'],{cwd:foundation,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});
if(started.status!==0) { console.error('Supabase lokal gagal dimulai. Periksa Docker dan port 55420–55429.');process.exit(1); }
const cors=spawnSync(process.execPath,[resolve(foundation,'supabase/scripts/enforce-local-cors.mjs')],{cwd:foundation,stdio:'inherit'});
if(cors.status!==0) process.exit(1);
console.log('Supabase lokal siap. Jalankan Edge Function sesuai README.');
