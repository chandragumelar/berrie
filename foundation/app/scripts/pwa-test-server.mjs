/* global process, URL, console */
import { createServer } from 'node:http';
import { mkdtemp, cp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=await mkdtemp(join(tmpdir(),'berrie-pwa-'));
for(const variant of ['v1','v2']) {
 const result=spawnSync('npm',['run','build'],{cwd:resolve('.'),env:{...process.env,VITE_PWA_TEST_VARIANT:variant},stdio:'inherit'});
 if(result.status!==0) throw new Error(`Build ${variant} gagal`);
 await cp(resolve('dist'),join(root,variant),{recursive:true});
}
let variant='v1', unavailable=false, missing='';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 const url=new URL(req.url??'/', 'http://127.0.0.1:5173');
 if(url.pathname==='/__harness/state' && req.method==='POST') {
  let body='';for await(const chunk of req)body+=chunk;
  const next=JSON.parse(body);if(next.variant)variant=next.variant;if(next.unavailable!==undefined)unavailable=!!next.unavailable;if(next.missing!==undefined)missing=next.missing;
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({variant,unavailable,missing}));return;
 }
 if(unavailable || (missing && url.pathname===missing)){res.writeHead(503);res.end('unavailable');return;}
 const path=url.pathname==='/'?'/index.html':url.pathname;
 const safe=normalize(path).replace(/^\/+/, '');
 if(safe.startsWith('..')){res.writeHead(403);res.end();return;}
 try {const data=await readFile(join(root,variant,safe));res.writeHead(200,{'Content-Type':types[extname(safe)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);}
 catch {res.writeHead(404);res.end('missing');}
}).listen(5173,'127.0.0.1',()=>console.log(`PWA test server: ${root}`));
