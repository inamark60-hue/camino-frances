const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
let currentView='home',deferredPrompt,mapInstance,mapLayers={};
let mapFocusActive=false,elevationMarker=null,currentElevationSamples=[];
let routeDotMarkers=[],routeGuideLines=[],routeHaloLines=[];
let physicalOrientationLast=0;
let routeVisible=localStorage.getItem('camino-route-visible')!=='0';
const favorites=new Set(JSON.parse(localStorage.getItem('camino-favorites')||'[]'));
const doneStages=new Set(JSON.parse(localStorage.getItem('camino-done')||'[]').map(Number));

const DATA_BASE='https://cdn.jsdelivr.net/gh/walktalkmeditate/open-pilgrimages@v1/routes/camino-frances';
const ROUTE_URL=`${DATA_BASE}/route.geojson`;
const WAYPOINTS_URL=`${DATA_BASE}/waypoints.geojson`;
const STAGES_URL=`${DATA_BASE}/stages.json`;
let remoteRoute=null,remoteWaypoints=null,remoteStages=null;

const STAGE_BBOX={1:{minLat:42.995,maxLat:43.175,minLon:-1.335,maxLon:-1.205}};
// Muestras de altitud verificadas de la etapa 1 (GPX Fundación ONCE).
// Se anclan a la geometría de alta resolución para dibujar el perfil y sincronizar mapa/gráfica.
const STAGE1_ELEVATION_ANCHORS=[
 [43.163668,-1.234870,170.2],[43.152103,-1.242169,265.0],[43.139785,-1.240182,324.4],
 [43.129554,-1.242366,344.7],[43.121261,-1.243408,521.9],[43.115917,-1.237614,726.2],
 [43.104260,-1.239437,867.0],[43.091490,-1.243935,973.9],[43.084113,-1.252092,1086.2],
 [43.077655,-1.262482,1094.2],[43.068260,-1.269020,1189.7],[43.057277,-1.266668,1231.1],
 [43.047190,-1.264913,1321.4],[43.041941,-1.276306,1247.4],[43.036433,-1.290694,1340.9],
 [43.028320,-1.295898,1450.0],[43.027185,-1.295453,1412.7],[43.026167,-1.305500,1277.4],
 [43.023584,-1.313762,1188.4],[43.020342,-1.321249,1073.3],[43.014461,-1.317398,982.3],
 [43.008475,-1.319832,953.8]
];
const TYPE_LABEL={water_source:'Agua',medical:'Farmacia / salud',accommodation:'Dormir',food:'Comer',transport:'Transporte',supply:'Suministros / WC',credential_stamp:'Sello',information:'Información',viewpoint:'Mirador',cultural_site:'Cultura',sacred_site:'Lugar jacobeo',town:'Localidad',camping:'Camping',pass:'Puerto',waymarker:'Señal'};
const TYPE_ICON={water_source:'💧',medical:'✚',accommodation:'🛏',food:'🍴',transport:'🚌',supply:'🛒',credential_stamp:'🟨',information:'ℹ️',viewpoint:'👁',cultural_site:'🏛',sacred_site:'⛪',town:'📍',camping:'⛺',pass:'⛰',waymarker:'➡️'};

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2400)}
function save(){localStorage.setItem('camino-favorites',JSON.stringify([...favorites]));localStorage.setItem('camino-done',JSON.stringify([...doneStages]))}
function setActive(nav){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav))}
function kmTotal(){return STAGES.reduce((a,s)=>a+s.km,0)}
function stageCard(s){return `<article class="stage-card ${s.n===1?'featured':''}" data-stage="${s.n}" role="button" tabindex="0"><div class="num">${s.n}</div><div><h3>${esc(s.from)} → ${esc(s.to)}</h3><div class="meta">${s.km.toFixed(1)} km · ${s.h} · ${s.difficulty}</div></div><div class="arrow">›</div></article>`}

function quickButtons(){return [
 ['🛏','Dormir','alojamiento'],['🍴','Comer','restaurante'],['💧','Agua','fuente'],['✚','Farmacia','farmacia'],
 ['❤','Salud','centro de salud'],['🚕','Taxi','taxi'],['🚌','Bus / Tren','transporte'],['🛒','Tienda','supermercado'],
 ['🏧','Cajero','cajero automático'],['🧺','Lavandería','lavandería'],['🚻','WC','aseos públicos'],['🚲','Bicicleta','taller bicicletas'],
 ['🟨','Sellos','credencial peregrino'],['🩹','Primeros auxilios','primeros_auxilios'],['🛡','Policía','policía guardia civil'],['🏛','Ayuntamiento','ayuntamiento'],['⚠','Emergencias','emergencia']
].map(x=>`<button class="quick" data-service="${x[2]}"><span class="qicon">${x[0]}</span>${x[1]}</button>`).join('')}

function home(){currentView='home';setActive('home');app.innerHTML=`
<section class="hero"><img class="home-logo" src="buen-camino-logo.png" alt="BUEN CAMINO"><p>33 etapas, mapa topográfico, GPS, servicios y ayuda práctica para el peregrino. Pensada exclusivamente para Android.</p><span class="pill">GRATUITA · ANDROID · V4.8 PRO</span></section>
<section class="pro-banner"><strong>🗺 Cartografía topográfica</strong><span>Curvas de nivel, relieve y trazado GPS cuando está disponible.</span></section>
<section class="section"><div class="section-head"><h2>Las 33 etapas</h2><button class="link-btn" data-nav="stages">Ver todas</button></div>${STAGES.slice(0,5).map(stageCard).join('')}</section>
<button class="location-cta" id="whereBtn">📍 ¿DÓNDE ESTOY AHORA?<small>GPS del teléfono · alta precisión si Android la permite</small></button>
<section class="section"><div class="section-head"><h2>Todo lo que usa un peregrino</h2></div><div class="quick-grid">${quickButtons()}</div></section>
<section class="section"><div class="safety-card"><strong>⚠ Seguridad</strong><p>112 funciona como número europeo de emergencias. La cartografía es una ayuda: sigue siempre la señalización del Camino y las indicaciones oficiales.</p></div></section>`;bindCommon()}

