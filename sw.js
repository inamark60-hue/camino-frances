const CACHE='buen-camino-v53-stable';
const CORE=['./','./index.html','./styles.css','./app.js','./data.js','./verified-routes.js','./manifest.webmanifest','./buen-camino-logo.png','./icon-192.png','./icon-512.png','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // No interceptar teselas ni otros recursos externos: el navegador los carga directamente.
  // Esto evita que un fetch CORS del service worker bloquee imágenes válidas.
  if(u.origin!==self.location.origin)return;
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{})}
      return res;
    }).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))
  );
});
