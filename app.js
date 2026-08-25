const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let currentView = 'home';
let deferredPrompt;
let mapInstance;
let caminoRouteCoords = null;
let caminoStagesMeta = null;
const CAMINO_ROUTE_URL='https://cdn.jsdelivr.net/gh/walktalkmeditate/open-pilgrimages@v1/routes/camino-frances/route.geojson';
const CAMINO_STAGES_URL='https://cdn.jsdelivr.net/gh/walktalkmeditate/open-pilgrimages@v1/routes/camino-frances/stages.json';
const VERIFIED_STAGE_GPX={};
const favorites = new Set(JSON.parse(localStorage.getItem('camino-favorites')||'[]'));
const doneStages = new Set(JSON.parse(localStorage.getItem('camino-done')||'[]').map(Number));

const esc=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2200)}
function save(){localStorage.setItem('camino-favorites',JSON.stringify([...favorites]));localStorage.setItem('camino-done',JSON.stringify([...doneStages]))}
function setActive(nav){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav));}
function kmTotal(){return STAGES.reduce((a,s)=>a+s.km,0)}

function stageCard(s){return `<article class="stage-card ${s.n===1?'featured':''}" data-stage="${s.n}" role="button" tabindex="0"><div class="num">${s.n}</div><div><h3>${esc(s.from)} → ${esc(s.to)}</h3><div class="meta">${s.km.toFixed(1)} km · ${s.h} · Dificultad ${s.difficulty.toLowerCase()}</div></div><div class="arrow">›</div></article>`}
function home(){currentView='home';setActive('home');app.innerHTML=`
<section class="hero"><h1>Tu Camino Francés<br>en el bolsillo</h1><p>33 etapas desde Saint-Jean-Pied-de-Port hasta Santiago. Diseñada para Android, sin cuotas ni APIs de pago.</p><span class="pill">PWA GRATUITA · PROTOTIPO</span></section>
<section class="section"><div class="section-head"><h2>Las 33 etapas</h2><button class="link-btn" data-nav="stages">Ver todas</button></div>${STAGES.slice(0,5).map(stageCard).join('')}</section>
<button class="location-cta" id="whereBtn">📍 ¿DÓNDE ESTOY AHORA?<small>Localiza tu posición y abre servicios cercanos</small></button>
<section class="section"><div class="section-head"><h2>Accesos rápidos</h2></div><div class="quick-grid">${quickButtons()}</div></section>`; bindCommon()}
function quickButtons(){return [['🛏','Dormir','alojamiento'],['🍴','Comer','comer'],['✚','Farmacias','farmacia'],['❤','Salud','salud'],['🚕','Taxi','taxi'],['🛡','Policía','policia'],['🏛','Ayuntamiento','ayuntamiento'],['⚠','Emergencias','emergencia']].map(x=>`<button class="quick" data-service="${x[2]}"><span class="qicon">${x[0]}</span>${x[1]}</button>`).join('')}
function stages(){currentView='stages';setActive('stages');app.innerHTML=`<section class="section"><div class="section-head"><h2>Etapas del Camino Francés</h2></div><input class="search" id="stageSearch" placeholder="Buscar etapa o localidad…" autocomplete="off"><div id="stageList">${STAGES.map(stageCard).join('')}</div></section>`;bindCommon();document.getElementById('stageSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();document.getElementById('stageList').innerHTML=STAGES.filter(s=>(s.from+' '+s.to).toLowerCase().includes(q)).map(stageCard).join('')||'<div class="empty">No hay resultados.</div>';bindStageCards()})}
function detail(n,tab='resumen'){const s=STAGES.find(x=>x.n===n);currentView=`detail-${n}`;setActive('stages');app.innerHTML=`<section class="detail-head"><div class="backline"><button id="backStages">‹ Volver</button><button class="fav ${favorites.has('stage-'+n)?'on':''}" data-fav="stage-${n}">♥</button></div><h1>${esc(s.from)} → ${esc(s.to)}</h1><div class="detail-stats"><span>🚶 ${s.km.toFixed(1)} km</span><span>◷ ${s.h}</span><span>▥ ${s.difficulty}</span></div></section><div class="detail-tabs">${['resumen','alojamientos','servicios','mapa'].map(t=>`<button data-tab="${t}" class="${tab===t?'active':''}">${t.toUpperCase()}</button>`).join('')}</div><div id="detailBody"></div>`;
document.getElementById('backStages').onclick=stages;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>detail(n,b.dataset.tab));bindFav();renderDetailBody(s,tab)}
function renderDetailBody(s,tab){const body=document.getElementById('detailBody'); if(tab==='resumen'){body.innerHTML=`<section class="section"><div class="stat-grid"><div class="stat">🚶<strong>${s.km.toFixed(1)} km</strong><span>Distancia</span></div><div class="stat">◷<strong>${s.h}</strong><span>Tiempo</span></div><div class="stat">⛰<strong>${s.gain} m</strong><span>Desnivel +</span></div><div class="stat">▥<strong>${s.difficulty}</strong><span>Dificultad</span></div></div><h2>Descripción</h2><p class="copy">Ficha preparada para incorporar información verificada del recorrido, advertencias, puntos de agua, desniveles y recomendaciones. La estructura ya está lista para cargar los datos definitivos de cada etapa.</p>${s.towns?`<h2>Pueblos en la etapa</h2><div class="towns">${s.towns.map(t=>`<span class="town">${t}</span>`).join('')}</div>`:''}<h2>Mapa</h2><div id="stageMap" class="mapbox"></div><div class="map-note">Mapa: OpenStreetMap + Leaflet, ambos sin licencia comercial de pago.</div></section>`;setTimeout(()=>makeMap(s.n,'stageMap',false),0)}
else if(tab==='alojamientos'){const rows=s.n===30?STAGE30_SERVICES.filter(x=>x.type==='alojamiento'):[];body.innerHTML=`<section class="section"><div class="section-head"><h2>Alojamientos</h2></div>${rows.length?rows.map(serviceCard).join(''):'<div class="empty"><div class="big">🛏</div><p>La estructura está lista. Los alojamientos reales se cargarán con fuentes verificadas y precios orientativos.</p></div>'}</section>`;bindFav()}
else if(tab==='servicios'){const rows=s.n===30?STAGE30_SERVICES:[];body.innerHTML=`<section class="section"><div class="emergency"><strong>⚠ Emergencias</strong>Para una emergencia real en España, llama al 112.</div><h2>Servicios de la etapa</h2>${rows.length?rows.map(serviceCard).join(''):'<div class="empty"><div class="big">📍</div><p>Servicios pendientes de carga para esta etapa. El modelo de datos ya está preparado.</p></div>'}</section>`;bindFav()}
else{body.innerHTML=`<div id="stageMapTall" class="mapbox tall"></div><section class="section"><button class="location-cta" style="margin:0;width:100%" id="locateOnMap">📍 MOSTRAR MI UBICACIÓN</button></section>`;setTimeout(()=>{makeMap(s.n,'stageMapTall',false);document.getElementById('locateOnMap').onclick=locateUser},0)}}
function serviceCard(x){return `<article class="service-card"><div><span class="badge">${esc(x.type)}</span><h3>${esc(x.name)}</h3><p>${esc(x.sub)}</p><p>${esc(x.note)}</p><div class="service-actions">${x.phone?`<button class="mini-btn" data-phone="${x.phone}">☎ ${x.phone}</button>`:''}<button class="mini-btn" data-osm="${esc(x.name)}">🗺 Buscar</button></div></div><div><div class="price">${esc(x.price)}</div><button class="fav ${favorites.has(x.id)?'on':''}" data-fav="${x.id}">♥</button></div></article>`}
function mapView(){currentView='map';setActive('map');app.innerHTML=`<div id="mainMap" class="mapbox tall"></div><section class="section"><button class="location-cta" style="margin:0;width:100%" id="mapLocate">📍 MOSTRAR MI UBICACIÓN</button><p class="map-note">Mapa completo de referencia. Las etapas individuales solo muestran trazados cuando han sido verificadas; nunca se dibuja una aproximación.</p></section>`;setTimeout(()=>{makeMap(null,'mainMap',true);document.getElementById('mapLocate').onclick=locateUser},0)}
function favoritesView(){currentView='favorites';setActive('favorites');const st=[...favorites].filter(x=>x.startsWith('stage-')).map(x=>STAGES.find(s=>s.n===Number(x.split('-')[1]))).filter(Boolean);app.innerHTML=`<section class="section"><div class="section-head"><h2>Favoritos</h2></div>${st.length?st.map(stageCard).join(''):'<div class="empty"><div class="big">♡</div><p>Guarda etapas y servicios con el corazón para encontrarlos aquí.</p></div>'}</section>`;bindStageCards()}
function myCamino(){currentView='mycamino';setActive('mycamino');const done=[...doneStages].map(n=>STAGES.find(s=>s.n===n)).filter(Boolean);const km=done.reduce((a,s)=>a+s.km,0);const pct=Math.round(doneStages.size/STAGES.length*100);app.innerHTML=`<section class="section"><div class="section-head"><h2>Mi Camino</h2></div><div class="progress-card"><strong>${doneStages.size} de 33 etapas completadas</strong><div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div><div class="meta">${km.toFixed(1)} km registrados de ${kmTotal().toFixed(1)} km en esta planificación</div></div><h2>Marcar etapas</h2>${STAGES.map(s=>`<div class="my-stage" data-done="${s.n}"><button class="check ${doneStages.has(s.n)?'done':''}">${doneStages.has(s.n)?'✓':''}</button><div><strong>Etapa ${s.n}</strong><div class="meta">${esc(s.from)} → ${esc(s.to)}</div></div></div>`).join('')}</section>`;document.querySelectorAll('[data-done]').forEach(r=>r.onclick=()=>{const n=Number(r.dataset.done);doneStages.has(n)?doneStages.delete(n):doneStages.add(n);save();myCamino()})}
function geoJSONSegments(gj){
  const out=[];
  const add=line=>{
    const seg=(line||[]).map(c=>[Number(c[1]),Number(c[0])]).filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]));
    if(seg.length>1) out.push(seg);
  };
  (gj?.features||[]).forEach(f=>{
    const g=f?.geometry;if(!g)return;
    if(g.type==='LineString') add(g.coordinates);
    else if(g.type==='MultiLineString') (g.coordinates||[]).forEach(add);
  });
  return out;
}
function parseGPX(text){
  const xml=new DOMParser().parseFromString(text,'application/xml');
  const pts=[...xml.querySelectorAll('trkpt')].map(p=>[Number(p.getAttribute('lat')),Number(p.getAttribute('lon'))]).filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]));
  if(pts.length>1)return pts;
  return [...xml.querySelectorAll('rtept')].map(p=>[Number(p.getAttribute('lat')),Number(p.getAttribute('lon'))]).filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]));
}
async function loadFullRoute(){
  const r=await fetch(CAMINO_ROUTE_URL,{cache:'no-store'});if(!r.ok)throw new Error('ruta');
  const segs=geoJSONSegments(await r.json());if(!segs.length)throw new Error('vacía');return segs;
}
async function loadVerifiedStage(n){
  const local=(typeof LOCAL_VERIFIED_STAGE_ROUTES!=='undefined')?LOCAL_VERIFIED_STAGE_ROUTES[n]:null;
  if(local&&local.length>1) return local;
  const url=VERIFIED_STAGE_GPX[n];if(!url)return null;
  const r=await fetch(url,{cache:'no-store',mode:'cors'});if(!r.ok)throw new Error('gpx');
  const pts=parseGPX(await r.text());if(pts.length<2)throw new Error('gpx vacío');return pts;
}
async function makeMap(n,id,fullRoute=false){
  if(mapInstance){try{mapInstance.remove()}catch(e){} mapInstance=null}
  const el=document.getElementById(id);
  if(!el||typeof L==='undefined'){if(el)el.innerHTML='<div class="empty">El mapa necesita conexión la primera vez.</div>';return}
  el.innerHTML='<div class="empty">Cargando cartografía…</div>';
  try{
    mapInstance=L.map(id,{zoomControl:true});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(mapInstance);
    if(fullRoute){
      const segs=await loadFullRoute();
      const group=L.featureGroup();
      segs.forEach(seg=>L.polyline(seg,{color:'#0867d6',weight:4,opacity:.9}).addTo(group));
      group.addTo(mapInstance);mapInstance.fitBounds(group.getBounds(),{padding:[18,18]});
    }else{
      const coords=await loadVerifiedStage(n);
      if(!coords){
        const st=STAGES.find(x=>x.n===n);
        el.innerHTML=`<div class="empty"><div class="big">🗺</div><p><strong>${esc(st.from)} → ${esc(st.to)}</strong></p><p>Esta etapa todavía está en validación cartográfica. En V3 no mostramos trazados aproximados.</p></div>`;
        try{mapInstance.remove()}catch(e){} mapInstance=null;return;
      }
      const line=L.polyline(coords,{color:'#0867d6',weight:5,opacity:.95}).addTo(mapInstance);
      mapInstance.fitBounds(line.getBounds(),{padding:[18,18]});
      L.marker(coords[0]).addTo(mapInstance).bindPopup('Inicio: '+STAGES.find(x=>x.n===n).from);
      L.marker(coords[coords.length-1]).addTo(mapInstance).bindPopup('Final: '+STAGES.find(x=>x.n===n).to);
    }
    setTimeout(()=>mapInstance&&mapInstance.invalidateSize(),100);
  }catch(err){
    try{if(mapInstance)mapInstance.remove()}catch(e){} mapInstance=null;
    el.innerHTML='<div class="empty"><div class="big">🗺</div><p>No se pudo cargar el trazado verificado. Comprueba la conexión. No se mostrará una ruta aproximada.</p></div>';
  }
}
function locateUser(){if(!navigator.geolocation){toast('Este dispositivo no ofrece geolocalización.');return}toast('Solicitando ubicación…');navigator.geolocation.getCurrentPosition(p=>{const {latitude,longitude}=p.coords;if(mapInstance){L.marker([latitude,longitude]).addTo(mapInstance).bindPopup('Estás aquí').openPopup();mapInstance.setView([latitude,longitude],14)}else{mapView();setTimeout(()=>{if(mapInstance){L.marker([latitude,longitude]).addTo(mapInstance).bindPopup('Estás aquí').openPopup();mapInstance.setView([latitude,longitude],14)}},500)}toast('Ubicación encontrada.')},()=>toast('No se pudo obtener la ubicación. Revisa los permisos.'),{enableHighAccuracy:true,timeout:8000})}
function serviceSearch(type){if(type==='emergencia'){toast('Emergencias en España: 112');return}const q=encodeURIComponent(type+' cerca de mí');window.open('https://www.openstreetmap.org/search?query='+q,'_blank','noopener')}
function bindFav(){document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.fav;favorites.has(id)?favorites.delete(id):favorites.add(id);save();b.classList.toggle('on',favorites.has(id));toast(favorites.has(id)?'Añadido a favoritos':'Eliminado de favoritos')});document.querySelectorAll('[data-phone]').forEach(b=>b.onclick=()=>location.href='tel:'+b.dataset.phone);document.querySelectorAll('[data-osm]').forEach(b=>b.onclick=()=>window.open('https://www.openstreetmap.org/search?query='+encodeURIComponent(b.dataset.osm),'_blank','noopener'))}
function bindStageCards(){document.querySelectorAll('[data-stage]').forEach(c=>{c.onclick=()=>detail(Number(c.dataset.stage));c.onkeydown=e=>{if(e.key==='Enter')c.click()}})}
function bindCommon(){bindStageCards();document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>serviceSearch(b.dataset.service));const w=document.getElementById('whereBtn');if(w)w.onclick=locateUser}
function navigate(v){if(v==='home')home();else if(v==='stages')stages();else if(v==='map')mapView();else if(v==='favorites')favoritesView();else if(v==='mycamino')myCamino()}
document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.querySelector('.brand').onclick=home;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const b=document.getElementById('installBtn');b.hidden=false;b.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;b.hidden=true}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
home();
