/* global console */
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
const dist = resolve('dist');
const workerTemplate = await readFile(resolve('src/pwa/service-worker.js'), 'utf8');
const html = await readFile(resolve(dist, 'index.html'));
async function list(dir) {
  const result=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path=resolve(dir,entry.name);
    if (entry.isDirectory()) result.push(...await list(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
const assetPaths=(await list(dist)).filter(path=>!['index.html','sw.js'].includes(relative(dist,path)) && !relative(dist,path).startsWith('app-shell.')).sort();
const digest=value=>createHash('sha256').update(value).digest('hex');
const assetDigests=await Promise.all(assetPaths.map(async path=>[relative(dist,path).split(sep).join('/'),digest(await readFile(path))]));
const buildId=digest(JSON.stringify({html:digest(html),worker:digest(workerTemplate),assets:assetDigests})).slice(0,24);
const marked=html.toString().replace('</head>',`<meta name="berrie-build" content="${buildId}"></head>`);
if (marked===html.toString()) throw new Error('HTML build tidak mempunyai head');
await writeFile(resolve(dist,'index.html'),marked);
await copyFile(resolve(dist,'index.html'),resolve(dist,`app-shell.${buildId}.html`));
const integrity=value=>`sha256-${createHash('sha256').update(value).digest('base64')}`;
const files=Object.fromEntries(await Promise.all([['index.html',resolve(dist,'index.html')],...assetPaths.map(path=>[relative(dist,path).split(sep).join('/'),path])].map(async ([name,path])=>[`/${name}`,integrity(await readFile(path))])));
files[`/app-shell.${buildId}.html`]=integrity(await readFile(resolve(dist,`app-shell.${buildId}.html`)));
await writeFile(resolve(dist,'sw.js'),workerTemplate.replace('= BERRIE_BUILD_PAYLOAD;',`= ${JSON.stringify({buildId,files})};`));
console.log(`Berrie app shell ${buildId}: ${Object.keys(files).length} berkas`);
