const CACHE='buen-camino-v89-network-first';
const RUNTIME='buen-camino-v89-runtime';
const CORE=[
  './',
  './index.html',
  './privacy.html',
  './styles.css?v=89',
  './app.js?v=89',
  './data.js?v=89',
  './verified-routes.js?v=89',
  './manifest.webmanifest?v=89',
  './buen-camino-logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('buen-camino-')&&![CACHE,RUNTIME].includes(k)).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function isCelestialData(url){
  return ['cdn.jsdelivr.net','raw.githubusercontent.com','dieghernan.github.io'].includes(url.hostname) && url.pathname.includes('celestial_data') && /\/(?:stars\.6|constellations(?:\.lines)?|messier)\.min\.geojson$/.test(url.pathname);
}

function isPilgrimageData(url){
  if(!['cdn.jsdelivr.net','raw.githubusercontent.com'].includes(url.hostname))return false;
  if(!url.pathname.includes('open-pilgrimages'))return false;
  return /\/(?:stages\.json|route\.geojson|waypoints\.geojson)$/.test(url.pathname);
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  // Guarda como respaldo los datos abiertos de ruta/waypoints una vez descargados.
  if(url.origin!==self.location.origin){
    if(isPilgrimageData(url)||isCelestialData(url)){
      event.respondWith(
        fetch(event.request).then(response=>{
          if(response&&response.ok){const copy=response.clone();caches.open(RUNTIME).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
          return response;
        }).catch(()=>caches.match(event.request).then(hit=>hit||Response.error()))
      );
    }
    // Mapas, meteorología, fotos y servicios externos no se cachean masivamente.
    return;
  }

  const isNavigation=event.request.mode==='navigate';
  const isFreshAsset=/\.(?:html|js|css|webmanifest)$/i.test(url.pathname);
  if(isNavigation||isFreshAsset){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
          return response;
        })
        .catch(async()=>{
          const hit=await caches.match(event.request);if(hit)return hit;
          if(isNavigation)return(await caches.match('./index.html'))||Response.error();
          return Response.error();
        })
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  })));
});
