/* global BERRIE_BUILD_PAYLOAD, Request, URL, self, caches, fetch, Response */
const { buildId, files } = BERRIE_BUILD_PAYLOAD;
const cacheName = `berrie-app-shell:${buildId}`;
const paths = new Set(Object.keys(files));
const requests = Object.entries(files).map(([path, integrity]) => new Request(new URL(path, self.location.origin), {
  credentials: 'omit', redirect: 'error', integrity, cache: 'reload'
}));

async function complete() {
  const cache = await caches.open(cacheName);
  for (const path of paths) if (!await cache.match(path)) return false;
  return true;
}
async function fill() {
  const cache = await caches.open(cacheName);
  await cache.addAll(requests);
  if (!await complete()) throw new Error('Paket aplikasi tidak lengkap');
}
self.addEventListener('install', event => {
  event.waitUntil(fill().catch(async error => { await caches.delete(cacheName); throw error; }));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (!await complete()) throw new Error('Paket aplikasi tidak lengkap');
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('berrie-app-shell:') && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'BERRIE_SHELL_STATUS' || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    if (event.data.repair && !await complete()) try { await fill(); } catch { /* Keep current data and report incomplete. */ }
    event.ports[0].postMessage({ type:'BERRIE_SHELL_STATUS', buildId, complete:await complete() });
  })().catch(() => event.ports[0].postMessage({ type:'BERRIE_SHELL_STATUS', buildId, complete:false })));
});
const recovery = '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Berrie · Pemulihan</title><main style="font:16px system-ui;max-width:34rem;margin:3rem auto;padding:1rem"><h1>Aplikasi belum bisa dibuka</h1><p>Paket aplikasi di perangkat belum lengkap dan jaringan tidak tersedia. Data toko tidak dihapus.</p><button onclick="location.reload()">Coba lagi</button></main></html>';
async function respond(path, navigation) {
  try {
    if (!await complete()) await fill();
    const cached = await (await caches.open(cacheName)).match(path);
    if (cached) return cached;
  } catch { /* An incomplete shell never represents a successful offline load. */ }
  try {
    const response=await fetch(new Request(new URL(path, self.location.origin), { credentials:'omit', redirect:'error', cache:'no-store' }));
    if(!response.ok) throw new Error('Origin belum tersedia');
    return response;
  } catch {
    if (navigation) return new Response(recovery, { status:503, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'} });
    return Response.error();
  }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html');
  if (navigation) { event.respondWith(respond('/index.html', true)); return; }
  if (url.search || !paths.has(url.pathname) || url.pathname === '/index.html') return;
  event.respondWith(respond(url.pathname, false));
});