function stages(){currentView='stages';setActive('stages');app.innerHTML=`<section class="section"><div class="section-head"><h2>Etapas del Camino Francés</h2></div><input class="search" id="stageSearch" placeholder="Buscar etapa o localidad…" autocomplete="off"><div id="stageList">${STAGES.map(stageCard).join('')}</div></section>`;bindCommon();document.getElementById('stageSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();document.getElementById('stageList').innerHTML=STAGES.filter(s=>(s.from+' '+s.to).toLowerCase().includes(q)).map(stageCard).join('')||'<div class="empty">No hay resultados.</div>';bindStageCards()})}

function detail(n,tab='resumen'){const s=STAGES.find(x=>x.n===n);currentView=`detail-${n}`;setActive('stages');app.innerHTML=`<section class="detail-head"><div class="backline"><button id="backStages">‹ Volver</button><button class="fav ${favorites.has('stage-'+n)?'on':''}" data-fav="stage-${n}">♥</button></div><div class="eyebrow">ETAPA ${n}</div><h1>${esc(s.from)} → ${esc(s.to)}</h1><div class="detail-stats"><span>🚶 ${s.km.toFixed(1)} km</span><span>◷ ${s.h}</span><span>⛰ +${s.gain} m</span><span>▥ ${s.difficulty}</span></div></section><div class="detail-tabs">${['resumen','mapa','servicios','alojamientos'].map(t=>`<button data-tab="${t}" class="${tab===t?'active':''}">${t.toUpperCase()}</button>`).join('')}</div><div id="detailBody"></div>`;
document.getElementById('backStages').onclick=stages;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>detail(n,b.dataset.tab));bindFav();renderDetailBody(s,tab)}

function renderDetailBody(s,tab){const body=document.getElementById('detailBody');
 if(tab==='resumen'){
   const stage1=s.n===1?`<div class="warning-card"><strong>⛰ Alta montaña</strong><p>Ruta de Napoleón. No recomendada entre noviembre y marzo. Altitud mínima publicada: 168 m; máxima: 1.450 m; desnivel publicado: 1.281 m.</p></div>`:'';
   body.innerHTML=`<section class="section"><div class="stat-grid"><div class="stat">🚶<strong>${s.km.toFixed(1)} km</strong><span>Distancia plan</span></div><div class="stat">◷<strong>${s.h}</strong><span>Tiempo</span></div><div class="stat">⛰<strong>+${s.gain} m</strong><span>Desnivel</span></div><div class="stat">▥<strong>${s.difficulty}</strong><span>Dificultad</span></div></div>${stage1}<h2>Preparación de etapa</h2><div class="checklist"><span>💧 Agua y comida</span><span>🌦 Meteorología</span><span>🔋 Batería / powerbank</span><span>🩹 Botiquín</span><span>🪪 Credencial</span><span>🧥 Capa y abrigo</span></div><h2>Mapa topográfico</h2><div class="map-toolbar inline-toolbar"><button id="routeBtn" class="map-chip ${routeVisible?'active':''}">🟨 Ruta ${routeVisible?'ON':'OFF'}</button><button id="summaryBigMapBtn" class="map-chip map-chip-primary">⛶ AMPLIAR MAPA</button></div><div id="stageMap" class="mapbox map-preview" role="button" aria-label="Abrir mapa grande y perfil de desnivel"></div><div class="map-note"><strong>Pulsa “AMPLIAR MAPA”</strong> para abrir mapa grande + perfil de desnivel. Base topográfica con curvas de nivel: OpenTopoMap.</div></section>`;setTimeout(async()=>{await makeMap(s.n,'stageMap',false);bindMapToolbar(s.n);const open=()=>openStageBigMap(s.n);const b=document.getElementById('summaryBigMapBtn');if(b)b.onclick=open},0)
 } else if(tab==='mapa'){
   body.innerHTML=`<div id="mapWorkspace" class="map-workspace"><div class="map-shell map-mode"><div id="stageMapTall" class="mapbox tall"></div><div class="map-floats"><button id="routeBtn" class="map-float ${routeVisible?'active':''}">🟨 RUTA ${routeVisible?'ON':'OFF'}</button><button id="poisBtn" class="map-float">📌 SERVICIOS</button><button id="locateFloat" class="map-float">📍 GPS</button><button id="rotateMapBtn" class="map-float">↻ HORIZONTAL</button><button id="fullscreenMapBtn" class="map-float map-main-action">⛶ MAPA GRANDE</button></div></div><aside id="elevationPanel" class="elevation-panel"><div class="elevation-head"><div><span>PERFIL DE DESNIVEL</span><strong id="elevationReadout">Toca o desliza el dedo</strong></div><small id="elevationSource">Preparando perfil…</small></div><div id="elevationChart" class="elevation-chart"><div class="elevation-loading">Cargando altitud…</div></div></aside></div><section class="section map-actions"><button class="location-cta full" id="locateOnMap">📍 MOSTRAR MI UBICACIÓN</button><div id="mapStatus" class="route-source">Cargando trazado detallado · puntos de Camino…</div><div id="poiLegend" class="poi-legend"></div></section>`;setTimeout(async()=>{await makeMap(s.n,'stageMapTall',false,true);document.getElementById('locateOnMap').onclick=locateUser;document.getElementById('locateFloat').onclick=locateUser;document.getElementById('fullscreenMapBtn').onclick=enterMapFullscreen;document.getElementById('rotateMapBtn').onclick=toggleManualLandscape;bindMapToolbar(s.n);autoFocusLandscape()},0)
 } else if(tab==='servicios'){
   body.innerHTML=`<section class="section"><div class="emergency"><strong>⚠ Emergencias: 112</strong>Número europeo de emergencias, válido también en Francia.</div><h2>Servicios para el peregrino</h2><div class="service-grid">${quickButtons()}</div><div class="info-card"><strong>Servicios sobre el Camino</strong><p>En el mapa, “Servicios” intenta cargar puntos de agua, farmacias, alojamiento, comida, transporte y suministros desde datos abiertos cercanos a la ruta.</p></div></section>`;bindCommon()
 } else {
   const rows=s.n===30?STAGE30_SERVICES.filter(x=>x.type==='alojamiento'):[];body.innerHTML=`<section class="section"><h2>Alojamientos</h2><div class="info-card"><strong>Precios</strong><p>No mostraremos precios “de hoy” sin una fuente de disponibilidad en tiempo real. Se distinguirán precios orientativos de tarifas actuales.</p></div>${rows.length?rows.map(serviceCard).join(''):'<div class="empty"><div class="big">🛏</div><p>Los alojamientos se incorporarán desde fuentes verificadas y datos abiertos, sin inventar precios.</p></div>'}</section>`;bindFav()
 }}

function serviceCard(x){return `<article class="service-card"><div><span class="badge">${esc(x.type)}</span><h3>${esc(x.name)}</h3><p>${esc(x.sub)}</p><p>${esc(x.note)}</p>${x.phone?`<div class="service-actions"><a class="mini-btn phone-link" href="tel:${esc(x.phone)}">📞 ${esc(x.phone)}</a></div>`:''}</div><div><div class="price">${esc(x.price)}</div><button class="fav ${favorites.has(x.id)?'on':''}" data-fav="${x.id}">♥</button></div></article>`}

function favoritesView(){currentView='favorites';setActive('favorites');const st=[...favorites].filter(x=>x.startsWith('stage-')).map(x=>STAGES.find(s=>s.n===Number(x.split('-')[1]))).filter(Boolean);app.innerHTML=`<section class="section"><div class="section-head"><h2>Favoritos</h2></div>${st.length?st.map(stageCard).join(''):'<div class="empty"><div class="big">♡</div><p>Guarda etapas y servicios con el corazón.</p></div>'}</section>`;bindStageCards()}
function myCamino(){currentView='mycamino';setActive('mycamino');const done=[...doneStages].map(n=>STAGES.find(s=>s.n===n)).filter(Boolean);const km=done.reduce((a,s)=>a+s.km,0),pct=Math.round(doneStages.size/STAGES.length*100);app.innerHTML=`<section class="section"><h2>Mi Camino</h2><div class="progress-card"><strong>${doneStages.size} de 33 etapas</strong><div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div><div class="meta">${km.toFixed(1)} km registrados de ${kmTotal().toFixed(1)} km</div></div><h2>Marcar etapas realizadas</h2>${STAGES.map(s=>`<div class="my-stage" data-done="${s.n}"><button class="check ${doneStages.has(s.n)?'done':''}">${doneStages.has(s.n)?'✓':''}</button><div><strong>Etapa ${s.n}</strong><div class="meta">${esc(s.from)} → ${esc(s.to)}</div></div></div>`).join('')}</section>`;document.querySelectorAll('[data-done]').forEach(r=>r.onclick=()=>{const n=Number(r.dataset.done);doneStages.has(n)?doneStages.delete(n):doneStages.add(n);save();myCamino()})}

function geoJSONSegments(gj){const out=[];const add=line=>{const seg=(line||[]).map(c=>[Number(c[1]),Number(c[0]),c.length>2?Number(c[2]):null]).filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]));if(seg.length>1)out.push(seg)};(gj?.features||[]).forEach(f=>{const g=f?.geometry;if(!g)return;if(g.type==='LineString')add(g.coordinates);else if(g.type==='MultiLineString')(g.coordinates||[]).forEach(add)});return out}
async function fetchJson(url){const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));return r.json()}
async function loadOpenPilgrimages(){const jobs=[];if(!remoteRoute)jobs.push(fetchJson(ROUTE_URL).then(x=>remoteRoute=x));if(!remoteWaypoints)jobs.push(fetchJson(WAYPOINTS_URL).then(x=>remoteWaypoints=x));if(!remoteStages)jobs.push(fetchJson(STAGES_URL).then(x=>remoteStages=x));await Promise.allSettled(jobs)}
function inBox(lat,lon,b){return lat>=b.minLat&&lat<=b.maxLat&&lon>=b.minLon&&lon<=b.maxLon}
function stageSegmentsFromRemote(n){if(!remoteRoute)return[];const all=geoJSONSegments(remoteRoute);const b=STAGE_BBOX[n];if(!b)return[];return all.map(seg=>seg.filter(p=>inBox(p[0],p[1],b))).filter(seg=>seg.length>1)}
function localStage(n){const x=(typeof LOCAL_VERIFIED_STAGE_ROUTES!=='undefined')?LOCAL_VERIFIED_STAGE_ROUTES[n]:null;return x&&x.length>1?[x.map(p=>[p[0],p[1],null])]:[]}
function routeStyleForZoom(z){
  // Los puntos crecen al acercar el zoom: visibles caminando sin tapar el sendero de lejos.
  if(z>=17)return{radius:8.2,line:3.2,halo:6.2};
  if(z>=16)return{radius:7.2,line:3.0,halo:5.8};
  if(z>=15)return{radius:6.2,line:2.7,halo:5.2};
  if(z>=14)return{radius:5.3,line:2.5,halo:4.8};
  if(z>=12)return{radius:4.5,line:2.25,halo:4.3};
  if(z>=10)return{radius:3.8,line:2.0,halo:3.9};
  return{radius:3.2,line:1.8,halo:3.5};
}
function updateRouteStyle(map){
  if(!map)return;
  const st=routeStyleForZoom(map.getZoom());
  routeDotMarkers.forEach(m=>{try{m.setRadius(st.radius);m.setStyle({weight:Math.max(1.1,st.radius*.22)})}catch{}});
  routeGuideLines.forEach(l=>{try{l.setStyle({weight:st.line,opacity:.92})}catch{}});
  routeHaloLines.forEach(l=>{try{l.setStyle({weight:st.halo,opacity:.72})}catch{}});
}
function routeLayers(map,segs){
  const g=L.featureGroup();
  const renderer=L.canvas({padding:.55});
  routeDotMarkers=[];routeGuideLines=[];routeHaloLines=[];
  segs.forEach(seg=>{
    // Halo claro bajo la guía: mejora contraste sin ocultar detalles del mapa.
    const halo=L.polyline(seg,{renderer,color:'#fff7cf',weight:4.3,opacity:.72,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
    const guide=L.polyline(seg,{renderer,color:'#062b65',weight:2.25,opacity:.92,lineCap:'round',lineJoin:'round',interactive:false}).addTo(g);
    routeHaloLines.push(halo);routeGuideLines.push(guide);
    // Más puntos que antes; su tamaño se adapta automáticamente al nivel de zoom.
    const targetDots=320;
    const step=Math.max(1,Math.ceil(seg.length/targetDots));
    for(let i=0;i<seg.length;i+=step){
      const m=L.circleMarker(seg[i],{renderer,radius:4.5,color:'#062b65',weight:1.15,fillColor:'#ffc400',fillOpacity:1,interactive:false}).addTo(g);
      routeDotMarkers.push(m);
    }
    if(seg.length>1){
      const m=L.circleMarker(seg[seg.length-1],{renderer,radius:4.5,color:'#062b65',weight:1.15,fillColor:'#ffc400',fillOpacity:1,interactive:false}).addTo(g);
      routeDotMarkers.push(m);
    }
  });
  g.addTo(map);
  updateRouteStyle(map);
  map.on('zoomend',()=>updateRouteStyle(map));
  return g
}
function baseLayers(map){const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'Kartendaten © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung © OpenTopoMap (CC-BY-SA)'});const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});topo.addTo(map);L.control.layers({'Topográfico · curvas de nivel':topo,'Calles · OpenStreetMap':osm},null,{position:'topright',collapsed:true}).addTo(map);L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);return{topo,osm}}

