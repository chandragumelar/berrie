import { execFileSync, spawnSync } from 'node:child_process';

// Limit this adjustment to the disposable FLOW-01A project. The CLI's Kong
// template adds wildcard CORS on /functions/v1, overriding function headers.
const container='supabase_kong_berrie-flow-01a-local';
try {
 const original=execFileSync('docker',['exec',container,'cat','/home/kong/kong.yml'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const marker='  - name: functions-v1\n', start=original.indexOf(marker),end=original.indexOf('\n  - name: ',start+marker.length);
 if(start<0 || end<0 || original.indexOf(marker,start+marker.length)!==-1) throw new Error('route');
 const block=original.slice(start,end),matches=block.match(/^      - name: cors\s*$/gm) ?? [];
 if(matches.length!==1 || !block.includes('/functions/v1/')) throw new Error('plugin');
 const updated=original.slice(0,start)+block.replace(/^      - name: cors\s*\n/m,'')+original.slice(end);
 const write=spawnSync('docker',['exec','-i',container,'sh','-c','umask 077; cat > /tmp/berrie-kong.yml'],{input:updated,encoding:'utf8',stdio:['pipe','pipe','pipe']});
 if(write.status!==0) throw new Error('write');
 const reload=spawnSync('docker',['exec','-e','KONG_DECLARATIVE_CONFIG=/tmp/berrie-kong.yml',container,'kong','reload'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 if(reload.status!==0) throw new Error('reload');
 console.log('Gateway lokal meneruskan CORS route fungsi ke handler.');
} catch {
 // Kong's generated config contains local service credentials; never print it.
 console.error('Konfigurasi CORS lokal gagal. Jangan gunakan endpoint sebelum diperbaiki.');
 process.exitCode=1;
}
