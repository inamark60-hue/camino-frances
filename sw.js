const CACHE='buen-camino-v74-network-first';
const CORE=[
  './',
  './index.html',
  './styles.css?v=74',
  './app.js?v=74',
  './data.js?v=74',
  './verified-routes.js?v=74',
  './manifest.webmanifest?v=74',
  './buen-camino-logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('buen-camino-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);

  // Recursos externos (mapas, 3D, servicios): nunca interceptarlos.
  if(url.origin!==self.location.origin) return;

  const isNavigation=event.request.mode==='navigate';
  const isFreshAsset=/\.(?:html|js|css|webmanifest)$/i.test(url.pathname);

  if(isNavigation || isFreshAsset){
    // Network-first: evita que una versión antigua quede bloqueada en Android.
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          }
          return response;
        })
        .catch(async()=>{
          const hit=await caches.match(event.request);
          if(hit) return hit;
          if(isNavigation) return (await caches.match('./index.html')) || Response.error();
          return Response.error();
        })
    );
    return;
  }

  // Imágenes/iconos: cache-first, con actualización de respaldo.
  event.respondWith(
    caches.match(event.request).then(hit=>{
      if(hit) return hit;
      return fetch(event.request).then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        }
        return response;
      });
    })
  );
});