async function makeMap(n,id,fullRoute=false,withPois=false){if(mapInstance){try{mapInstance.remove()}catch{}mapInstance=null}const el=document.getElementById(id);if(!el||typeof L==='undefined'){if(el)el.innerHTML='<div class="empty">El mapa necesita conexión la primera vez.</div>';return}el.innerHTML='';mapInstance=L.map(id,{zoomControl:true,preferCanvas:true});mapLayers=baseLayers(mapInstance);let segs=[];let source='';try{await loadOpenPilgrimages();if(fullRoute&&remoteRoute){segs=geoJSONSegments(remoteRoute);source='Open Pilgrimages · trazado completo de alta resolución'}else if(n){segs=stageSegmentsFromRemote(n);if(segs.length)source='Open Pilgrimages · geometría OSM de alta resolución'} }catch{}
 if(!segs.length&&n){segs=localStage(n);source=segs.length?'Trazado local verificado (respaldo)':''}
 if(segs.length){const g=routeLayers(mapInstance,segs);mapLayers.route=g;const b=g.getBounds();if(b.isValid())mapInstance.fitBounds(b,{padding:[18,18],maxZoom:15});if(!routeVisible&&mapInstance.hasLayer(g))mapInstance.removeLayer(g);const flat=segs.flat();if(n&&flat.length){L.circleMarker(flat[0],{radius:7,color:'#fff',weight:2,fillColor:'#178a3b',fillOpacity:1}).addTo(mapInstance).bindPopup('Inicio: '+STAGES.find(x=>x.n===n).from);L.circleMarker(flat[flat.length-1],{radius:7,color:'#fff',weight:2,fillColor:'#d93636',fillOpacity:1}).addTo(mapInstance).bindPopup('Final: '+STAGES.find(x=>x.n===n).to)}}else{mapInstance.setView([42.9,-4.5],6);toast('Esta etapa aún no tiene trazado detallado cargado.')}
 const status=document.getElementById('mapStatus');if(status)status.textContent=source||'Trazado detallado pendiente para esta etapa.';
 if(n)setupElevationProfile(n,segs);if(withPois&&n)await showStagePois(n);setTimeout(()=>mapInstance&&mapInstance.invalidateSize(),120)}


