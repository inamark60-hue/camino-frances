const CACHE='camino-frances-v31';
const CORE=['./','./index.html','./styles.css','./data.js','./verified-routes.js','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
    const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{}); return res;
  }).catch(()=>{if(e.request.mode==='navigate') return caches.match('./index.html'); throw new Error('offline');})));
});