function havKm(a,b){const R=6371,rad=Math.PI/180,dLat=(b[0]-a[0])*rad,dLon=(b[1]-a[1])*rad,la1=a[0]*rad,la2=b[0]*rad;const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function buildElevationSamples(n,segs){
  if(n!==1||!segs?.length)return[];
  const route=segs.flat().filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));if(route.length<2)return[];
  const cum=[0];for(let i=1;i<route.length;i++)cum[i]=cum[i-1]+havKm(route[i-1],route[i]);
  const anchors=STAGE1_ELEVATION_ANCHORS.map(a=>{let best=0,bd=Infinity;for(let i=0;i<route.length;i++){const d=(route[i][0]-a[0])**2+(route[i][1]-a[1])**2;if(d<bd){bd=d;best=i}}return{idx:best,km:cum[best],ele:a[2]}}).sort((a,b)=>a.idx-b.idx);
  const clean=[];for(const a of anchors){if(!clean.length||a.idx>clean[clean.length-1].idx)clean.push(a);else clean[clean.length-1]=a}
  if(clean.length<2)return[];
  const elevAt=(km)=>{let j=0;while(j<clean.length-2&&clean[j+1].km<km)j++;const a=clean[j],b=clean[Math.min(j+1,clean.length-1)];if(km<=clean[0].km)return clean[0].ele;if(km>=clean[clean.length-1].km)return clean[clean.length-1].ele;const t=(km-a.km)/Math.max(.00001,b.km-a.km);return a.ele+(b.ele-a.ele)*t};
  const total=cum[cum.length-1],count=300,out=[];let ri=0;
  for(let k=0;k<count;k++){const target=total*k/(count-1);while(ri<cum.length-2&&cum[ri+1]<target)ri++;const d0=cum[ri],d1=cum[ri+1],t=(target-d0)/Math.max(.00001,d1-d0),lat=route[ri][0]+(route[ri+1][0]-route[ri][0])*t,lon=route[ri][1]+(route[ri+1][1]-route[ri][1])*t;out.push({km:target,lat,lon,ele:elevAt(target)})}
  return out
}
function setupElevationProfile(n,segs){const panel=document.getElementById('elevationPanel'),chart=document.getElementById('elevationChart');if(!panel||!chart)return;const samples=buildElevationSamples(n,segs);currentElevationSamples=samples;if(!samples.length){chart.innerHTML='<div class="elevation-loading">Perfil de altitud verificado pendiente para esta etapa.</div>';const src=document.getElementById('elevationSource');if(src)src.textContent='Sin datos de altitud verificados';return}renderElevationProfile(samples);const src=document.getElementById('elevationSource');if(src)src.textContent='Altitud: GPX Fundación ONCE · ruta: geometría detallada'}
function renderElevationProfile(samples){const host=document.getElementById('elevationChart');if(!host||!samples.length)return;const W=720,H=260,LFT=52,RGT=18,TOP=16,BOT=40,maxKm=samples[samples.length-1].km,minEle=Math.floor((Math.min(...samples.map(p=>p.ele))-60)/100)*100,maxEle=Math.ceil((Math.max(...samples.map(p=>p.ele))+40)/100)*100;const x=p=>LFT+p.km/maxKm*(W-LFT-RGT),y=p=>TOP+(maxEle-p.ele)/(maxEle-minEle)*(H-TOP-BOT);const pts=samples.map(p=>`${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(' ');let grid='';for(let i=0;i<=4;i++){const yy=TOP+i*(H-TOP-BOT)/4,ev=Math.round(maxEle-i*(maxEle-minEle)/4);grid+=`<line x1="${LFT}" y1="${yy}" x2="${W-RGT}" y2="${yy}" class="elev-grid"/><text x="4" y="${yy+4}" class="elev-axis">${ev} m</text>`}for(let i=0;i<=5;i++){const xx=LFT+i*(W-LFT-RGT)/5,km=maxKm*i/5;grid+=`<text x="${xx}" y="${H-8}" text-anchor="middle" class="elev-axis">${km.toFixed(1)} km</text>`}host.innerHTML=`<svg id="elevationSvg" class="elevation-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Perfil de altitud interactivo"><defs><linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc400" stop-opacity=".30"/><stop offset="1" stop-color="#ffc400" stop-opacity=".04"/></linearGradient></defs>${grid}<polygon points="${LFT},${H-BOT} ${pts} ${W-RGT},${H-BOT}" class="elev-fill"/><polyline points="${pts}" class="elev-line"/><line id="elevCursorLine" x1="${LFT}" y1="${TOP}" x2="${LFT}" y2="${H-BOT}" class="elev-cursor-line"/><circle id="elevCursor" cx="${LFT}" cy="${y(samples[0])}" r="9" class="elev-cursor"/><rect id="elevHit" x="${LFT}" y="0" width="${W-LFT-RGT}" height="${H}" fill="transparent"/></svg>`;const svg=document.getElementById('elevationSvg'),cursor=document.getElementById('elevCursor'),line=document.getElementById('elevCursorLine'),hit=document.getElementById('elevHit');const read=document.getElementById('elevationReadout');const select=(clientX)=>{const r=svg.getBoundingClientRect(),px=Math.max(0,Math.min(1,(clientX-r.left)/r.width)),targetKm=px*maxKm;let lo=0,hi=samples.length-1;while(lo<hi){const m=(lo+hi)>>1;if(samples[m].km<targetKm)lo=m+1;else hi=m}const i=Math.max(0,Math.min(samples.length-1,lo)),p=samples[i],cx=x(p),cy=y(p);cursor.setAttribute('cx',cx);cursor.setAttribute('cy',cy);line.setAttribute('x1',cx);line.setAttribute('x2',cx);if(read)read.textContent=`Km ${p.km.toFixed(1)} · ${Math.round(p.ele)} m`;if(mapInstance){if(!elevationMarker)elevationMarker=L.circleMarker([p.lat,p.lon],{radius:7,color:'#062b65',weight:2.5,fillColor:'#ffc400',fillOpacity:1,interactive:false}).addTo(mapInstance);else elevationMarker.setLatLng([p.lat,p.lon])}};hit.addEventListener('pointerdown',e=>{hit.setPointerCapture?.(e.pointerId);select(e.clientX)});hit.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch'||e.pointerType==='pen')select(e.clientX)});hit.addEventListener('click',e=>select(e.clientX));select(svg.getBoundingClientRect().left+svg.getBoundingClientRect().width*.02)}

function mapView(){currentView='map';setActive('map');app.innerHTML=`<div class="map-shell map-mode"><div id="mainMap" class="mapbox tall"></div><div class="map-floats"><button id="routeBtn" class="map-float ${routeVisible?'active':''}">🟨 RUTA ${routeVisible?'ON':'OFF'}</button><button id="mapGpsFloat" class="map-float">📍 GPS</button><button id="rotateMapBtn" class="map-float">↻ HORIZONTAL</button><button id="fullscreenMapBtn" class="map-float map-main-action">⛶ GRANDE</button></div></div><section class="section map-actions"><button class="location-cta full" id="mapLocate">📍 MOSTRAR MI UBICACIÓN</button><p class="map-note">Mapa completo del Camino Francés. Los puntos amarillos aumentan de tamaño al acercar el zoom. GRANDE abre la cartografía en horizontal incluso si Android mantiene el bloqueo vertical.</p><div id="poiLegend" class="poi-legend"></div></section>`;setTimeout(async()=>{await makeMap(null,'mainMap',true,false);document.getElementById('mapLocate').onclick=locateUser;document.getElementById('mapGpsFloat').onclick=locateUser;document.getElementById('rotateMapBtn').onclick=toggleManualLandscape;document.getElementById('fullscreenMapBtn').onclick=()=>mapFocusActive?exitMapFocus():enterMapFullscreen(true);bindMapToolbar(null)},0)}

function waypointStageMatch(f,n){const p=f?.properties||{};const idx=Number(p.stageIndex);if(Number.isFinite(idx)&&(idx===n||idx===n-1))return true;if(n===1&&f.geometry?.type==='Point'){const [lon,lat]=f.geometry.coordinates||[];return Number.isFinite(lat)&&Number.isFinite(lon)&&inBox(lat,lon,STAGE_BBOX[1])}return false}

const osmContactCache=new Map();
function cleanPhone(v){if(Array.isArray(v))v=v[0];return String(v||'').trim()}
function directContact(p={}){return {
 phone:cleanPhone(p.phone||p['contact:phone']||p.contactPhone||p.mobile||p['contact:mobile']),
 website:String(p.website||p['contact:website']||'').trim(),
 opening:String(p.opening_hours||p.openingHours||'').trim()
}}
function osmRef(osmId){const m=String(osmId||'').match(/^(node|way|relation)\/(\d+)$/i);if(!m)return null;return{type:m[1].toLowerCase(),id:m[2],code:({node:'N',way:'W',relation:'R'})[m[1].toLowerCase()]+m[2]}}
function contactHtml(c={}){let out='';if(c.phone)out+=`<a class="poi-call" href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>`;if(c.website)out+=`<a class="poi-web" href="${esc(c.website)}" target="_blank" rel="noopener">🌐 Web</a>`;if(c.opening)out+=`<div class="poi-hours">🕒 ${esc(c.opening)}</div>`;return out||'<span class="poi-no-phone">Sin teléfono publicado en la fuente abierta.</span>'}
function poiPopupHtml(p,name,type){const c=directContact(p),ref=osmRef(p.osmId),km=p.kmFromStart!=null?`<div>Km ${Number(p.kmFromStart).toFixed(1)} del Camino</div>`:'';let contact='';if(c.phone||c.website||c.opening)contact=`<div class="poi-contact">${contactHtml(c)}</div>`;else if(ref)contact=`<div class="poi-contact"><button class="poi-contact-load" data-osm="${esc(p.osmId)}">📞 VER TELÉFONO</button><small>Consulta los datos publicados del establecimiento.</small></div>`;else contact='<div class="poi-contact"><span class="poi-no-phone">Sin teléfono publicado.</span></div>';return `<div class="poi-popup"><strong>${esc(name)}</strong><div>${esc(TYPE_LABEL[type]||type)}</div>${km}${contact}</div>`}
async function fetchOsmContact(osmId){if(osmContactCache.has(osmId))return osmContactCache.get(osmId);const saved=localStorage.getItem('osm-contact:'+osmId);if(saved){try{const x=JSON.parse(saved);osmContactCache.set(osmId,x);return x}catch{}}const ref=osmRef(osmId);if(!ref)throw new Error('Referencia OSM inválida');let tags={};try{const r=await fetch(`https://api.openstreetmap.org/api/0.6/${ref.type}/${ref.id}.json`,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('OSM');const j=await r.json();tags=j.elements?.[0]?.tags||{}}catch{
  const r=await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${ref.code}&format=jsonv2&addressdetails=0&extratags=1&accept-language=es`);if(!r.ok)throw new Error('Nominatim');const j=await r.json();tags=j?.[0]?.extratags||{}
}
const c={phone:cleanPhone(tags['contact:phone']||tags.phone||tags['contact:mobile']||tags.mobile),website:String(tags['contact:website']||tags.website||'').trim(),opening:String(tags.opening_hours||'').trim()};osmContactCache.set(osmId,c);try{localStorage.setItem('osm-contact:'+osmId,JSON.stringify(c))}catch{}return c}
async function loadPoiContact(btn){if(!btn||btn.disabled)return;const osmId=btn.dataset.osm;btn.disabled=true;btn.textContent='Buscando…';try{const c=await fetchOsmContact(osmId);const box=btn.closest('.poi-contact');if(box)box.innerHTML=contactHtml(c)}catch{btn.disabled=false;btn.textContent='📞 REINTENTAR TELÉFONO';toast('No se pudo consultar el teléfono. Comprueba la conexión.')}}
async function showStagePois(n){if(!remoteWaypoints){try{await loadOpenPilgrimages()}catch{}}if(!remoteWaypoints||!mapInstance){toast('No se pudieron cargar los servicios abiertos.');return}if(mapLayers.pois){mapInstance.removeLayer(mapLayers.pois);mapLayers.pois=null;return}const group=L.layerGroup();let count=0;for(const f of remoteWaypoints.features||[]){if(!waypointStageMatch(f,n))continue;if(f.geometry?.type!=='Point')continue;const [lon,lat]=f.geometry.coordinates||[];if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const p=f.properties||{},type=p.type||'information',name=p.name?.es||p.name?.en||p.name||TYPE_LABEL[type]||'Servicio';const icon=L.divIcon({className:'poi-div-icon',html:`<span>${TYPE_ICON[type]||'📍'}</span>`,iconSize:[30,30],iconAnchor:[15,15]});L.marker([lat,lon],{icon}).bindPopup(poiPopupHtml(p,name,type),{maxWidth:290}).addTo(group);count++;if(count>=180)break}group.addTo(mapInstance);mapLayers.pois=group;const legend=document.getElementById('poiLegend');if(legend)legend.innerHTML=`<strong>${count} puntos útiles cargados</strong><span>Agua · Salud · Dormir · Comer · Transporte · Suministros · teléfonos cuando están publicados</span>`;toast(count?`${count} servicios cargados`:'No hay servicios cargados para esta etapa')}
function bindMapToolbar(n){const topo=document.getElementById('topoBtn'),osm=document.getElementById('osmBtn'),route=document.getElementById('routeBtn'),pois=document.getElementById('poisBtn');if(topo)topo.onclick=()=>{if(mapLayers.osm&&mapInstance.hasLayer(mapLayers.osm))mapInstance.removeLayer(mapLayers.osm);if(mapLayers.topo&&!mapInstance.hasLayer(mapLayers.topo))mapLayers.topo.addTo(mapInstance);topo.classList.add('active');osm?.classList.remove('active')};if(osm)osm.onclick=()=>{if(mapLayers.topo&&mapInstance.hasLayer(mapLayers.topo))mapInstance.removeLayer(mapLayers.topo);if(mapLayers.osm&&!mapInstance.hasLayer(mapLayers.osm))mapLayers.osm.addTo(mapInstance);osm.classList.add('active');topo?.classList.remove('active')};if(route)route.onclick=()=>{routeVisible=!routeVisible;localStorage.setItem('camino-route-visible',routeVisible?'1':'0');if(mapLayers.route){if(routeVisible&&!mapInstance.hasLayer(mapLayers.route))mapLayers.route.addTo(mapInstance);if(!routeVisible&&mapInstance.hasLayer(mapLayers.route))mapInstance.removeLayer(mapLayers.route)}route.classList.toggle('active',routeVisible);route.textContent='🟨 RUTA '+(routeVisible?'ON':'OFF');toast(routeVisible?'Ruta visible':'Ruta oculta · mapa limpio')};if(pois)pois.onclick=()=>{if(!n){toast('Abre una etapa para ver servicios asociados.');return}showStagePois(n);pois.classList.toggle('active')}}

function currentStage(){const m=String(currentView).match(/^detail-(\d+)/);return m?STAGES.find(s=>s.n===Number(m[1])):null}
function reliefAdvice(s){if(!s)return 'Antes de salir, revisa distancia, desnivel y meteorología. En montaña, guarda margen de tiempo y evita atajos.';const ratio=s.gain/Math.max(s.km,1);if(s.gain>=900||ratio>=40)return `Etapa exigente: ${s.km.toFixed(1)} km y +${s.gain} m. Empieza conservador, usa pasos cortos en subida, extrema cuidado en descensos y no recortes por senderos no señalizados.`;if(s.gain>=500||ratio>=25)return `Etapa de relieve medio: ${s.km.toFixed(1)} km y +${s.gain} m. Reparte el esfuerzo, hidrátate con regularidad y reserva energía para el final.`;return `Etapa de relieve moderado: ${s.km.toFixed(1)} km y +${s.gain} m. Mantén ritmo cómodo y presta atención a firmes irregulares y cruces.`}
function doubtsMarkup(){const s=currentStage();return `
${s?`<div class="doubt-stage"><span>ETAPA ${s.n}</span><strong>${esc(s.from)} → ${esc(s.to)}</strong><p>${esc(reliefAdvice(s))}</p></div>`:''}
<details open><summary>⛰ Relieve y dificultad</summary><div class="doubt-copy"><p>Consulta el mapa topográfico, el desnivel y el tiempo antes de salir. En subidas, ritmo corto y constante; en bajadas, pasos controlados. Los bastones pueden ayudar si ya estás acostumbrado a usarlos.</p><p><strong>Alta montaña:</strong> con niebla, tormenta, hielo, viento fuerte o mala visibilidad, prioriza la ruta segura y las indicaciones oficiales.</p></div></details>
<details><summary>🥾 Calzado</summary><div class="doubt-copy"><p>Usa calzado cómodo, con buen agarre y ya adaptado a tu pie. No estrenes botas o zapatillas el primer día del Camino. Elige la protección y sujeción según terreno, estación y experiencia.</p><p>Lleva calcetines de recambio y cambia los húmedos cuanto antes.</p></div></details>
<details><summary>🎒 Peso de la mochila</summary><div class="doubt-copy"><p>Como referencia práctica, intenta no superar el <strong>10 % de tu peso corporal</strong> y evita cargar “por si acaso”. Spain.info recomienda además procurar no pasar de unos 7 kg cuando sea posible.</p><p>Coloca lo pesado cerca de la espalda y ajusta cinturón y pecho para repartir la carga.</p></div></details>
<details><summary>✅ Lo que llevar siempre</summary><div class="doubt-copy doubt-list"><span>💧 Agua / cantimplora</span><span>🌧 Chubasquero o capa</span><span>☀️ Protector solar + gorra</span><span>🩹 Botiquín pequeño</span><span>📱 Móvil + cargador / powerbank</span><span>🪪 DNI/pasaporte + tarjeta sanitaria</span><span>🟨 Credencial del peregrino</span><span>🧦 Calcetines secos de recambio</span><span>🔦 Luz pequeña</span><span>💳 Tarjeta + algo de efectivo</span></div></details>
<details><summary>🦶 Pies y rozaduras</summary><div class="doubt-copy"><p>Para pronto si notas un punto de roce; secar el pie y ajustar calcetín/calzado suele evitar que empeore. Si aparece una lesión importante, dolor intenso, infección o no puedes apoyar bien, busca atención sanitaria.</p></div></details>
<details><summary>🌦 Tiempo, agua y comida</summary><div class="doubt-copy"><p>Revisa la previsión antes de salir y adapta la etapa. Lleva agua suficiente entre puntos de abastecimiento y algo de comida fácil de transportar. Con calor, lluvia o frío, reduce el ritmo y evita apurar la jornada.</p></div></details>
<details><summary>🧭 Si dudas del camino</summary><div class="doubt-copy"><p>Detente y vuelve al último mojón o señal clara. No tomes atajos campo a través. Usa <strong>RUTA</strong> y <strong>GPS</strong> como apoyo, pero da prioridad a la señalización oficial y a las indicaciones locales.</p></div></details>
<div class="doubt-firstaid"><div><strong>🩹 Primeros auxilios</strong><span>Acceso a la guía oficial de Cruz Roja.</span></div><a href="https://www.cruzroja.es/guiaprevencion/primeros-auxilios.html" target="_blank" rel="noopener">ABRIR GUÍA</a></div><div class="doubt-emergency"><div><strong>⚠ ¿Es una emergencia?</strong><span>Accidente, peligro inmediato o persona desaparecida.</span></div><a href="tel:112">LLAMAR 112</a></div>
<p class="doubt-source">Consejos basados en recomendaciones oficiales del Camino de Santiago en Galicia y Spain.info. La ayuda de la app no sustituye indicaciones sanitarias, meteorológicas ni de emergencias.</p>`}
function openDoubts(){const b=document.getElementById('doubtsBackdrop');const body=document.getElementById('doubtsBody');if(!b||!body)return;body.innerHTML=doubtsMarkup();b.hidden=false;requestAnimationFrame(()=>b.classList.add('open'));document.body.classList.add('modal-open')}
function closeDoubts(){const b=document.getElementById('doubtsBackdrop');if(!b)return;b.classList.remove('open');document.body.classList.remove('modal-open');setTimeout(()=>{b.hidden=true},180)}

function openStageBigMap(n){
  detail(n,'mapa');
  setTimeout(()=>enterMapFullscreen(true),650);
}
function isViewportLandscape(){return window.innerWidth>window.innerHeight}
function setLandscapeDirection(dir='right'){
  document.body.classList.toggle('map-landscape-left',dir==='left');
  document.body.classList.toggle('map-landscape-right',dir!=='left');
}
function updateRotateButton(){
  const b=document.getElementById('rotateMapBtn');
  if(!b)return;
  const manual=document.body.classList.contains('map-manual-landscape');
  b.textContent=manual?'↺ VERTICAL':'↻ HORIZONTAL';
  b.classList.toggle('active',manual);
}
function applyManualLandscape(force,dir='right',auto=false){
  const should=typeof force==='boolean'?force:!document.body.classList.contains('map-manual-landscape');
  if(should)setLandscapeDirection(dir);
  document.body.classList.toggle('map-manual-landscape',should);
  document.body.classList.toggle('map-auto-landscape',should&&auto);
  if(!should)document.body.classList.remove('map-landscape-left','map-landscape-right','map-auto-landscape');
  updateRotateButton();
  setTimeout(()=>{try{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)}catch{}},80);
  setTimeout(()=>{try{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)}catch{}},360);
}
function toggleManualLandscape(){
  if(!mapFocusActive){enterMapFullscreen(true).then(()=>{if(!isViewportLandscape()&&!document.body.classList.contains('map-manual-landscape'))applyManualLandscape(true,'right',false)});return}
  if(isViewportLandscape()&&!document.body.classList.contains('map-manual-landscape')){toast('El teléfono ya está en horizontal.');return}
  const currentLeft=document.body.classList.contains('map-landscape-left');
  if(document.body.classList.contains('map-manual-landscape'))applyManualLandscape(false);
  else applyManualLandscape(true,currentLeft?'right':'right',false);
}
async function enterMapFullscreen(preferLandscape=false){
  const workspace=document.getElementById('mapWorkspace');
  const ws=workspace||document.querySelector('.map-shell');if(!ws)return;
  if(mapFocusActive){if(!preferLandscape){await exitMapFocus();return}}
  mapFocusActive=true;
  document.body.classList.add('map-focus');
  document.body.classList.toggle('map-global-focus',!workspace);
  const b=document.getElementById('fullscreenMapBtn');if(b)b.textContent='✕ SALIR';
  try{if(!document.fullscreenElement&&ws.requestFullscreen)await ws.requestFullscreen()}catch{}
  if(preferLandscape){try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch{}}
  // Fallback propio: si Android no cambia la geometría, rotamos el mapa nosotros.
  setTimeout(()=>{if(preferLandscape&&!isViewportLandscape())applyManualLandscape(true,'right',true);updateRotateButton();try{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)}catch{}},260);
  toast(preferLandscape?'Mapa grande · gira el teléfono; si Android no gira, BUEN CAMINO lo hace':'Mapa grande');
  setTimeout(()=>{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)},560)
}
async function exitMapFocus(){
  mapFocusActive=false;
  document.body.classList.remove('map-focus','map-manual-landscape','map-auto-landscape','map-global-focus','map-landscape-left','map-landscape-right');
  const b=document.getElementById('fullscreenMapBtn');if(b)b.textContent='⛶ MAPA GRANDE';updateRotateButton();
  try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen()}catch{}
  try{screen.orientation?.unlock?.()}catch{}
  setTimeout(()=>{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)},180)
}
function autoFocusLandscape(){
  const hasWorkspace=!!document.getElementById('mapWorkspace');
  const hasGlobalMap=currentView==='map'&&!!document.querySelector('.map-shell.map-mode');
  if(!hasWorkspace&&!hasGlobalMap)return;
  const landscape=isViewportLandscape();
  if(landscape&&!mapFocusActive){
    mapFocusActive=true;document.body.classList.add('map-focus');document.body.classList.toggle('map-global-focus',!hasWorkspace);
    const b=document.getElementById('fullscreenMapBtn');if(b)b.textContent='✕ SALIR';
    if(document.body.classList.contains('map-manual-landscape'))applyManualLandscape(false);
    updateRotateButton();setTimeout(()=>{mapInstance?.invalidateSize();updateRouteStyle(mapInstance)},220)
  }
  if(landscape&&document.body.classList.contains('map-manual-landscape'))applyManualLandscape(false);
}
function handlePhysicalOrientation(e){
  if(!mapFocusActive||isViewportLandscape())return;
  const g=Number(e.gamma);if(!Number.isFinite(g))return;
  const now=Date.now();if(now-physicalOrientationLast<260)return;
  if(Math.abs(g)>52&&Math.abs(g)<135){
    physicalOrientationLast=now;
    // gamma positiva/negativa identifica hacia qué lado se ha tumbado el teléfono.
    const dir=g>0?'right':'left';
    const needs=!document.body.classList.contains('map-manual-landscape') ||
      (dir==='left'&&!document.body.classList.contains('map-landscape-left')) ||
      (dir==='right'&&!document.body.classList.contains('map-landscape-right'));
    if(needs)applyManualLandscape(true,dir,true);
  }else if(Math.abs(g)<28&&document.body.classList.contains('map-auto-landscape')){
    physicalOrientationLast=now;applyManualLandscape(false);
  }
}
function locateUser(){if(!navigator.geolocation){toast('Este dispositivo no ofrece geolocalización.');return}toast('Solicitando GPS de alta precisión…');navigator.geolocation.getCurrentPosition(p=>{const {latitude,longitude,accuracy}=p.coords;if(mapInstance){const me=L.circleMarker([latitude,longitude],{radius:8,color:'#fff',weight:3,fillColor:'#0d6efd',fillOpacity:1}).addTo(mapInstance).bindPopup(`Estás aquí · precisión ±${Math.round(accuracy)} m`).openPopup();L.circle([latitude,longitude],{radius:accuracy,color:'#0d6efd',weight:1,fillOpacity:.06}).addTo(mapInstance);mapInstance.setView([latitude,longitude],15)}else{mapView();setTimeout(()=>locateUser(),650)}toast(`GPS localizado · ±${Math.round(accuracy)} m`)},()=>toast('No se pudo obtener la ubicación. Revisa permisos de ubicación.'),{enableHighAccuracy:true,timeout:12000,maximumAge:15000})}
function serviceSearch(type){if(type==='emergencia'){location.href='tel:112';return}if(type==='primeros_auxilios'){window.open('https://www.cruzroja.es/guiaprevencion/primeros-auxilios.html','_blank','noopener');return}if(type==='meteorología'){window.open('https://www.aemet.es/','_blank','noopener');return}const q=encodeURIComponent(type+' Camino de Santiago');window.open('https://www.openstreetmap.org/search?query='+q,'_blank','noopener')}
function bindFav(){document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.fav;favorites.has(id)?favorites.delete(id):favorites.add(id);save();b.classList.toggle('on',favorites.has(id));toast(favorites.has(id)?'Añadido a favoritos':'Eliminado de favoritos')})}
function bindStageCards(){document.querySelectorAll('[data-stage]').forEach(c=>{c.onclick=()=>detail(Number(c.dataset.stage));c.onkeydown=e=>{if(e.key==='Enter')c.click()}})}
function bindCommon(){bindStageCards();document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>serviceSearch(b.dataset.service));const w=document.getElementById('whereBtn');if(w)w.onclick=locateUser}
function navigate(v){if(v==='home')home();else if(v==='stages')stages();else if(v==='map')mapView();else if(v==='favorites')favoritesView();else if(v==='mycamino')myCamino()}

document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.querySelector('.brand').onclick=home;
document.getElementById('doubtsBtn').onclick=openDoubts;document.getElementById('closeDoubts').onclick=closeDoubts;document.getElementById('doubtsBackdrop').addEventListener('click',e=>{if(e.target.id==='doubtsBackdrop')closeDoubts()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDoubts()});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&mapFocusActive){mapFocusActive=false;document.body.classList.remove('map-focus','map-manual-landscape','map-auto-landscape','map-global-focus','map-landscape-left','map-landscape-right');const b=document.getElementById('fullscreenMapBtn');if(b)b.textContent='⛶ MAPA GRANDE'}setTimeout(()=>mapInstance?.invalidateSize(),180)});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const b=document.getElementById('installBtn');b.hidden=false;b.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;b.hidden=true}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const refreshMapSize=()=>setTimeout(()=>{try{mapInstance?.invalidateSize()}catch{}},180);
window.addEventListener('resize',()=>{refreshMapSize();setTimeout(autoFocusLandscape,120)});
window.addEventListener('orientationchange',()=>{refreshMapSize();setTimeout(autoFocusLandscape,220)});
try{screen.orientation?.addEventListener?.('change',()=>{refreshMapSize();setTimeout(autoFocusLandscape,180)})}catch{}
window.addEventListener('deviceorientation',handlePhysicalOrientation,{passive:true});
document.addEventListener('click',e=>{const b=e.target.closest?.('.poi-contact-load');if(b){e.preventDefault();loadPoiContact(b)}});
home();
