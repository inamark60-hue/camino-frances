const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
const focusOverlay=document.getElementById('focusOverlay');
let currentView='home', currentStageNo=null, currentDetailTab='resumen', mainMap=null, focusMap=null, terrain3DMap=null, terrain3DOverlay=null, routeVisible=localStorage.getItem('bc-route')!=='0';
let featureReturn=null,compassHandler=null,compassFallbackHandler=null,compassNoDataTimer=null,compassUpdateTarget=null,compassSmoothedHeading=null,compassSource=null,compassAbsoluteSeen=false,compassCalibrationHandler=null,skyTimer=null,skyLocation=null,bikeRouteCurrent=null,walkRouteCurrent=null,skyOrientationHandler=null,skyFallbackOrientationHandler=null,skyGpsWatch=null,skyCompassCtrl=null,skyTrackActive=false,skyOrientationState=null,skyFullOverlay=null,skyFullCompassCtrl=null,skyFullReturnScroll=0,skyNormalCompassResume=false,skyBodyOverflow='';
let mainMapCompass=null,focusMapCompass=null,mapCompassActive=null,mapCompassResume=null,mapCompassPosition=(()=>{try{const p=JSON.parse(localStorage.getItem('bc-map-compass-pos')||'null');return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))}:{x:.82,y:.08}}catch(_){return{x:.82,y:.08}}})();
const favorites=new Set(JSON.parse(localStorage.getItem('bc-favs')||'[]'));
const doneStages=new Set(JSON.parse(localStorage.getItem('bc-done')||'[]').map(Number));
const likedStages=new Set(JSON.parse(localStorage.getItem('bc-likes')||'[]').map(Number));
const stageVisitCounts=JSON.parse(localStorage.getItem('bc-stage-visits')||'{}');
const sessionStageViews=new Set(JSON.parse(sessionStorage.getItem('bc-stage-viewed')||'[]').map(Number));
let appVisitCount=Number(localStorage.getItem('bc-app-visits')||0);
if(!sessionStorage.getItem('bc-app-visit-counted')){appVisitCount+=1;localStorage.setItem('bc-app-visits',String(appVisitCount));sessionStorage.setItem('bc-app-visit-counted','1');}
const comments=JSON.parse(localStorage.getItem('bc-comments')||'[]');
const APP_DIRECT_URL=()=>new URL('./',location.href).href.split('#')[0];
const DONATION_CREATOR='Ignacio Marquiegui';
const DONATION_URL='https://www.savethechildren.es/donacion-ong/donacion';
let deferredInstallPrompt=null;
const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
const PILGRIMAGE_BASE='https://cdn.jsdelivr.net/gh/walktalkmeditate/open-pilgrimages@v1/routes/camino-frances';
const PILGRIMAGE_RAW='https://raw.githubusercontent.com/walktalkmeditate/open-pilgrimages/main/routes/camino-frances';
let pilgrimageStagesPromise=null,pilgrimageRoutePromise=null,pilgrimageWaypointsPromise=null;
const stageRouteCache=new Map(),stageServicesCache=new Map();

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=s=>{toastEl.textContent=s;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),2400)};
const save=()=>{localStorage.setItem('bc-favs',JSON.stringify([...favorites]));localStorage.setItem('bc-done',JSON.stringify([...doneStages]));localStorage.setItem('bc-likes',JSON.stringify([...likedStages]));localStorage.setItem('bc-stage-visits',JSON.stringify(stageVisitCounts));localStorage.setItem('bc-comments',JSON.stringify(comments));};
const mapsUrl=(lat,lon)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat+','+lon)}`;
const directionsUrl=(lat,lon)=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lon)}&travelmode=walking`;
const directionsFromUrl=(olat,olon,dlat,dlon)=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(olat+','+olon)}&destination=${encodeURIComponent(dlat+','+dlon)}&travelmode=walking`;
const AEMET_STAGE1='https://www.aemet.es/es/eltiempo/prediccion/municipios/grafica/todas/orreaga-roncesvalles-id31211';
const earthUrl=(lat,lon)=>`https://earth.google.com/web/search/${encodeURIComponent(lat+','+lon)}`;
const osmUrl=(lat,lon,z=16)=>`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${z}/${lat}/${lon}`;
const commonsNearbyUrl=(lat,lon)=>`https://commons.wikimedia.org/wiki/Special:Nearby#/coord/${lat},${lon}`;
const aemetUrl=n=>n===1?AEMET_STAGE1:'https://www.aemet.es/es/eltiempo/prediccion/municipios';
const googleImageSearchUrl=x=>`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${x.name||''} ${x.address||''}`)}`;
const stageEarthUrl=n=>{const s=STAGES[Math.max(0,Number(n)-1)]||{};return `https://earth.google.com/web/search/${encodeURIComponent(`${s.from||''} ${s.to||''} Camino Francés`)}`};
const wholeCaminoEarthUrl=()=>`https://earth.google.com/web/search/${encodeURIComponent('Camino Francés Saint-Jean-Pied-de-Port Santiago de Compostela')}`;
const wikilocStageUrl=n=>{const s=STAGES[Math.max(0,Number(n)-1)]||{};return `https://es.wikiloc.com/wikiloc/find.do?q=${encodeURIComponent(`Camino Francés ${s.from||''} ${s.to||''}`)}`};
function openStageEarth(n){window.open(stageEarthUrl(n),'_blank','noopener')}
function openStageWikiloc(n){window.open(wikilocStageUrl(n),'_blank','noopener')}
const publicSearchUrl=x=>`https://www.google.com/search?q=${encodeURIComponent(`${x.name||''} ${x.address||''} teléfono web horario`)}`;
const xmlEsc=s=>String(s??'').replace(/[<>&\"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','\"':'&quot;',"'":'&apos;'}[c]));
const safeFile=s=>String(s||'ruta').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();
function downloadBlob(name,content,type){const b=new Blob([content],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function wmoText(c){c=Number(c);if(c===0)return'Despejado';if([1,2,3].includes(c))return'Nubes variables';if([45,48].includes(c))return'Niebla';if([51,53,55,56,57].includes(c))return'Llovizna';if([61,63,65,66,67,80,81,82].includes(c))return'Lluvia';if([71,73,75,77,85,86].includes(c))return'Nieve';if([95,96,99].includes(c))return'Tormenta';return'Tiempo variable'}
async function stageWeatherPosition(n){try{const meta=(await pilgrimageStages())?.stages?.[n-1],c=stageMetaCoord(meta,'end');if(c)return{lat:c[1],lon:c[0]}}catch{}const local=localRoute(n);if(local?.length)return{lat:local.at(-1)[0],lon:local.at(-1)[1]};const r=stageRouteCache.get(n);if(r?.length)return{lat:r.at(-1)[0],lon:r.at(-1)[1]};return null}
async function loadStageWeather(n){const host=document.getElementById('stageWeatherPanel');if(!host)return;host.innerHTML='<div class="weather-loading">🌦 Cargando tiempo de la etapa…</div>';try{const pos=await stageWeatherPosition(n);if(!pos)throw 0;const u=`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability&forecast_days=1&timezone=auto`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json(),c=j.current||{},times=j.hourly?.time||[],pp=j.hourly?.precipitation_probability||[];let start=Math.max(0,times.findIndex(t=>t>=String(c.time||'').slice(0,13)));if(start<0)start=0;const rain=Math.max(0,...pp.slice(start,start+7).map(Number).filter(Number.isFinite));host.innerHTML=`<div class="weather-title"><div><b>🌦 Tiempo de etapa</b><span>${esc(wmoText(c.weather_code))} · destino</span></div><a href="${aemetUrl(n)}" target="_blank" rel="noopener">AEMET oficial ↗</a></div><div class="weather-grid"><div><strong>${Math.round(c.temperature_2m??0)}°</strong><span>Temperatura</span></div><div><strong>${rain}%</strong><span>Lluvia próx. 6 h</span></div><div><strong>${Math.round(c.wind_speed_10m??0)}</strong><span>Viento km/h</span></div><div><strong>${Math.round(c.wind_gusts_10m??0)}</strong><span>Rachas km/h</span></div></div><small>Datos rápidos: Open-Meteo. Para avisos y predicción oficial consulta AEMET antes de salir.</small>`}catch{host.innerHTML=`<div class="weather-title"><div><b>🌦 Meteorología</b><span>Datos rápidos no disponibles</span></div><a href="${aemetUrl(n)}" target="_blank" rel="noopener">Abrir AEMET ↗</a></div><small>Consulta siempre la predicción y los avisos oficiales antes de una etapa de montaña.</small>`}}
function gpxText(s,route,services=[]){const pts=route.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}">${Number.isFinite(+p[2])?`<ele>${+p[2]}</ele>`:''}</trkpt>`).join('');const w=services.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).map(x=>`<wpt lat="${x.lat}" lon="${x.lon}"><name>${xmlEsc(x.name)}</name><type>${xmlEsc(x.type)}</type>${x.phone?`<desc>${xmlEsc('Tel. '+x.phone)}</desc>`:''}</wpt>`).join('');return`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="BUEN CAMINO" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xmlEsc(`${s.from} - ${s.to}`)}</name></metadata>${w}<trk><name>${xmlEsc(`${s.from} → ${s.to}`)}</name><trkseg>${pts}</trkseg></trk></gpx>`}
function kmlText(s,route){const coords=route.map(p=>`${p[1]},${p[0]},${Number.isFinite(+p[2])?+p[2]:0}`).join(' ');return`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(`${s.from} - ${s.to}`)}</name><Placemark><name>${xmlEsc(`${s.from} → ${s.to}`)}</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`}
function tcxText(s,route){const pts=route.map((p,i)=>`<Trackpoint><Time>${new Date(Date.now()+i*1000).toISOString()}</Time><Position><LatitudeDegrees>${p[0]}</LatitudeDegrees><LongitudeDegrees>${p[1]}</LongitudeDegrees></Position>${Number.isFinite(+p[2])?`<AltitudeMeters>${+p[2]}</AltitudeMeters>`:''}</Trackpoint>`).join('');return`<?xml version="1.0" encoding="UTF-8"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Courses><Course><Name>${xmlEsc(`BC Etapa ${s.n}`)}</Name><Track>${pts}</Track></Course></Courses></TrainingCenterDatabase>`}
async function prepareRouteDownload(n,fmt,withServices=false){const s=STAGES[n-1];toast('Preparando trazado preciso…');const route=(await remoteStageRoute(n))||localRoute(n);if(!route?.length){toast('No se pudo preparar el trazado de esta etapa');return}const base=`buen-camino-etapa-${String(n).padStart(2,'0')}-${safeFile(s.from)}-${safeFile(s.to)}`;if(fmt==='gpx'){const services=withServices?await servicesForStage(n):[];downloadBlob(base+(withServices?'-servicios':'')+'.gpx',gpxText(s,route,services),'application/gpx+xml')}else if(fmt==='kml')downloadBlob(base+'.kml',kmlText(s,route),'application/vnd.google-earth.kml+xml');else downloadBlob(base+'.tcx',tcxText(s,route),'application/vnd.garmin.tcx+xml');toast('⬇ Ruta preparada')}
function openRouteDownloads(n){const s=STAGES[n-1],title=document.getElementById('doubtsTitle');if(title)title.textContent=`Descargar ruta · Etapa ${n}`;document.getElementById('doubtsBody').innerHTML=`<div class="download-sheet"><p><b>${esc(s.from)} → ${esc(s.to)}</b></p><p class="map-note">Archivos creados con el trazado más preciso disponible. GPX es compatible con la mayoría de GPS y puede importarse en Wikiloc.</p><button data-dl="gpx">⬇ GPX · GPS / Wikiloc</button><button data-dl="gpx-services">📌 GPX + servicios</button><button data-dl="kml">🌍 KML · Google Earth</button><button data-dl="tcx">⌚ TCX · GPS deportivo</button><div class="download-note">Comprueba siempre señalización, avisos y posibles cambios del Camino sobre el terreno. La descarga no sustituye una fuente oficial de seguridad.</div></div>`;document.getElementById('doubtsBackdrop').hidden=false;document.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>{const v=b.dataset.dl;prepareRouteDownload(n,v==='gpx-services'?'gpx':v,v==='gpx-services')})}
async function fetchPilgrimageJson(file){
 const urls=[`${PILGRIMAGE_BASE}/${file}`,`${PILGRIMAGE_RAW}/${file}`];
 let lastErr=null;
 for(const url of urls){try{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));return await r.json()}catch(e){lastErr=e}}
 throw lastErr||new Error('Datos no disponibles');
}
function pilgrimageStages(){return pilgrimageStagesPromise||(pilgrimageStagesPromise=fetchPilgrimageJson('stages.json').catch(e=>{pilgrimageStagesPromise=null;throw e}))}
function pilgrimageRoute(){return pilgrimageRoutePromise||(pilgrimageRoutePromise=fetchPilgrimageJson('route.geojson').catch(e=>{pilgrimageRoutePromise=null;throw e}))}
function pilgrimageWaypoints(){return pilgrimageWaypointsPromise||(pilgrimageWaypointsPromise=fetchPilgrimageJson('waypoints.geojson').catch(e=>{pilgrimageWaypointsPromise=null;throw e}))}
function locText(v){if(v==null)return'';if(typeof v==='string'||typeof v==='number')return String(v);if(typeof v==='object')return String(v.es||v.en||v.fr||v.name||Object.values(v).find(x=>typeof x==='string')||'');return''}
function placeCoord(v){if(!v)return null;let c=null;if(Array.isArray(v))c=v;else c=v.coordinates||v.coordinate||v.location?.coordinates||v.geometry?.coordinates;if(Array.isArray(c)&&c.length>=2){const a=+c[0],b=+c[1];if(Number.isFinite(a)&&Number.isFinite(b))return Math.abs(a)<=90&&Math.abs(b)<=180?[a,b]:null}const lat=+(v.lat??v.latitude),lon=+(v.lon??v.lng??v.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)?[lon,lat]:null}

// Utilidades de geometría para las 33 etapas. En V6.0 faltaban estas dos funciones,
// por lo que las rutas remotas no podían procesarse después de la etapa 1.
function geoLines(gj){
 const out=[];
 const visit=g=>{
  if(!g)return;
  if(g.type==='FeatureCollection'){(g.features||[]).forEach(f=>visit(f));return;}
  if(g.type==='Feature'){visit(g.geometry);return;}
  if(g.type==='GeometryCollection'){(g.geometries||[]).forEach(visit);return;}
  if(g.type==='LineString'&&Array.isArray(g.coordinates)){out.push(g.coordinates);return;}
  if(g.type==='MultiLineString'&&Array.isArray(g.coordinates)){g.coordinates.forEach(l=>{if(Array.isArray(l))out.push(l)});}
 };
 visit(gj);return out;
}
function routeKm(route){let km=0;for(let i=1;i<(route||[]).length;i++)km+=havKm(route[i-1],route[i]);return km;}
const STAGE_ROUTE_OVERRIDES={
 18:{start:[-4.866,42.355],end:[-5.2186688,42.4222853]},
 19:{start:[-5.2186688,42.4222853],end:[-5.415,42.498]}
};
function lineEndpointDist(line,c){if(!line?.length||!c)return Infinity;const d=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;return Math.min(d(line[0],c),d(line.at(-1),c))}
function stitchGeoRoute(gj,startCoord){let lines=geoLines(gj).filter(l=>l.length>1).map(l=>l.slice());if(!lines.length)return[];let first=0,best=Infinity;for(let i=0;i<lines.length;i++){const d=lineEndpointDist(lines[i],startCoord);if(d<best){best=d;first=i}}let cur=lines.splice(first,1)[0];const d0=(cur[0][0]-startCoord[0])**2+(cur[0][1]-startCoord[1])**2,d1=(cur.at(-1)[0]-startCoord[0])**2+(cur.at(-1)[1]-startCoord[1])**2;if(d1<d0)cur.reverse();let out=cur.slice();while(lines.length){const tail=out.at(-1);let bi=0,rev=false,bd=Infinity;for(let i=0;i<lines.length;i++){const a=lines[i][0],b=lines[i].at(-1),da=(a[0]-tail[0])**2+(a[1]-tail[1])**2,db=(b[0]-tail[0])**2+(b[1]-tail[1])**2;if(da<bd){bd=da;bi=i;rev=false}if(db<bd){bd=db;bi=i;rev=true}}let nxt=lines.splice(bi,1)[0];if(rev)nxt.reverse();if(nxt.length&&out.length&&Math.abs(nxt[0][0]-out.at(-1)[0])+Math.abs(nxt[0][1]-out.at(-1)[1])<1e-8)nxt=nxt.slice(1);out.push(...nxt)}return out}
function stageMetaCoord(meta,key){const p=meta?.[key];return placeCoord(p)||placeCoord(p?.location)||placeCoord(p?.point)||placeCoord(meta?.[`${key}Coordinates`])}
async function remoteStageRoute(n){if(stageRouteCache.has(n))return stageRouteCache.get(n);try{const [stagesData,gj]=await Promise.all([pilgrimageStages(),pilgrimageRoute()]);const arr=stagesData?.stages||[],meta=arr[n-1];if(!meta)throw 0;const ov=STAGE_ROUTE_OVERRIDES[n];const start=ov?.start||stageMetaCoord(meta,'start'),end=ov?.end||stageMetaCoord(meta,'end');if(!start||!end)throw 0;const full=stitchGeoRoute(gj,start);if(full.length<100)throw 0;const near=(target)=>{let bi=0,bd=Infinity;for(let i=0;i<full.length;i++){const c=full[i],d=(c[0]-target[0])**2+(c[1]-target[1])**2;if(d<bd){bd=d;bi=i}}return bi};let a=near(start),b=near(end);let coords=a<=b?full.slice(a,b+1):full.slice(b,a+1).reverse();let route=coords.map(c=>[+c[1],+c[0],Number.isFinite(+c[2])?+c[2]:null]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));const km=routeKm(route),expected=+(STAGES[n-1]?.km||meta.distanceKm||0);if(route.length<12||!Number.isFinite(km)||km<Math.max(2,expected*.45)||km>expected*1.9)throw 0;stageRouteCache.set(n,route);return route}catch(e){console.warn('Ruta etapa no disponible',n,e);return null}}
async function upgradeStageRoute(n,map){if(!map)return;const route=await remoteStageRoute(n);if(!map.el?.isConnected)return;if(!route?.length){map.msg.textContent=`Etapa ${n}: no se pudo cargar el trazado preciso`;map.msg.style.display='block';setTimeout(()=>{if(map.msg)map.msg.style.display='none'},2800);return;}map.setRoute(route,true);map.el.dispatchEvent(new CustomEvent('bc-route-upgraded'));loadMotorways(map,route);toast(`Etapa ${n}: ruta precisa cargada`)}
function normalizeWaypoint(f,n){const p=f?.properties||{},tags=p.tags||p.osmTags||{},c=f?.geometry?.coordinates;if(!Array.isArray(c)||c.length<2)return null;const lat=+c[1],lon=+c[0];if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;const raw=String(p.type||'').toLowerCase(),sub=String(p.subtype||p.category||tags.amenity||tags.shop||tags.tourism||'').toLowerCase();let type='';if(raw==='accommodation')type='alojamiento';else if(raw==='food')type='comer';else if(raw==='water_source')type='agua';else if(raw==='medical')type=(sub.includes('pharmacy')||tags.amenity==='pharmacy')?'farmacia':'salud';else if(raw==='transport')type=(sub.includes('taxi')||tags.amenity==='taxi')?'taxi':'transporte';else if(raw==='information'||raw==='credential_stamp')type='informacion';else if(raw==='supply'){if(tags.amenity==='toilets'||sub.includes('toilet'))type='wc';else if(tags.amenity==='atm'||sub.includes('atm'))type='cajero';else if(sub.includes('bicycle')||tags.shop==='bicycle')type='bici';else type='tienda'}else return null;const name=locText(p.name)||locText(p.title)||locText(tags.name)||`${serviceIcon(type)} Servicio`;const phone=locText(p.phone||p.contactPhone||tags.phone||tags['contact:phone']||tags['contact:mobile']);const phone2=locText(p.phone2||tags.mobile);const website=locText(p.website||p.url||tags.website||tags['contact:website']);const email=locText(p.email||tags.email||tags['contact:email']);const hours=locText(p.openingHours||p.hours||tags.opening_hours);const parts=[tags['addr:street'],tags['addr:housenumber'],tags['addr:postcode'],tags['addr:city']||tags['addr:place']].filter(Boolean);const address=locText(p.address)||parts.join(' ');const osmId=locText(p.osmId||p.osm_id||p.osm);const osmExact=osmId&&osmId.includes('/')?`https://www.openstreetmap.org/${osmId}`:'';const details={subtype:locText(p.subtype||p.category||tags.tourism||tags.amenity||tags.shop),operator:locText(p.operator||tags.operator),description:locText(p.description||tags.description),charge:locText(p.charge||tags.charge||tags.fee),beds:locText(p.beds||tags.beds),rooms:locText(p.rooms||tags.rooms),stars:locText(p.stars||tags.stars),cuisine:locText(p.cuisine||tags.cuisine),internet:locText(p.internet||tags.internet_access||tags.wifi),wheelchair:locText(p.wheelchair||tags.wheelchair),reservation:locText(p.reservation||tags.reservation||tags.booking),facebook:locText(tags['contact:facebook']||tags.facebook),instagram:locText(tags['contact:instagram']||tags.instagram)};return{type,name,lat,lon,km:Number.isFinite(+p.kmFromStart)?+p.kmFromStart:null,phone,phone2,website,email,hours,address,note:p.source==='osm'?'Datos de OpenStreetMap · comprueba horarios y disponibilidad.':'Punto de interés del Camino Francés.',osmId,osmExact,details,stage:n}}
async function remoteStageServices(n){if(stageServicesCache.has(n))return stageServicesCache.get(n);try{const gj=await pilgrimageWaypoints(),items=(gj?.features||[]).filter(f=>Number(f?.properties?.stageIndex)===n-1).map(f=>normalizeWaypoint(f,n)).filter(Boolean);stageServicesCache.set(n,items);return items}catch{return[]}}


const stageLiveServicesCache=new Map();

function routeKmForPoint(route,lat,lon){
 if(!route?.length)return null;
 let km=0,bestKm=0,best=Infinity;
 for(let i=1;i<route.length;i++){
  const seg=havKm(route[i-1],route[i]);
  km+=seg;
  if(i%4===0||i===route.length-1){
   const d=havKm([lat,lon],route[i]);
   if(d<best){best=d;bestKm=km}
  }
 }
 return bestKm;
}
function normalizeStageOsmElement(e,n,route){
 const t=e?.tags||{},lat=Number(e?.lat??e?.center?.lat),lon=Number(e?.lon??e?.center?.lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const amen=String(t.amenity||'').toLowerCase(),tour=String(t.tourism||'').toLowerCase(),shop=String(t.shop||'').toLowerCase(),pub=String(t.public_transport||'').toLowerCase();
 let type='';
 if(['hotel','hostel','guest_house','alpine_hut','chalet','camp_site','motel','apartment'].includes(tour))type='alojamiento';
 else if(['restaurant','cafe','bar','fast_food','food_court','pub'].includes(amen))type='comer';
 else if(amen==='drinking_water')type='agua';
 else if(amen==='police')type='policia';
 else if(amen==='pharmacy')type='farmacia';
 else if(['hospital','clinic','doctors','dentist'].includes(amen))type='salud';
 else if(amen==='toilets')type='wc';
 else if(amen==='atm')type='cajero';
 else if(amen==='taxi')type='taxi';
 else if(['bus_station','ferry_terminal'].includes(amen)||pub||t.highway==='bus_stop'||t.railway==='station')type='transporte';
 else if(shop==='bicycle')type='bici';
 else if(shop)type='tienda';
 else if(tour==='information'||t.information)type='informacion';
 else return null;

 const parts=[t['addr:street'],t['addr:housenumber'],t['addr:postcode'],t['addr:city']||t['addr:place']].filter(Boolean);
 const name=t.name||t.brand||t.operator||nearbyTypeLabel(type);
 const phone=t.phone||t['contact:phone']||t['contact:mobile']||'';
 const phone2=t.mobile||'';
 const website=t.website||t['contact:website']||'';
 const email=t.email||t['contact:email']||'';
 const hours=t.opening_hours||'';
 const details={
  subtype:tour||amen||shop||t.information||'',
  operator:t.operator||'',
  description:t.description||'',
  charge:t.charge||t.fee||'',
  beds:t.beds||'',
  rooms:t.rooms||'',
  stars:t.stars||'',
  cuisine:t.cuisine||'',
  internet:t.internet_access||t.wifi||'',
  wheelchair:t.wheelchair||'',
  reservation:t.reservation||t.booking||'',
  ownership:t.ownership||t.operator_type||'',
  credentialStamp:t['pilgrim_stamp']||t['passport_stamp']||t.stamp||t['credential:stamp']||t.credential||''
 };
 return {
  type,name,lat,lon,km:routeKmForPoint(route,lat,lon),phone,phone2,website,email,hours,
  address:parts.join(' '),note:'Datos en vivo de OpenStreetMap · confirma disponibilidad y horarios.',
  osmExact:`https://www.openstreetmap.org/${e.type}/${e.id}`,details,stage:n,liveOsm:true
 };
}
async function fetchStageOsmServices(n){
 if(stageLiveServicesCache.has(n))return stageLiveServicesCache.get(n);
 try{
  const route=(await remoteStageRoute(n))||localRoute(n);
  if(!route?.length)throw 0;
  const sampleCount=6,pts=[];
  for(let i=0;i<sampleCount;i++){
   const idx=Math.round((route.length-1)*i/(sampleCount-1)),p=route[idx];
   if(p)pts.push(p);
  }
  const radius=3200;
  const selectors=pts.map(p=>{
   const lat=Number(p[0]).toFixed(6),lon=Number(p[1]).toFixed(6),a=`around:${radius},${lat},${lon}`;
   return [
    `nwr(${a})["tourism"~"^(hotel|hostel|guest_house|alpine_hut|chalet|camp_site|motel|apartment)$"];`,
    `nwr(${a})["amenity"~"^(restaurant|cafe|bar|pub|fast_food|food_court|drinking_water|police|pharmacy|hospital|clinic|doctors|dentist|toilets|atm|taxi|bus_station|ferry_terminal)$"];`,
    `nwr(${a})["shop"~"^(supermarket|convenience|general|outdoor|sports|bicycle|bakery|deli|greengrocer|clothes|chemist)$"];`,
    `nwr(${a})["tourism"="information"];`,
    `nwr(${a})["public_transport"];`,
    `nwr(${a})["railway"="station"];`
   ].join('');
  }).join('');
  const q=`[out:json][timeout:14];(${selectors});out center 450;`;
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let data=null,last=null;
  for(const ep of endpoints){
   try{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12500);
    const r=await fetch(ep+'?data='+encodeURIComponent(q),{signal:ctrl.signal,cache:'no-store'});
    clearTimeout(timer);
    if(!r.ok)throw new Error(String(r.status));
    data=await r.json();break;
   }catch(e){last=e}
  }
  if(!data)throw last||0;
  const raw=(data.elements||[]).map(e=>normalizeStageOsmElement(e,n,route)).filter(Boolean);
  const seen=new Set(),items=[];
  for(const x of raw){
   const k=`${x.type}|${String(x.name).toLowerCase()}|${x.lat.toFixed(4)}|${x.lon.toFixed(4)}`;
   if(!seen.has(k)){seen.add(k);items.push(x)}
  }
  stageLiveServicesCache.set(n,items);
  return items;
 }catch(e){
  console.warn('Servicios OSM de etapa no disponibles',n,e);
  stageLiveServicesCache.set(n,[]);
  return [];
 }
}

function serviceSearchText(x){
 const d=x?.details||{};
 return [
  x?.name,x?.type,x?.address,x?.note,x?.hours,
  d.subtype,d.description,d.operator,d.cuisine,d.reservation
 ].filter(Boolean).join(' ').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function isInstitutionalAlbergue(x){
 if(x?.type!=='alojamiento')return false;
 const t=serviceSearchText(x);
 return /\b(municipal|publico|publica|public|xunta|xacobeo|junta|gobierno|cabildo|colegiata|parroquial|parish|monasterio|monastery|convento|convent|hospital de peregrinos|asociacion de amigos|association des amis)\b/.test(t);
}
function credentialStampState(x){
 const d=x?.details||{},raw=String(d.credentialStamp||'').toLowerCase();
 if(/^(yes|si|sí|true|available|stamp)$/.test(raw)||/sello|stamp/.test(raw))return {verified:true,text:'✓ Sello de credencial indicado'};
 if(/^(no|false|none)$/.test(raw))return {verified:true,text:'Sin sello indicado'};
 if(isPilgrimAlbergue(x))return {verified:false,text:'🐚 Sello de credencial: confirmar en recepción'};
 return null;
}
function serviceLogoUrl(x){
 if(!x?.website)return '';
 try{return `${new URL(x.website).origin}/favicon.ico`}catch{return ''}
}
function decoratePilgrimAlbergue(x){
 const institutional=isInstitutionalAlbergue(x),stamp=credentialStampState(x);
 return {...x,pilgrimAlbergue:true,institutionalAlbergue:institutional,credentialStampInfo:stamp,
  specialIcon:'🐚',
  specialBadge:institutional?'🏛 Público / institucional':'🐚 Albergue del Camino'};
}
function isPilgrimAlbergue(x){
 if(x?.type!=='alojamiento')return false;
 const t=serviceSearchText(x);
 return /\b(albergue|hostel|refugio|refuge|auberge|gite|pilgrim|peregrin|xacobeo|jacobeo)\b/.test(t);
}
function isPilgrimMenu(x){
 if(!['comer','alojamiento'].includes(x?.type))return false;
 const t=serviceSearchText(x);
 return /(menu\s+(del\s+)?peregrin|pilgrim'?s?\s+menu|menu\s+pilgrim)/.test(t);
}
function pilgrimMenuSearchUrl(x,n){
 const s=STAGES[Math.max(0,Number(n)-1)]||{};
 const q=[x?.name,x?.address,s.from,s.to,'menú peregrino'].filter(Boolean).join(' ');
 return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
function specialServiceItems(all,mode){
 if(mode==='albergues'){
  const exact=all.filter(isPilgrimAlbergue).map(decoratePilgrimAlbergue)
   .sort((a,b)=>(Number(b.institutionalAlbergue)-Number(a.institutionalAlbergue))||((a.km??9999)-(b.km??9999)));
  const fallback=all.filter(x=>x.type==='alojamiento').sort((a,b)=>(a.km??9999)-(b.km??9999))
   .map(x=>({...x,specialIcon:'🛏',specialBadge:'Alojamiento de la ruta'}));
  return {items:exact.length?exact:fallback,verified:exact.length>0,exactCount:exact.length,
    institutionalCount:exact.filter(x=>x.institutionalAlbergue).length};
 }
 if(mode==='menu'){
  const exact=all.filter(isPilgrimMenu).sort((a,b)=>(a.km??9999)-(b.km??9999));
  const candidates=all.filter(x=>x.type==='comer'&&!isPilgrimMenu(x)).sort((a,b)=>(a.km??9999)-(b.km??9999));
  const exactRows=exact.map(x=>({...x,specialIcon:'🍲',specialBadge:'✓ Menú peregrino indicado',pilgrimMenuVerified:true}));
  const candidateRows=candidates.slice(0,35).map(x=>({...x,specialIcon:'🍴',specialBadge:'Confirmar menú peregrino',pilgrimMenuSearch:true}));
  return {items:exactRows.length?[...exactRows,...candidateRows]:candidateRows,verified:exactRows.length>0,exactCount:exactRows.length};
 }
 return {items:all,verified:true,exactCount:all.length};
}
async function showSpecialServiceMap(n,mode){
 const all=await servicesForStage(n),pack=specialServiceItems(all,mode);
 const items=pack.items.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).slice(0,120);
 detail(n,'mapa');
 setTimeout(()=>{
  if(!mainMap)return;
  mainMap.clearServices();
  mainMap.addServices(items);
  toast(mode==='albergues'?`${items.length} albergues/alojamientos en ruta`:`${items.length} lugares para menú peregrino`);
 },180);
}
async function showSpecialServiceList(n,mode){
 const host=document.getElementById('serviceResults');if(!host)return;
 host.innerHTML='<div class="empty">Cargando datos del Camino…</div>';
 const all=await servicesForStage(n);if(!host.isConnected)return;
 const pack=specialServiceItems(all,mode),items=pack.items;
 if(mode==='albergues'){
  if(!items.length){host.innerHTML='<div class="empty"><b>No aparecen alojamientos en los datos abiertos de esta etapa.</b></div>';return}
  const official=items.filter(x=>x.institutionalAlbergue),other=items.filter(x=>!x.institutionalAlbergue);
  host.innerHTML=`<div class="pilgrim-special-head albergue"><div><b>🐚 ALBERGUES DEL CAMINO</b><span>${pack.verified?`${pack.exactCount} albergues/refugios identificados · ${pack.institutionalCount||0} públicos/institucionales`:'Se muestran alojamientos de la ruta para confirmar'}</span></div><button id="specialMapBtn">🎯 VER EN MAPA</button></div>`
   +`<div class="credential-info"><b>🐚 Credencial y Compostela</b><span>Cuando un albergue indica sello de credencial se marca expresamente. Si ese dato no consta, verás “confirmar en recepción”. Conserva los sellos de tu credencial para la acreditación final en Santiago.</span></div>`
   +(official.length?`<div class="official-albergue-title">🏛 PÚBLICOS / INSTITUCIONALES</div>${official.map(serviceCard).join('')}`:'')
   +(other.length?`<div class="official-albergue-title secondary">🐚 OTROS ALBERGUES DEL CAMINO</div>${other.slice(0,70).map(serviceCard).join('')}`:'')
   +`<p class="data-source-note">La etiqueta público/institucional solo aparece cuando el nombre, operador o datos abiertos permiten identificarlo. Confirma plazas, horarios, precio y sello antes de llegar.</p>`;
 }else{
  const exact=items.filter(x=>x.pilgrimMenuVerified),candidates=items.filter(x=>x.pilgrimMenuSearch);
  const s=STAGES[n-1]||{};
  host.innerHTML=`<div class="pilgrim-special-head menu"><div><b>🍲 MENÚ PEREGRINO</b><span>${exact.length?`${exact.length} lugares indican menú de peregrino`:'No consta un menú de peregrino verificado en los datos abiertos de esta etapa'}</span></div><button id="specialMapBtn">📍 VER EN MAPA</button></div>`
   +(exact.length?`<div class="verified-menu-title">✓ MENÚ PEREGRINO INDICADO</div>${exact.map(serviceCard).join('')}`:'')
   +(candidates.length?`<div class="candidate-menu-title">🍴 RESTAURANTES DE LA ETAPA · CONFIRMAR MENÚ</div>${candidates.map(serviceCard).join('')}`:'')
   +`<a class="stage-menu-search" href="https://www.google.com/search?q=${encodeURIComponent(`menú peregrino ${s.from||''} ${s.to||''}`)}" target="_blank" rel="noopener">🔎 Buscar “menú peregrino” en esta etapa</a>`
   +`<p class="data-source-note">La etiqueta “✓ Menú peregrino indicado” solo se muestra cuando aparece expresamente en los datos disponibles. En los demás restaurantes conviene preguntar o confirmar antes de desplazarse.</p>`;
 }
 document.getElementById('specialMapBtn')?.addEventListener('click',()=>showSpecialServiceMap(n,mode));
}

async function servicesForStage(n){
 const local=LOCAL_SERVICES[n]||[];
 const [remote,live]=await Promise.all([remoteStageServices(n),fetchStageOsmServices(n)]);
 const seen=new Set(),out=[];
 for(const x of [...local,...remote,...live]){
  const k=(x.name||'').toLowerCase()+'|'+x.type;
  if(!seen.has(k)){seen.add(k);out.push(x)}
 }
 return out.sort((a,b)=>(a.km??9999)-(b.km??9999));
}
async function fetchCommonsNearbyPhotos(lat,lon,radius=2200){
 const api='https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&generator=geosearch&ggsnamespace=6&ggsradius='+encodeURIComponent(radius)+'&ggslimit=30&ggscoord='+encodeURIComponent(lat+'|'+lon)+'&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=520';
 const r=await fetch(api,{cache:'force-cache'});if(!r.ok)throw new Error('Commons '+r.status);
 const j=await r.json(),pages=Object.values(j?.query?.pages||{}),photos=[];
 for(const page of pages){
  const ii=page?.imageinfo?.[0],md=ii?.extmetadata||{},license=stripHtmlText(md.LicenseShortName?.value||md.UsageTerms?.value||'');
  if(!ii?.thumburl||!/(cc\s*by|cc0|public domain|pd-|gfdl|free art)/i.test(license))continue;
  photos.push({key:String(page.pageid||page.title||ii.thumburl),thumb:ii.thumburl,page:ii.descriptionurl||('https://commons.wikimedia.org/wiki/'+encodeURIComponent(String(page.title||'').replace(/ /g,'_'))),title:String(page.title||'').replace(/^File:/,''),artist:stripHtmlText(md.Artist?.value||md.Credit?.value||'Autor no indicado'),license,licenseUrl:md.LicenseUrl?.value||''});
 }
 return photos;
}
async function loadNearbyPhoto(lat,lon,host){
 if(!host)return;host.innerHTML='<span class="photo-loading">📷 Buscando varias fotos cercanas libres…</span>';
 try{
  let photos=await fetchCommonsNearbyPhotos(lat,lon,2200);
  if(photos.length<5){try{photos=[...photos,...await fetchCommonsNearbyPhotos(lat,lon,6500)]}catch{}}
  const seen=new Set();photos=photos.filter(p=>p?.thumb&&!seen.has(p.key)&&(seen.add(p.key),true)).slice(0,10);
  if(!photos.length)throw 0;
  host.innerHTML=`<div class="route-photo-scroll" role="region" aria-label="Fotos cercanas de Wikimedia Commons">${photos.map((p,i)=>`<figure><a href="${esc(p.page)}" target="_blank" rel="noopener"><img src="${esc(p.thumb)}" alt="Foto cercana ${i+1} del Camino" loading="lazy"></a><figcaption><b>${esc(p.title||'Foto cercana')}</b><span>${esc(p.artist)}</span><a href="${esc(p.licenseUrl||p.page)}" target="_blank" rel="noopener">${esc(p.license)}</a></figcaption></figure>`).join('')}</div><small class="route-photo-swipe">← Desliza las fotos con el dedo →</small><small class="route-photo-license">Wikimedia Commons · solo archivos con licencia libre o dominio público según sus metadatos. Conserva la atribución indicada.</small>`;
 }catch{host.innerHTML=`<a class="photo-nearby-link" href="${commonsNearbyUrl(lat,lon)}" target="_blank" rel="noopener">📷 Ver fotos cercanas en Wikimedia Commons</a>`;}
}


const NEARBY_SERVICE_FILTERS=[
 ['todos','Todos','📌'],['alojamiento','Albergues / dormir','🥾'],['comer','Comer','🍴'],['agua','Agua','💧'],['policia','Policía','👮'],['farmacia','Farmacia','✚'],['salud','Salud','❤'],['tienda','Tiendas','🛒'],['wc','WC','🚻'],['cajero','Cajero','🏧'],['transporte','Transporte','🚌']
];
const nearbyServiceCache=new Map();
function bearingDeg(aLat,aLon,bLat,bLon){const r=Math.PI/180,p1=aLat*r,p2=bLat*r,dl=(bLon-aLon)*r,y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return(Math.atan2(y,x)*180/Math.PI+360)%360}
function compassDirection(deg){const names=['N','NE','E','SE','S','SO','O','NO'];return names[Math.round(deg/45)%8]}
function distanceText(km){return km<1?`${Math.max(1,Math.round(km*1000))} m`:`${km.toFixed(km<10?1:0)} km`}
function nearbyTypeLabel(type){return({alojamiento:'Alojamiento',comer:'Comer',agua:'Agua potable',policia:'Policía',farmacia:'Farmacia',salud:'Salud',tienda:'Tienda',wc:'WC',cajero:'Cajero',transporte:'Transporte',taxi:'Taxi'})[type]||'Servicio'}
function normalizeNearbyElement(e){const t=e?.tags||{},lat=Number(e?.lat??e?.center?.lat),lon=Number(e?.lon??e?.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;let type='';const amen=String(t.amenity||'').toLowerCase(),tour=String(t.tourism||'').toLowerCase(),shop=String(t.shop||'').toLowerCase(),pub=String(t.public_transport||'').toLowerCase();if(['hotel','hostel','guest_house','alpine_hut','chalet','camp_site'].includes(tour))type='alojamiento';else if(['restaurant','cafe','bar','fast_food','food_court'].includes(amen))type='comer';else if(amen==='drinking_water')type='agua';else if(amen==='police')type='policia';else if(amen==='pharmacy')type='farmacia';else if(['hospital','clinic','doctors','dentist'].includes(amen))type='salud';else if(shop)type='tienda';else if(amen==='toilets')type='wc';else if(amen==='atm')type='cajero';else if(amen==='taxi')type='taxi';else if(['bus_station','ferry_terminal'].includes(amen)||pub||t.highway==='bus_stop'||t.railway==='station')type='transporte';else return null;const parts=[t['addr:street'],t['addr:housenumber'],t['addr:postcode'],t['addr:city']||t['addr:place']].filter(Boolean);const name=t.name||t.brand||t.operator||nearbyTypeLabel(type);return{type,name,lat,lon,address:parts.join(' '),phone:t.phone||t['contact:phone']||t['contact:mobile']||'',website:t.website||t['contact:website']||'',hours:t.opening_hours||'',osmExact:`https://www.openstreetmap.org/${e.type}/${e.id}`}}
async function fetchNearbyOsm(lat,lon,radius=2500){const key=`${lat.toFixed(4)},${lon.toFixed(4)},${radius}`;if(nearbyServiceCache.has(key))return nearbyServiceCache.get(key);const q=`[out:json][timeout:10];(nwr(around:${radius},${lat},${lon})["tourism"~"^(hotel|hostel|guest_house|alpine_hut|chalet|camp_site)$"];nwr(around:${radius},${lat},${lon})["amenity"~"^(restaurant|cafe|bar|fast_food|food_court|drinking_water|police|pharmacy|hospital|clinic|doctors|dentist|toilets|atm|taxi|bus_station|ferry_terminal)$"];nwr(around:${radius},${lat},${lon})["shop"];nwr(around:${radius},${lat},${lon})["public_transport"];nwr(around:${radius},${lat},${lon})["highway"="bus_stop"];nwr(around:${radius},${lat},${lon})["railway"="station"];);out center 80;`;const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let last=null;for(const ep of endpoints){try{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000),r=await fetch(ep+'?data='+encodeURIComponent(q),{signal:ctrl.signal,cache:'no-store'});clearTimeout(timer);if(!r.ok)throw new Error(String(r.status));const j=await r.json(),items=(j.elements||[]).map(normalizeNearbyElement).filter(Boolean);const seen=new Set(),dedup=[];for(const x of items){const k=`${x.type}|${String(x.name).toLowerCase()}|${x.lat.toFixed(4)}|${x.lon.toFixed(4)}`;if(!seen.has(k)){seen.add(k);dedup.push(x)}}nearbyServiceCache.set(key,dedup);return dedup}catch(e){last=e}}throw last||new Error('Sin datos')}
async function fallbackNearbyStageServices(stage,lat,lon){const items=await servicesForStage(stage||1);return items.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)&&havKm([lat,lon],[x.lat,x.lon])<=8)}
function renderNearbyList(host,items,originLat,originLon,filter='todos'){const rows=items.map(x=>({...x,_km:havKm([originLat,originLon],[x.lat,x.lon])})).filter(x=>filter==='todos'||x.type===filter).sort((a,b)=>a._km-b._km).slice(0,35);if(!rows.length){host.innerHTML='<div class="empty">No aparecen servicios de esta categoría cerca de este punto.</div>';return}host.innerHTML=rows.map(x=>{const dir=compassDirection(bearingDeg(originLat,originLon,x.lat,x.lon)),icon=serviceIcon(x.type),addr=x.address?`<small>📍 ${esc(x.address)}</small>`:'',hours=x.hours?`<small>🕒 ${esc(x.hours)}</small>`:'',phone=x.phone?`<small>📞 ${esc(x.phone)}</small>`:'';return`<article class="nearby-card"><div class="nearby-main"><span class="nearby-symbol">${icon}</span><div><b>${esc(x.name)}</b><small>${esc(nearbyTypeLabel(x.type))} · <strong>${distanceText(x._km)} al ${dir}</strong></small>${addr}${hours}${phone}</div></div><div class="nearby-actions">${x.phone?`<a class="call" href="tel:${String(x.phone).replace(/\s/g,'')}">📞 Llamar</a>`:''}${x.website?`<a href="${esc(x.website)}" target="_blank" rel="noopener">🌐 Web</a>`:''}<a class="go" href="${directionsFromUrl(originLat,originLon,x.lat,x.lon)}" target="_blank" rel="noopener">🚶 Ir desde este punto</a><a href="${directionsUrl(x.lat,x.lon)}" target="_blank" rel="noopener">📍 Ir desde mi ubicación</a><a href="${mapsUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🗺 Mapa</a><a href="${earthUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🌍 Earth</a><a href="${googleImageSearchUrl(x)}" target="_blank" rel="noopener">📷 Fotos</a>${x.osmExact?`<a href="${esc(x.osmExact)}" target="_blank" rel="noopener">OSM</a>`:''}</div></article>`}).join('')}
async function openNearbyServices(originLat,originLon,stage){const title=document.getElementById('doubtsTitle');if(title)title.textContent='Servicios cerca del punto';const body=document.getElementById('doubtsBody');body.innerHTML=`<div class="nearby-origin"><b>🟨 Punto de ruta</b><span>${originLat.toFixed(5)}, ${originLon.toFixed(5)}</span><small>Distancia y dirección se calculan desde este punto amarillo. “Ir desde mi ubicación” usa la posición actual del móvil al abrir Maps.</small></div><div class="nearby-filter-row">${NEARBY_SERVICE_FILTERS.map(x=>`<button data-nearby-filter="${x[0]}" class="${x[0]==='todos'?'active':''}">${x[2]} ${x[1]}</button>`).join('')}</div><div id="nearbyResults"><div class="empty">📡 Buscando alojamientos, agua, policía, salud, tiendas y otros servicios…</div></div>`;document.getElementById('doubtsBackdrop').hidden=false;let items=[];try{items=await fetchNearbyOsm(originLat,originLon,2500)}catch{}if(!items.length){items=await fallbackNearbyStageServices(stage,originLat,originLon);toast('Mostrando servicios de etapa como respaldo')}const host=document.getElementById('nearbyResults');if(!host||!host.isConnected)return;renderNearbyList(host,items,originLat,originLon,'todos');document.querySelectorAll('[data-nearby-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-nearby-filter]').forEach(x=>x.classList.toggle('active',x===b));renderNearbyList(host,items,originLat,originLon,b.dataset.nearbyFilter)})}

const STAGE1_ELEVATION_ANCHORS=[
 [43.163668,-1.234870,170.2],[43.152103,-1.242169,265.0],[43.139785,-1.240182,324.4],[43.129554,-1.242366,344.7],
 [43.121261,-1.243408,521.9],[43.115917,-1.237614,726.2],[43.104260,-1.239437,867.0],[43.091490,-1.243935,973.9],
 [43.084113,-1.252092,1086.2],[43.077655,-1.262482,1094.2],[43.068260,-1.269020,1189.7],[43.057277,-1.266668,1231.1],
 [43.047190,-1.264913,1321.4],[43.041941,-1.276306,1247.4],[43.036433,-1.290694,1340.9],[43.028320,-1.295898,1450.0],
 [43.027185,-1.295453,1412.7],[43.026167,-1.305500,1277.4],[43.023584,-1.313762,1188.4],[43.020342,-1.321249,1073.3],
 [43.014461,-1.317398,982.3],[43.008475,-1.319832,953.8]
];

// Datos locales verificados para que Servicios siga siendo útil aunque falle Internet.
// Se ampliarán etapa por etapa; no se inventan teléfonos ni webs.
const LOCAL_SERVICES={1:[
 {type:'alojamiento',name:'Gîte Kayola',lat:43.11780,lon:-1.23810,km:6.4,phone:'+33 6 38 26 97 38',website:'https://www.refuge-orisson.com/',address:'RD 428 · Saint-Michel',note:'Alojamiento de etapa. Reserva recomendable.'},
 {type:'alojamiento',name:'Refuge Orisson',lat:43.1088654,lon:-1.2391822,km:8.0,phone:'+33 6 38 26 97 38',phone2:'+33 5 59 49 13 03',website:'https://www.refuge-orisson.com/',email:'refuge.orisson@wanadoo.fr',address:'RD 428 · Uhart-Cize',note:'Refugio y restaurante en la Ruta de Napoleón.'},
 {type:'alojamiento',name:'Auberge Borda',lat:43.1014507,lon:-1.2389313,km:9.0,phone:'+33 6 61 92 97 43',website:'https://www.aubergeborda.com/',email:'aubergeborda@gmail.com',address:'D428 GR65 · Saint-Michel',hours:'Recepción 14:30–21:00',note:'Alojamiento de montaña con media pensión.'},
 {type:'alojamiento',name:'Albergue de Peregrinos de Roncesvalles',lat:43.0099872,lon:-1.3216338,km:24.2,phone:'+34 948 760 000',phone2:'+34 948 760 029',website:'https://www.alberguederoncesvalles.com/',email:'info@alberguederoncesvalles.com',address:'Real Colegiata · Roncesvalles',note:'Albergue de peregrinos de la Real Colegiata.'},
 {type:'comer',name:'Refuge Orisson · Restaurante',lat:43.1088654,lon:-1.2391822,km:8.0,phone:'+33 6 38 26 97 38',website:'https://www.refuge-orisson.com/',address:'RD 428 · Uhart-Cize',note:'Restaurante del refugio.'},
 {type:'comer',name:'Casa Sabina · Restaurante',lat:43.0102,lon:-1.3195,km:24.2,phone:'+34 948 760 012',website:'https://casasabina.roncesvalles.es/',email:'casasabina@roncesvalles.es',address:'N-135 s/n · Roncesvalles',note:'Bar, restaurante y menú del peregrino.'},
 {type:'farmacia',name:'Pharmacie Arreguy Olaizola',phone:'+33 5 59 37 02 81',address:'27 place Charles de Gaulle · Saint-Jean-Pied-de-Port',query:'Pharmacie Arreguy Olaizola Saint-Jean-Pied-de-Port'},
 {type:'farmacia',name:'Pharmacie NAFARROA',phone:'+33 5 59 37 01 36',address:'7 avenue Jaï Alai · Saint-Jean-Pied-de-Port',query:'Pharmacie NAFARROA Saint-Jean-Pied-de-Port'},
 {type:'salud',name:'Clinique médico-chirurgical Luro',phone:'+33 5 59 37 00 55',address:'Bourg · 64220 Ispoure',website:'https://www.eps-garazi.fr/',query:'Clinique Luro Ispoure'},
 {type:'informacion',name:'Accueil des pèlerins',phone:'+33 5 59 37 05 09',address:'39 rue de la Citadelle · Saint-Jean-Pied-de-Port',website:'https://www.st-jean-pied-de-port.fr/decouvrir/sur-le-chemin-de-st-jacques/',note:'Credencial, sello e información al peregrino.'},
 {type:'informacion',name:'Office de Tourisme',phone:'+33 5 59 37 03 57',address:'14 place Charles de Gaulle · Saint-Jean-Pied-de-Port',website:'https://www.st-jean-pied-de-port.fr/tourisme/office-de-tourisme/'},
 {type:'ayuntamiento',name:'Mairie de Saint-Jean-Pied-de-Port',phone:'+33 5 59 37 00 92',address:'13 place Charles de Gaulle · Saint-Jean-Pied-de-Port',website:'https://www.st-jean-pied-de-port.fr/'},
 {type:'ayuntamiento',name:'Real Colegiata de Roncesvalles · atención al peregrino',phone:'+34 948 760 000',address:'Roncesvalles · Navarra',website:'https://roncesvalles.es/'},
]};

const SERVICE_TYPES=[
 ['🛏','alojamiento','Dormir'],['🍴','comer','Comer'],['💧','agua','Agua'],['✚','farmacia','Farmacia'],['❤','salud','Salud'],['🚕','taxi','Taxi'],
 ['👮','policia','Policía'],['🚌','transporte','Bus/Tren'],['🛒','tienda','Tienda'],['🏧','cajero','Cajero'],['🚻','wc','WC'],['🚲','bici','Bicicleta'],['🟨','informacion','Credencial / info'],['🏛','ayuntamiento','Ayuntamiento']
];


function stageVisits(n){return Number(stageVisitCounts[n]||0)}
function stageLikes(n){return likedStages.has(n)?1:0}
function recordStageVisit(n){n=Number(n);if(sessionStageViews.has(n))return;sessionStageViews.add(n);sessionStorage.setItem('bc-stage-viewed',JSON.stringify([...sessionStageViews]));stageVisitCounts[n]=stageVisits(n)+1;save()}
function shareAppWhatsApp(){const url=APP_DIRECT_URL();const text=`BUEN CAMINO · Guía gratuita del Camino Francés\n${url}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener')}
function openComments(){
 const title=document.getElementById('doubtsTitle');if(title)title.textContent='Comentarios de BUEN CAMINO';
 const rows=comments.slice().sort((a,b)=>b.ts-a.ts).map(c=>`<article class="comment-row"><div><strong>${esc(c.name||'Peregrino')}</strong><small>${new Date(c.ts).toLocaleString('es-ES')}</small></div><p>${esc(c.text)}</p><button data-comment-del="${esc(c.id)}">Eliminar</button></article>`).join('');
 document.getElementById('doubtsBody').innerHTML=`<div class="community-note">Los comentarios se guardan en este dispositivo. Así BUEN CAMINO sigue siendo gratuito y no envía tus datos a un servidor.</div><form id="commentForm" class="comment-form"><input id="commentName" maxlength="40" placeholder="Nombre o alias (opcional)"><textarea id="commentText" maxlength="500" required placeholder="Escribe tu comentario…"></textarea><button type="submit">💬 AÑADIR COMENTARIO</button></form><div id="commentList">${rows||'<div class="empty">Todavía no hay comentarios en este dispositivo.</div>'}</div>`;
 document.getElementById('doubtsBackdrop').hidden=false;
 document.getElementById('commentForm').onsubmit=e=>{e.preventDefault();const text=document.getElementById('commentText').value.trim(),name=document.getElementById('commentName').value.trim();if(!text)return;comments.push({id:`c-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,text,ts:Date.now()});save();openComments();toast('Comentario guardado')};
 document.querySelectorAll('[data-comment-del]').forEach(b=>b.onclick=()=>{const i=comments.findIndex(c=>c.id===b.dataset.commentDel);if(i>=0){comments.splice(i,1);save();openComments();}});
}
function photoDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('buen-camino-community',1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('photos')){const st=db.createObjectStore('photos',{keyPath:'id'});st.createIndex('stage','stage')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function photosForStage(stage){const db=await photoDb();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly'),idx=tx.objectStore('photos').index('stage'),r=idx.getAll(Number(stage));r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>b.ts-a.ts));r.onerror=()=>reject(r.error)})}
async function compressPhoto(file){
 try{const bmp=await createImageBitmap(file),max=1280,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bmp,0,0,w,h);bmp.close?.();return await new Promise(res=>c.toBlob(b=>res(b||file),'image/jpeg',.82))}catch(e){return file}
}
async function addStagePhoto(stage,file){if(!file||!file.type?.startsWith('image/')){toast('Selecciona una imagen');return}const blob=await compressPhoto(file),db=await photoDb();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put({id:`p-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,stage:Number(stage),blob,name:file.name||'foto',ts:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});toast('📷 Foto añadida a la etapa')}
async function deleteStagePhoto(id){const db=await photoDb();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function openStagePhotos(stage){
 const s=STAGES.find(x=>x.n===Number(stage)),title=document.getElementById('doubtsTitle');if(title)title.textContent=`Fotos · Etapa ${stage}`;
 const items=await photosForStage(stage);const html=items.map(x=>{const u=URL.createObjectURL(x.blob);return `<figure class="user-photo"><img src="${u}" alt="Foto de la etapa ${stage}"><figcaption>${new Date(x.ts).toLocaleDateString('es-ES')}</figcaption><div><button data-photo-share="${esc(x.id)}">↗ Compartir</button><button data-photo-del="${esc(x.id)}">Eliminar</button></div></figure>`}).join('');
 document.getElementById('doubtsBody').innerHTML=`<div class="community-note">Tus fotos se guardan en este dispositivo. No se publican en Internet automáticamente.</div><label class="photo-add">📷 AÑADIR FOTO<input id="stagePhotoInput" type="file" accept="image/*" capture="environment"></label><p class="map-note">${esc(s?.from||'')} → ${esc(s?.to||'')}</p><div class="user-photo-grid">${html||'<div class="empty">Aún no has añadido fotos a esta etapa.</div>'}</div>`;
 document.getElementById('doubtsBackdrop').hidden=false;
 document.getElementById('stagePhotoInput').onchange=async e=>{const f=e.target.files?.[0];if(f){await addStagePhoto(stage,f);openStagePhotos(stage)}};
 document.querySelectorAll('[data-photo-del]').forEach(b=>b.onclick=async()=>{await deleteStagePhoto(b.dataset.photoDel);openStagePhotos(stage)});
 document.querySelectorAll('[data-photo-share]').forEach(b=>b.onclick=async()=>{const all=await photosForStage(stage),x=all.find(p=>p.id===b.dataset.photoShare);if(!x)return;const f=new File([x.blob],x.name||`buen-camino-etapa-${stage}.jpg`,{type:x.blob.type||'image/jpeg'});try{if(navigator.canShare?.({files:[f]})){await navigator.share({title:`BUEN CAMINO · Etapa ${stage}`,text:`${s.from} → ${s.to}`,files:[f]});return}}catch(e){}toast('Tu navegador no permite compartir esta foto directamente')});
}
async function renderStagePhotoPreview(stage){const host=document.getElementById('stagePhotoPreview');if(!host)return;try{const items=await photosForStage(stage);host.innerHTML=items.length?`<div class="photo-preview-strip">${items.slice(0,4).map(x=>`<img src="${URL.createObjectURL(x.blob)}" alt="Foto de usuario">`).join('')}</div><button id="manageStagePhotos" class="photo-manage">📷 Ver / añadir fotos (${items.length})</button>`:`<button id="manageStagePhotos" class="photo-manage">📷 Añadir fotos de esta etapa</button>`;document.getElementById('manageStagePhotos').onclick=()=>openStagePhotos(stage)}catch(e){host.innerHTML='<button id="manageStagePhotos" class="photo-manage">📷 Añadir fotos de esta etapa</button>';document.getElementById('manageStagePhotos').onclick=()=>openStagePhotos(stage)}}

function setActive(k){
 document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===k));
 const top=document.getElementById('doubtsBtn');
 if(!top)return;
 if(k==='home'){
  top.hidden=false;
  top.classList.add('earth-home-btn');
  top.innerHTML='<b>🌍</b> EARTH';
  top.title='Abrir el Camino Francés en Google Earth';
  top.onclick=()=>window.open(wholeCaminoEarthUrl(),'_blank','noopener');
 }else{
  top.hidden=true;
  top.onclick=null;
 }
}
function stageCard(s){
 const liked=likedStages.has(s.n),fav=favorites.has('stage-'+s.n);
 return `<article class="stage-card" data-stage="${s.n}">
  <div class="num">${s.n}</div>
  <div class="stage-card-copy"><h3>${esc(s.from)} → ${esc(s.to)}</h3><div class="meta">${s.km.toFixed(1)} km · ${s.h} · ${esc(s.difficulty)}</div><div class="social-meta">👍 ${stageLikes(s.n)} · 👁 ${stageVisits(s.n)} ${fav?'· ♥ favorita':''}</div>
   <div class="stage-route-links">
    <button data-earth-stage="${s.n}" title="Ver zona de la etapa en Google Earth">🌍 <b>EARTH</b></button>
    <button data-wikiloc-stage="${s.n}" title="Buscar esta etapa en Wikiloc">🟢 <b>WIKILOC</b></button>
    <button data-download-stage="${s.n}" title="Descargar GPX/KML/TCX">⬇ <b>GPS</b></button>
    <button class="internal-feature walk" data-feature-stage="walk" data-feature-stage-no="${s.n}" title="Ruta a pie de esta etapa">🚶 <b>A PIE</b></button>
    <button class="internal-feature bike" data-feature-stage="bike" data-feature-stage-no="${s.n}" title="Ruta ciclista de esta etapa">🚴 <b>BICI</b></button>
    <button class="internal-feature compass" data-feature-stage="compass" data-feature-stage-no="${s.n}" title="Abrir brújula sin salir de la app">🧭 <b>BRÚJULA</b></button>
    <button class="internal-feature sky" data-feature-stage="sky" data-feature-stage-no="${s.n}" title="Estrellas y constelaciones de esta etapa">✨ <b>CIELO</b></button>
   </div>
  </div>
  <div class="stage-card-actions">
   <button class="mini-fav ${fav?'active':''}" data-fav-stage="${s.n}" aria-label="${fav?'Quitar de':'Añadir a'} favoritos etapa ${s.n}" aria-pressed="${fav}">${fav?'♥':'♡'}</button>
   <button class="mini-like ${liked?'active':''}" data-like-stage="${s.n}" aria-label="Me gusta etapa ${s.n}" aria-pressed="${liked}">👍 <small>${stageLikes(s.n)}</small></button>
   <button class="mini-share" data-share-stage="${s.n}" aria-label="Compartir etapa ${s.n}">↗</button>
  </div>
 </article>`;
}


/* ---------- V8.2 · Herramientas internas, cielo y mapas ---------- */
function bindFeatureButtons(){
 document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=e=>{e.stopPropagation();const n=Number(b.dataset.featureNo);openFeature(b.dataset.feature,Number.isFinite(n)&&n>=1?n:null)});
}
function rememberFeatureReturn(){featureReturn={view:currentView,stage:currentStageNo,tab:currentDetailTab,scrollY:window.scrollY||0};}
function restoreFeatureScroll(r){const y=Math.max(0,Number(r?.scrollY)||0);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'})));}
function stopCompassSensors(){
 if(compassHandler){window.removeEventListener('deviceorientationabsolute',compassHandler,true);compassHandler=null;}
 if(compassFallbackHandler){window.removeEventListener('deviceorientation',compassFallbackHandler,true);compassFallbackHandler=null;}
 if(compassCalibrationHandler){window.removeEventListener('compassneedscalibration',compassCalibrationHandler,true);compassCalibrationHandler=null;}
 clearTimeout(compassNoDataTimer);compassNoDataTimer=null;compassUpdateTarget=null;compassSmoothedHeading=null;compassSource=null;compassAbsoluteSeen=false;
}
function stopFeatureSensors(){
 stopCompassSensors();
 clearInterval(skyTimer);skyTimer=null;
 if(skyOrientationHandler){window.removeEventListener('deviceorientationabsolute',skyOrientationHandler,true);skyOrientationHandler=null;}
 if(skyFallbackOrientationHandler){window.removeEventListener('deviceorientation',skyFallbackOrientationHandler,true);skyFallbackOrientationHandler=null;}
 if(skyOrientationEvent._raf){cancelAnimationFrame(skyOrientationEvent._raf);skyOrientationEvent._raf=0;}
 if(skyGpsWatch!=null&&navigator.geolocation){try{navigator.geolocation.clearWatch(skyGpsWatch)}catch{}skyGpsWatch=null;}
 if(skyFullCompassCtrl){try{deactivateMapCompass(skyFullCompassCtrl,true)}catch{}skyFullCompassCtrl=null;}
 if(skyFullOverlay?.isConnected)skyFullOverlay.remove();skyFullOverlay=null;document.body.classList.remove('sky-full-open');if(skyBodyOverflow!==undefined)document.body.style.overflow=skyBodyOverflow||'';
 skyTrackActive=false;skyOrientationState=null;skyCompassCtrl=null;skyNormalCompassResume=false;
}
function returnFromFeature(){
 const r=featureReturn;featureReturn=null;stopFeatureSensors();
 if(r?.view?.startsWith('detail-')){detail(Number(r.stage)||Number((r.view.match(/\d+/)||[])[0])||1,r.tab||'resumen');restoreFeatureScroll(r);return}
 if(r?.view==='stages'){stages();restoreFeatureScroll(r);return}if(r?.view==='map'){mapView();restoreFeatureScroll(r);return}if(r?.view==='favorites'){favoritesView();restoreFeatureScroll(r);return}if(r?.view==='mycamino'){myCamino();restoreFeatureScroll(r);return}home();restoreFeatureScroll(r);
}
function featureShell(icon,title,subtitle,content){
 app.innerHTML=`<section class="feature-view"><header class="feature-head"><nav class="feature-head-actions" aria-label="Navegación de herramienta"><button id="featureBack" class="feature-back" type="button" aria-label="Volver a la ventana anterior">← <span>ANTERIOR</span></button><button id="featureHome" class="feature-home" type="button" aria-label="Ir al Inicio de BUEN CAMINO">🏠 <span>INICIO</span></button></nav><div><span>${icon} HERRAMIENTA</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></header>${content}</section>`;
 document.getElementById('featureBack').onclick=returnFromFeature;
 document.getElementById('featureHome').onclick=()=>{featureReturn=null;home();};
}
function openFeature(kind,stage=null){
 rememberFeatureReturn();cleanupMaps();currentView=`feature-${kind}`;currentStageNo=stage||null;setActive('none');
 if(kind==='walk')openWalkFeature(stage);else if(kind==='bike')openBikeFeature(stage);else if(kind==='compass')openCompassFeature(stage);else openSkyFeature(stage);
}
function featureStageOptions(selected=1,icon=''){return STAGES.map(s=>`<option value="${s.n}" ${s.n===selected?'selected':''}>${icon?icon+' ':''}${s.n}. ${esc(s.from)} → ${esc(s.to)}</option>`).join('')}

async function loadWalkStage(n){
 n=Number(n)||1;const host=document.getElementById('walkMap'),status=document.getElementById('walkStatus'),meta=document.getElementById('walkMeta');if(!host||!status)return;
 mainMap?.destroy?.();mainMap=null;walkRouteCurrent=null;host.innerHTML='<div class="feature-loading">🚶 Preparando ruta a pie…</div>';status.className='feature-status loading';status.innerHTML='<b>Cargando el trazado del Camino</b><span>Se usa el recorrido de la etapa, no una ruta genérica entre dos puntos.</span>';if(meta)meta.textContent='';
 const route=(await remoteStageRoute(n))||localRoute(n);if(!host.isConnected)return;if(!route?.length){status.className='feature-status warning';status.innerHTML='<b>No hay trazado disponible</b><span>Conecta el móvil a Internet y vuelve a intentarlo. BUEN CAMINO no inventa una ruta si faltan datos.</span>';host.innerHTML='<div class="empty">Ruta no disponible en este momento.</div>';return}
 host.innerHTML='';mainMap=new BCMap(host,{lat:route[0][0],lon:route[0][1],zoom:11,layer:'topo'});mainMap.stageNo=n;mainMap.setRoute(route,true);mainMap.setRouteVisible(true);mainMap.setTravelMode('walk');walkRouteCurrent=route;
 const s=STAGES[n-1],km=routeKm(route);if(meta)meta.innerHTML=`<strong>${km.toFixed(1)} km</strong><span>${esc(s.from)} → ${esc(s.to)}</span><small>Camino Francés · trazado de la etapa</small>`;
 const compBtn=document.getElementById('walkCompass');if(compBtn)mainMapCompass=attachMapCompass(mainMap,compBtn);
 servicesForStage(n).then(items=>{if(mainMap?.el?.isConnected&&mainMap.stageNo===n){const useful=items.filter(x=>Number.isFinite(x.lat)).slice(0,120);mainMap.addServices(useful);const c=document.getElementById('walkServicesCount');if(c)c.textContent=`${useful.length} servicios disponibles en los datos de la etapa`;}}).catch(()=>{});
 status.className='feature-status ok';status.innerHTML='<b>✓ Ruta a pie cargada</b><span>Sigue las flechas y mojones físicos del Camino. Desvíos, obras o cierres reales prevalecen sobre el trazado digital.</span>';
}
function openWalkFeature(stage=null){
 const n=Number(stage)||1,s=STAGES[n-1];featureShell('🚶','Ruta a pie',stage?`Etapa ${n} · ${s.from} → ${s.to}`:'Elige una etapa del Camino Francés',`<section class="feature-body"><div class="feature-control-card"><label for="walkStageSelect">ETAPA</label><select id="walkStageSelect" class="feature-select">${featureStageOptions(n,'🚶')}</select><div id="walkMeta" class="feature-meta"></div><div class="feature-inline-tools"><button id="walkCompass" class="feature-tool-small map-compass-toggle" type="button">🧭 BRÚJULA</button></div></div><div id="walkStatus" class="feature-status loading"></div><div id="walkMap" class="bc-map feature-map"></div><div id="walkServicesCount" class="feature-footnote">Cargando servicios de la etapa…</div><div class="feature-safety"><b>🚶 Ruta a pie</b><p>Este mapa representa el Camino de la etapa. Usa la señalización amarilla del terreno como referencia principal y comprueba avisos, cierres, obras y meteorología antes de salir.</p></div></section>`);
 const sel=document.getElementById('walkStageSelect');sel.onchange=()=>{currentStageNo=+sel.value;loadWalkStage(+sel.value)};setTimeout(()=>loadWalkStage(n),0);
}

function bikeGeoRoute(j){
 const f=j?.type==='FeatureCollection'?j.features?.find(x=>x?.geometry):j?.type==='Feature'?j:null,g=f?.geometry||j?.geometry;if(!g)return[];
 let coords=g.type==='LineString'?g.coordinates:g.type==='MultiLineString'?g.coordinates.flat():[];
 return coords.map(c=>[Number(c[1]),Number(c[0]),Number.isFinite(Number(c[2]))?Number(c[2]):null]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
}
async function brouterBikeRoute(caminoRoute){
 if(!caminoRoute?.length)throw new Error('sin trazado');const a=caminoRoute[0],b=caminoRoute.at(-1),params=new URLSearchParams({lonlats:`${a[1]},${a[0]}|${b[1]},${b[0]}`,profile:'trekking',alternativeidx:'0',format:'geojson'}),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{const r=await fetch(`https://brouter.de/brouter?${params}`,{signal:ctrl.signal,cache:'no-store'});if(!r.ok)throw new Error('BRouter '+r.status);const route=bikeGeoRoute(await r.json());if(route.length<2)throw new Error('ruta vacía');return route}finally{clearTimeout(timer)}
}
async function loadBikeStage(n){
 n=Number(n)||1;const host=document.getElementById('bikeMap'),status=document.getElementById('bikeStatus'),meta=document.getElementById('bikeMeta');if(!host||!status)return;
 mainMap?.destroy?.();mainMap=null;bikeRouteCurrent=null;host.innerHTML='<div class="feature-loading">🚴 Preparando ruta ciclista…</div>';status.className='feature-status loading';status.innerHTML='<b>Calculando con BRouter</b><span>Perfil bicicleta “trekking”, basado en OpenStreetMap.</span>';if(meta)meta.textContent='';
 const camino=(await remoteStageRoute(n))||localRoute(n);if(!host.isConnected)return;if(!camino?.length){status.className='feature-status warning';status.innerHTML='<b>No hay trazado de referencia disponible</b><span>Conecta el móvil a Internet y vuelve a intentarlo. No se inventa una ruta si faltan datos.</span>';host.innerHTML='<div class="empty">Ruta no disponible en este momento.</div>';return}
 let route,source='';try{route=await brouterBikeRoute(camino);source='BRouter · OpenStreetMap';status.className='feature-status ok';status.innerHTML='<b>✓ Ruta bici calculada</b><span>Ruta orientativa entre el inicio y el final de la etapa. Revisa señalización, firme, restricciones y condiciones reales.</span>'}catch(e){route=camino;source='Trazado del Camino · respaldo';status.className='feature-status warning';status.innerHTML='<b>Ruta ciclista automática no disponible</b><span>Se muestra el trazado del Camino como referencia. No significa que todos sus tramos sean ciclables.</span>'}
 if(!host.isConnected)return;host.innerHTML='';mainMap=new BCMap(host,{lat:route[0][0],lon:route[0][1],zoom:11,layer:'topo'});mainMap.stageNo=n;mainMap.setRoute(route,true);mainMap.setRouteVisible(true);mainMap.setTravelMode('bike');bikeRouteCurrent=route;const compBtn=document.getElementById('bikeCompass');if(compBtn)mainMapCompass=attachMapCompass(mainMap,compBtn);
 const s=STAGES[n-1],km=routeKm(route);if(meta)meta.innerHTML=`<strong>🚴 ${km.toFixed(1)} km</strong><span>Etapa ${n} bici · ${esc(s.from)} → ${esc(s.to)}</span><small>${esc(source)}</small>`;
 servicesForStage(n).then(items=>{if(mainMap?.el?.isConnected&&mainMap.stageNo===n){const bike=items.filter(x=>x.type==='bici'&&Number.isFinite(x.lat));if(bike.length)mainMap.addServices(bike.slice(0,80));const c=document.getElementById('bikeServicesCount');if(c)c.textContent=bike.length?`${bike.length} servicios de bicicleta señalados en el mapa`:'No constan servicios de bicicleta en los datos disponibles de esta etapa';}}).catch(()=>{});
}
function openBikeFeature(stage=null){
 const n=Number(stage)||1,s=STAGES[n-1];featureShell('🚴','Ruta bici',stage?`Etapa ${n} · ${s.from} → ${s.to}`:'Elige una etapa del Camino Francés',`<section class="feature-body"><div class="feature-control-card"><label for="bikeStageSelect">ETAPA</label><select id="bikeStageSelect" class="feature-select">${featureStageOptions(n,'🚴')}</select><div id="bikeMeta" class="feature-meta"></div><div class="feature-inline-tools"><button id="bikeCompass" class="feature-tool-small map-compass-toggle" type="button">🧭 BRÚJULA</button></div></div><div id="bikeStatus" class="feature-status loading"></div><div id="bikeMap" class="bc-map feature-map"></div><div id="bikeServicesCount" class="feature-footnote">Buscando servicios de bicicleta…</div><div class="feature-safety"><b>🚴 Importante</b><p>La ruta bici es una ayuda de planificación, no una certificación de ciclabilidad. Comprueba señalización, prohibiciones, tráfico, firme, obras y alternativas locales antes de circular.</p></div></section>`);
 const sel=document.getElementById('bikeStageSelect');sel.onchange=()=>{currentStageNo=+sel.value;loadBikeStage(+sel.value)};setTimeout(()=>loadBikeStage(n),0);
}

function compassCardinal(h){const dirs=['N','NE','E','SE','S','SO','O','NO'];return dirs[Math.round((((h%360)+360)%360)/45)%8]}
function normalizeCompassDeg(v){v=Number(v);return Number.isFinite(v)?((v%360)+360)%360:null}
function compassUiAngle(){
 let a=Number(screen.orientation?.angle);if(!Number.isFinite(a))a=Number(window.orientation)||0;
 // El mapa grande puede girarse 90° por CSS cuando el navegador no cambia a horizontal.
 if(!focusOverlay.hidden&&focusOverlay.classList.contains('force-landscape'))a+=90;
 return normalizeCompassDeg(a)||0;
}
function smoothCompassHeading(raw){
 raw=normalizeCompassDeg(raw);if(raw==null)return null;
 if(compassSmoothedHeading==null){compassSmoothedHeading=raw;return raw}
 const delta=((raw-compassSmoothedHeading+540)%360)-180,ad=Math.abs(delta);
 // Filtro adaptativo: muy estable en pequeños temblores y más rápido al girar de verdad.
 const gain=ad<4?.10:ad<15?.16:ad<45?.25:.40;
 compassSmoothedHeading=normalizeCompassDeg(compassSmoothedHeading+delta*gain);
 return compassSmoothedHeading;
}
function compassSample(raw,accuracy,source){
 raw=normalizeCompassDeg(raw);if(raw==null||!compassUpdateTarget)return;
 const uiHeading=normalizeCompassDeg(raw+compassUiAngle()),heading=smoothCompassHeading(uiHeading);
 if(heading==null)return;compassSource=source||compassSource;compassUpdateTarget(heading,Number.isFinite(Number(accuracy))?Number(accuracy):null,compassSource);
}
async function requestCompassPermission(){
 if(typeof DeviceOrientationEvent==='undefined')throw new Error('Este dispositivo no ofrece sensores de orientación.');
 if(typeof DeviceOrientationEvent.requestPermission==='function'){
  let p;try{p=await DeviceOrientationEvent.requestPermission(true)}catch(_){p=await DeviceOrientationEvent.requestPermission()}
  if(p!=='granted')throw new Error('Permiso de orientación no concedido.');
 }
}
async function startCompassSensor(onUpdate,onStatus){
 stopCompassSensors();compassUpdateTarget=onUpdate;compassSmoothedHeading=null;compassAbsoluteSeen=false;
 onStatus?.('loading','Activando sensores…','Usaré una sola fuente de rumbo absoluto para evitar saltos. Mantén el móvil alejado de imanes y metal.');
 try{
  await requestCompassPermission();let received=false;
  const got=(raw,accuracy,source)=>{if(!Number.isFinite(Number(raw)))return;received=true;compassSample(Number(raw),accuracy,source)};
  // Android/Chromium: solo aceptamos el evento absoluto. No mezclamos alpha relativo.
  compassHandler=e=>{if(compassSource==='rumbo magnético iOS'||!Number.isFinite(Number(e.alpha)))return;compassAbsoluteSeen=true;got(360-Number(e.alpha),null,'rumbo absoluto')};
  // iPhone/iPad: webkitCompassHeading ya es rumbo magnético. Como fallback, solo alpha marcado absoluto.
  compassFallbackHandler=e=>{
   if(Number.isFinite(Number(e.webkitCompassHeading))){if(compassSource!=='rumbo magnético iOS')compassSmoothedHeading=null;got(Number(e.webkitCompassHeading),Number(e.webkitCompassAccuracy),'rumbo magnético iOS');return}
   if(!compassAbsoluteSeen&&e.absolute===true&&Number.isFinite(Number(e.alpha)))got(360-Number(e.alpha),null,'rumbo absoluto');
  };
  window.addEventListener('deviceorientationabsolute',compassHandler,true);
  window.addEventListener('deviceorientation',compassFallbackHandler,true);
  compassCalibrationHandler=()=>onStatus?.('warning','Conviene calibrar la brújula','Mueve el teléfono suavemente dibujando un 8 y aléjalo de imanes, fundas magnéticas, vehículos y estructuras metálicas.');
  window.addEventListener('compassneedscalibration',compassCalibrationHandler,true);
  clearTimeout(compassNoDataTimer);compassNoDataTimer=setTimeout(()=>{if(!received){onStatus?.('warning','El móvil no está entregando rumbo absoluto','Prueba desde la PWA instalada y revisa los permisos de movimiento/orientación. Algunos dispositivos no incorporan magnetómetro.');}},3000);
 }catch(e){stopCompassSensors();onStatus?.('warning','No se pudo activar la brújula',e?.message||'Revisa permisos de movimiento y orientación del dispositivo.');}
}
function compassStatusUpdater(){
 const status=document.getElementById('compassStatus');return(kind,title,text)=>{if(!status?.isConnected)return;status.className=`feature-status ${kind||''}`.trim();status.innerHTML=`<b>${esc(title)}</b><span>${esc(text)}</span>`}
}
function updateCompassFace(heading,accuracy=null,source=''){
 const dial=document.getElementById('compassDial'),value=document.getElementById('compassValue'),card=document.getElementById('compassCardinal'),status=document.getElementById('compassStatus');if(!dial||!value)return;
 heading=normalizeCompassDeg(heading);dial.style.transform=`rotate(${-heading}deg)`;value.textContent=`${Math.round(heading)}°`;if(card)card.textContent=compassCardinal(heading);
 if(status){const low=Number.isFinite(accuracy)&&accuracy>25,sig=`${low}|${source}|${Number.isFinite(accuracy)?Math.round(accuracy):''}`;if(status.dataset.sig!==sig){status.dataset.sig=sig;status.className=`feature-status ${low?'warning':'ok'}`;status.innerHTML=`<b>${low?'Precisión baja':'Brújula estabilizada'}</b><span>${esc(source||'Rumbo absoluto')} · ${Number.isFinite(accuracy)?`precisión aprox. ±${Math.round(accuracy)}°. `:''}Filtro anti-oscilación activo.${low?' Calibra el móvil con un movimiento suave en forma de 8.':''}</span>`}}
}
async function startCompass(){await startCompassSensor(updateCompassFace,compassStatusUpdater())}
function openCompassFeature(stage=null){
 const s=stage?STAGES[Number(stage)-1]:null;featureShell('🧭','Brújula',s?`Etapa ${stage} · ${s.from} → ${s.to}`:'Orientación dentro de BUEN CAMINO',`<section class="feature-body compass-body"><div class="compass-wrap" aria-label="Brújula"><div id="compassDial" class="compass-dial"><span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">O</span><i class="tick t1"></i><i class="tick t2"></i><i class="tick t3"></i><i class="tick t4"></i></div><div class="compass-pointer">▲</div><div class="compass-center"></div></div><div class="compass-readout"><strong id="compassValue">—°</strong><span id="compassCardinal">—</span></div><button id="startCompassBtn" class="feature-primary" type="button">🧭 ACTIVAR BRÚJULA ESTABILIZADA</button><div id="compassStatus" class="feature-status"><b>Sensor detenido</b><span>La brújula usa rumbo magnético/absoluto y un filtro anti-oscilación. No guarda el rumbo.</span></div><div class="feature-safety"><b>⚠ Para una lectura fiable</b><p>Mantén el teléfono aproximadamente horizontal y lejos de fundas magnéticas, vehículos, barandillas y otras masas metálicas. Si el norte parece desplazado, calibra moviendo el móvil suavemente en forma de 8. Para seguir el Camino prevalecen la señalización y el mapa/GPS.</p></div></section>`);document.getElementById('startCompassBtn').onclick=startCompass;
}
function mapCompassMarkup(){
 const ticks=Array.from({length:36},(_,i)=>`<i class="deg-tick ${i%3===0?'major':''}" style="--deg:${i*10}deg"></i>`).join('');
 return `<div class="map-compass-mini"><div class="map-compass-rose">${ticks}<b class="n">N</b><b class="e">E</b><b class="s">S</b><b class="w">O</b></div><span class="map-compass-arrow">▲</span><span class="map-compass-dot"></span></div><div class="map-compass-reading"><strong>—°</strong><b>—</b><small>Activando…</small></div><button class="map-compass-close" type="button" aria-label="Ocultar brújula">×</button>`;
}
function mapCompassAligned(heading){const h=normalizeCompassDeg(heading);return h!=null&&Math.min(h,360-h)<=7}
function positionMapCompass(ctrl){
 if(!ctrl?.panel?.isConnected||ctrl.panel.hidden)return;
 const host=ctrl.map?.el;if(!host)return;const w=ctrl.panel.offsetWidth||148,h=ctrl.panel.offsetHeight||154,maxX=Math.max(0,host.clientWidth-w),maxY=Math.max(0,host.clientHeight-h);
 ctrl.panel.style.left=`${Math.round(maxX*mapCompassPosition.x)}px`;ctrl.panel.style.top=`${Math.round(maxY*mapCompassPosition.y)}px`;ctrl.panel.style.right='auto';
}
function saveMapCompassPosition(ctrl,left,top){
 const host=ctrl?.map?.el,panel=ctrl?.panel;if(!host||!panel)return;const maxX=Math.max(1,host.clientWidth-panel.offsetWidth),maxY=Math.max(1,host.clientHeight-panel.offsetHeight);
 mapCompassPosition={x:Math.max(0,Math.min(1,left/maxX)),y:Math.max(0,Math.min(1,top/maxY))};try{localStorage.setItem('bc-map-compass-pos',JSON.stringify(mapCompassPosition))}catch(_){}
}
function makeMapCompassDraggable(ctrl){
 const panel=ctrl.panel;let drag=null;
 panel.addEventListener('pointerdown',e=>{
  e.stopPropagation();if(e.target.closest('button'))return;e.preventDefault();const host=ctrl.map?.el;if(!host)return;
  const pr=panel.getBoundingClientRect(),hr=host.getBoundingClientRect();panel.style.left=`${pr.left-hr.left}px`;panel.style.top=`${pr.top-hr.top}px`;panel.style.right='auto';drag={id:e.pointerId,dx:e.clientX-pr.left,dy:e.clientY-pr.top};panel.setPointerCapture?.(e.pointerId);panel.classList.add('dragging');
 });
 panel.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();e.preventDefault();const host=ctrl.map?.el;if(!host)return;const hr=host.getBoundingClientRect(),maxX=Math.max(0,host.clientWidth-panel.offsetWidth),maxY=Math.max(0,host.clientHeight-panel.offsetHeight),left=Math.max(0,Math.min(maxX,e.clientX-hr.left-drag.dx)),top=Math.max(0,Math.min(maxY,e.clientY-hr.top-drag.dy));panel.style.left=`${left}px`;panel.style.top=`${top}px`;saveMapCompassPosition(ctrl,left,top)});
 const finish=e=>{if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();panel.releasePointerCapture?.(e.pointerId);drag=null;panel.classList.remove('dragging')};
 panel.addEventListener('pointerup',finish);panel.addEventListener('pointercancel',finish);
}
function attachMapCompass(map,btn){
 if(!map?.el||!btn)return null;const panel=document.createElement('div');panel.className='map-compass-overlay';panel.hidden=true;panel.setAttribute('aria-live','polite');panel.setAttribute('aria-label','Brújula flotante. Arrastra con el dedo para moverla sobre el mapa.');panel.innerHTML=mapCompassMarkup();map.el.appendChild(panel);
 const ctrl={map,btn,panel,rose:panel.querySelector('.map-compass-rose'),value:panel.querySelector('.map-compass-reading strong'),cardinal:panel.querySelector('.map-compass-reading>b'),note:panel.querySelector('.map-compass-reading small'),active:false};
 panel.querySelector('.map-compass-close').onclick=e=>{e.stopPropagation();deactivateMapCompass(ctrl,true)};btn.onclick=e=>{e?.stopPropagation?.();toggleMapCompass(ctrl)};makeMapCompassDraggable(ctrl);return ctrl;
}
function updateMapCompass(ctrl,heading,accuracy=null,source=''){
 if(!ctrl?.active||!ctrl.panel?.isConnected)return;heading=normalizeCompassDeg(heading);if(heading==null)return;
 ctrl.rose.style.transform=`rotate(${-heading}deg)`;ctrl.value.textContent=`${Math.round(heading)}°`;ctrl.cardinal.textContent=compassCardinal(heading);const aligned=mapCompassAligned(heading);ctrl.panel.classList.toggle('north-aligned',aligned);ctrl.note.textContent=aligned?'NORTE DEL MAPA Y BRÚJULA ALINEADOS':(Number.isFinite(accuracy)&&accuracy>25?'⚠ Calibra · precisión baja':(source||'Rumbo estabilizado'));
}
function mapCompassStatus(ctrl,kind,title,text){if(!ctrl?.active||!ctrl.note?.isConnected)return;ctrl.note.textContent=kind==='warning'?`⚠ ${title}`:title;ctrl.note.title=text||''}
async function activateMapCompass(ctrl){
 if(!ctrl?.panel?.isConnected)return;if(mapCompassActive&&mapCompassActive!==ctrl)deactivateMapCompass(mapCompassActive,true);mapCompassActive=ctrl;ctrl.active=true;ctrl.panel.hidden=false;ctrl.btn.classList.add('active');ctrl.btn.textContent=ctrl.btn.classList.contains('map-float')?'🧭 BRÚJULA ON':'🧭 BRÚJULA ON';requestAnimationFrame(()=>positionMapCompass(ctrl));
 await startCompassSensor((h,a,s)=>updateMapCompass(ctrl,h,a,s),(k,t,x)=>mapCompassStatus(ctrl,k,t,x));
}
function deactivateMapCompass(ctrl,hide=true){
 if(!ctrl)return;if(ctrl.active&&mapCompassActive===ctrl){stopCompassSensors();mapCompassActive=null}ctrl.active=false;if(hide&&ctrl.panel?.isConnected)ctrl.panel.hidden=true;if(ctrl.btn?.isConnected){ctrl.btn.classList.remove('active');ctrl.btn.textContent='🧭 BRÚJULA'}
}
function toggleMapCompass(ctrl){if(!ctrl)return;ctrl.active?deactivateMapCompass(ctrl,true):activateMapCompass(ctrl)}
async function toggleFocusCompass(){if(focusMapCompass)toggleMapCompass(focusMapCompass)}

const SKY_STARS=[
 ['Polaris',2.5303,89.2641,1.98,'Osa Menor'],
 ['Dubhe',11.0621,61.7508,1.79,'Osa Mayor'],['Merak',11.0307,56.3824,2.37,'Osa Mayor'],['Phecda',11.8972,53.6948,2.44,'Osa Mayor'],['Megrez',12.2570,57.0326,3.31,'Osa Mayor'],['Alioth',12.9005,55.9598,1.76,'Osa Mayor'],['Mizar',13.3988,54.9254,2.23,'Osa Mayor'],['Alkaid',13.7923,49.3133,1.86,'Osa Mayor'],
 ['Caph',0.1529,59.1498,2.28,'Casiopea'],['Schedar',0.6751,56.5373,2.24,'Casiopea'],['Gamma Cas',0.9451,60.7167,2.15,'Casiopea'],['Ruchbah',1.4303,60.2353,2.68,'Casiopea'],['Segin',1.9066,63.6701,3.35,'Casiopea'],
 ['Betelgeuse',5.9195,7.4071,0.50,'Orión'],['Bellatrix',5.4189,6.3497,1.64,'Orión'],['Alnitak',5.6793,-1.9426,1.74,'Orión'],['Alnilam',5.6036,-1.2019,1.69,'Orión'],['Mintaka',5.5334,-0.2991,2.23,'Orión'],['Rigel',5.2423,-8.2016,0.13,'Orión'],['Saiph',5.7959,-9.6696,2.06,'Orión'],
 ['Deneb',20.6905,45.2803,1.25,'Cisne'],['Sadr',20.3705,40.2567,2.23,'Cisne'],['Albireo',19.5120,27.9597,3.05,'Cisne'],
 ['Vega',18.6156,38.7837,0.03,'Lira'],['Sheliak',18.8347,33.3627,3.52,'Lira'],['Sulafat',18.9824,32.6896,3.25,'Lira'],
 ['Sirius',6.7525,-16.7161,-1.46,'Can Mayor'],['Capella',5.2782,45.9980,0.08,'Auriga'],['Aldebarán',4.5987,16.5093,0.86,'Tauro'],['Arcturus',14.2610,19.1824,-0.05,'Boyero'],['Altair',19.8464,8.8683,0.77,'Águila']
].map(x=>({name:x[0],ra:x[1],dec:x[2],mag:x[3],con:x[4]}));
const SKY_LINES={
 'Osa Mayor':[['Dubhe','Merak'],['Merak','Phecda'],['Phecda','Megrez'],['Megrez','Dubhe'],['Megrez','Alioth'],['Alioth','Mizar'],['Mizar','Alkaid']],
 'Casiopea':[['Caph','Schedar'],['Schedar','Gamma Cas'],['Gamma Cas','Ruchbah'],['Ruchbah','Segin']],
 'Orión':[['Betelgeuse','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka'],['Betelgeuse','Alnitak']],
 'Cisne':[['Deneb','Sadr'],['Sadr','Albireo']],
 'Lira':[['Vega','Sheliak'],['Sheliak','Sulafat'],['Sulafat','Vega']]
};
const CONSTELLATION_INFO={
 'Osa Mayor':{latin:'Ursa Major',abbr:'UMa',bright:'Alioth',season:'Primavera',text:'Una de las figuras más reconocibles del cielo boreal. El asterismo del Carro ayuda a localizar Polaris prolongando la línea Merak–Dubhe.'},
 'Osa Menor':{latin:'Ursa Minor',abbr:'UMi',bright:'Polaris',season:'Todo el año',text:'Contiene Polaris, la Estrella Polar, situada muy cerca del polo norte celeste y usada tradicionalmente como referencia de orientación.'},
 'Casiopea':{latin:'Cassiopeia',abbr:'Cas',bright:'Schedar',season:'Otoño',text:'Constelación boreal fácil de reconocer por su forma de W o M. Es circumpolar desde gran parte del Camino Francés.'},
 'Orión':{latin:'Orion',abbr:'Ori',bright:'Rigel',season:'Invierno',text:'Destaca por el Cinturón de Orión, formado por Alnitak, Alnilam y Mintaka. Betelgeuse y Rigel marcan dos de sus vértices más brillantes.'},
 'Cisne':{latin:'Cygnus',abbr:'Cyg',bright:'Deneb',season:'Verano',text:'Cruza una zona muy rica de la Vía Láctea. Deneb forma junto con Vega y Altair el conocido Triángulo de Verano.'},
 'Lira':{latin:'Lyra',abbr:'Lyr',bright:'Vega',season:'Verano',text:'Pequeña constelación dominada por Vega, una de las estrellas más brillantes del cielo nocturno y vértice del Triángulo de Verano.'}
};
function julianDate(date){return date.getTime()/86400000+2440587.5}
function skyHorizontal(star,lat,lon,date){
 const jd=julianDate(date),T=(jd-2451545)/36525,gmst=280.46061837+360.98564736629*(jd-2451545)+.000387933*T*T-T*T*T/38710000,lst=((gmst+lon)%360+360)%360,H=(((lst-star.ra*15+180)%360+360)%360)-180,r=Math.PI/180,hr=H*r,dr=star.dec*r,pr=lat*r;
 const sinAlt=Math.sin(dr)*Math.sin(pr)+Math.cos(dr)*Math.cos(pr)*Math.cos(hr),alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)))/r,az=(Math.atan2(-Math.sin(hr),Math.tan(dr)*Math.cos(pr)-Math.sin(pr)*Math.cos(hr))/r+360)%360;return{alt,az};
}
function stripHtmlText(v){const d=document.createElement('div');d.innerHTML=String(v||'');return(d.textContent||'').trim()}
function skyWorldVector(h){const r=Math.PI/180,a=h.az*r,t=h.alt*r,c=Math.cos(t);return[c*Math.sin(a),c*Math.cos(a),Math.sin(t)]}
function dot3(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function deviceSkyBasis(alpha,beta,gamma){
 const r=Math.PI/180,a=(Number(alpha)+compassUiAngle())*r,b=Number(beta)*r,g=Number(gamma)*r,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
 const m11=ca*cg-sa*sb*sg,m12=-cb*sa,m13=cg*sa*sb+ca*sg;
 const m21=cg*sa+ca*sb*sg,m22=ca*cb,m23=sa*sg-ca*cg*sb;
 const m31=-cb*sg,m32=sb,m33=cb*cg;
 return{right:[m11,m21,m31],up:[m12,m22,m32],forward:[-m13,-m23,-m33]};
}
function skyStaticPoint(h,cx,cy,R){if(h.alt<=0)return null;const rr=(90-h.alt)/90*R,a=h.az*Math.PI/180;return{x:cx+rr*Math.sin(a),y:cy-rr*Math.cos(a)}}
function skySensorPoint(h,basis,cx,cy,f,w,hg){const v=skyWorldVector(h),x=dot3(v,basis.right),y=dot3(v,basis.up),z=dot3(v,basis.forward);if(z<=.12)return null;const p={x:cx+f*x/z,y:cy-f*y/z};if(p.x<-w*.12||p.x>w*1.12||p.y<-hg*.12||p.y>hg*1.12)return null;return p}
const STAR_INFO={
 Polaris:'La Estrella Polar está muy cerca del polo norte celeste. En el hemisferio norte es una referencia tradicional para localizar aproximadamente el norte.',
 Vega:'Vega es la estrella principal de Lira y una de las más brillantes del cielo. Junto con Deneb y Altair forma el Triángulo de Verano.',
 Deneb:'Deneb es la estrella más destacada de Cisne y uno de los vértices del Triángulo de Verano.',
 Altair:'Altair es la estrella principal del Águila y uno de los vértices del Triángulo de Verano.',
 Betelgeuse:'Betelgeuse es una supergigante roja muy visible en Orión y marca uno de los hombros de la figura tradicional.',
 Rigel:'Rigel es una estrella azul-blanca muy brillante de Orión y marca uno de los pies de la figura tradicional.',
 Sirius:'Sirio, en Can Mayor, es la estrella más brillante del cielo nocturno vista desde la Tierra.',
 Capella:'Capella es la estrella más brillante de Auriga y una de las más luminosas del cielo boreal.',
 Aldebarán:'Aldebarán es una gigante anaranjada que marca visualmente el ojo de Tauro.',
 Arcturus:'Arturo es la estrella principal de Boyero y una de las más brillantes del cielo boreal.'
};
function skySvgGeometry(svg){const r=svg.getBoundingClientRect(),w=Math.max(320,Math.round(r.width||360)),h=Math.max(300,Math.round(r.height||360)),m=Math.min(w,h),cx=w/2,cy=h/2;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);return{w,h,cx,cy,R:m*.43,f:m*.47}}
function bindSkyObjectClicks(root=document){
 root.querySelectorAll('[data-star],[data-con]').forEach(el=>{el.style.cursor='pointer';el.onclick=e=>{e.stopPropagation();const source=el.closest('.sky-fullscreen-overlay')?'full':'normal';if(el.dataset.star)openSkyObjectInfo('star',el.dataset.star,source);else if(el.dataset.con)openSkyObjectInfo('constellation',el.dataset.con,source)}});
}
function renderSkySvg(svg,lat,lon,now,sensor){
 if(!svg)return[];const g=skySvgGeometry(svg),positions=new Map(),visible=[],basis=sensor?deviceSkyBasis(skyOrientationState.alpha,skyOrientationState.beta,skyOrientationState.gamma):null;
 for(const st of SKY_STARS){const h=skyHorizontal(st,lat,lon,now),pt=sensor?skySensorPoint(h,basis,g.cx,g.cy,g.f,g.w,g.h):skyStaticPoint(h,g.cx,g.cy,g.R);if(!pt)continue;positions.set(st.name,{...pt,...h,st});visible.push({...pt,...h,st})}
 let base='';if(sensor){base=`<rect x="0" y="0" width="${g.w}" height="${g.h}" rx="18" class="sky-live-bg"/><circle cx="${g.cx}" cy="${g.cy}" r="8" class="sky-reticle"/><line x1="${g.cx-16}" y1="${g.cy}" x2="${g.cx+16}" y2="${g.cy}" class="sky-reticle-line"/><line x1="${g.cx}" y1="${g.cy-16}" x2="${g.cx}" y2="${g.cy+16}" class="sky-reticle-line"/>`}else{const xE=g.cx+g.R+18,xO=g.cx-g.R-18;base=`<circle cx="${g.cx}" cy="${g.cy}" r="${g.R}" class="sky-horizon"/><circle cx="${g.cx}" cy="${g.cy}" r="${g.R*2/3}" class="sky-alt"/><circle cx="${g.cx}" cy="${g.cy}" r="${g.R/3}" class="sky-alt"/><line x1="${g.cx}" y1="${g.cy-g.R}" x2="${g.cx}" y2="${g.cy+g.R}" class="sky-axis"/><line x1="${g.cx-g.R}" y1="${g.cy}" x2="${g.cx+g.R}" y2="${g.cy}" class="sky-axis"/><text x="${g.cx}" y="${Math.max(14,g.cy-g.R-8)}" text-anchor="middle" class="sky-dir">N</text><text x="${Math.min(g.w-12,xE)}" y="${g.cy+4}" text-anchor="middle" class="sky-dir">E</text><text x="${g.cx}" y="${Math.min(g.h-8,g.cy+g.R+18)}" text-anchor="middle" class="sky-dir">S</text><text x="${Math.max(12,xO)}" y="${g.cy+4}" text-anchor="middle" class="sky-dir">O</text>`}
 let lines='';for(const [con,pairs] of Object.entries(SKY_LINES)){for(const [a,b] of pairs){const p1=positions.get(a),p2=positions.get(b);if(p1&&p2)lines+=`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" class="sky-line" data-con="${esc(con)}"><title>${esc(con)} · tocar para información</title></line>`}}
 const stars=visible.sort((a,b)=>a.st.mag-b.st.mag).map(p=>{const rad=Math.max(3,Math.min(7,5.3-p.st.mag*.55)),labelStar=p.st.mag<=1.0||['Polaris','Vega','Deneb','Betelgeuse'].includes(p.st.name);return `<g data-star="${esc(p.st.name)}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rad.toFixed(1)}" class="sky-star"><title>${esc(p.st.name)} · ${esc(p.st.con)} · altitud ${Math.round(p.alt)}° · tocar para información</title></circle>${labelStar?`<text x="${(p.x+8).toFixed(1)}" y="${(p.y-6).toFixed(1)}" class="sky-star-label">${esc(p.st.name)}</text>`:''}</g>`}).join('');
 svg.innerHTML=base+lines+stars+(sensor?'':`<circle cx="${g.cx}" cy="${g.cy}" r="3" class="sky-zenith"/>`);bindSkyObjectClicks(svg);return visible;
}
function renderSky(lat,lon,label){
 skyLocation={lat,lon,label};const info=document.getElementById('skyInfo'),visEl=document.getElementById('skyVisible'),now=new Date(),sensor=skyTrackActive&&skyOrientationState;let visible=[];
 document.querySelectorAll('#skySvg,#skyFullSvg').forEach((svg,i)=>{const v=renderSkySvg(svg,lat,lon,now,sensor);if(i===0||!visible.length)visible=v});
 if(info)info.innerHTML=`<b>${esc(label)}</b><span>${lat.toFixed(4)}, ${lon.toFixed(4)} · ${esc(now.toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}))}</span><small>${sensor?'MODO CIELO ACTIVO · mueve y apunta el teléfono hacia el cielo':'Centro = cenit · borde = horizonte · toca ACTIVAR MODO CIELO para seguir el movimiento'}</small>`;
 const fullInfo=document.getElementById('skyFullStatus');if(fullInfo)fullInfo.textContent=`${label} · ${sensor?'Modo cielo activo':'Vista celeste'} · ${now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`;
 const cons=[...new Set(visible.map(x=>x.st.con))].filter(c=>CONSTELLATION_INFO[c]);if(visEl)visEl.innerHTML=cons.length?`<b>Toca una constelación para conocerla</b><div>${cons.map(c=>`<button type="button" data-con="${esc(c)}">✨ ${esc(c)}</button>`).join('')}</div>`:'<b>No aparecen constelaciones de la selección en este campo de visión.</b>';if(visEl)bindSkyObjectClicks(visEl);
}
function skyInfoPanel(source='normal'){return document.getElementById(source==='full'?'skyFullInfoPanel':'skyObjectInfoPanel')}
function skyInfoIntro(source='normal'){
 const box=skyInfoPanel(source);if(!box)return;box.hidden=false;box.innerHTML=`<div class="sky-object-head"><div><small>INFO ESTRELLAS Y CONSTELACIONES</small><h3>ℹ️ Toca un objeto del cielo</h3></div><button type="button" class="sky-info-close" aria-label="Cerrar información">×</button></div><p>Toca directamente una <b>estrella</b>, una línea de <b>constelación</b> o uno de los nombres que aparecen bajo la carta. La información se abrirá aquí sin salir de BUEN CAMINO.</p><div class="sky-info-shortcuts">${Object.keys(CONSTELLATION_INFO).map(c=>`<button type="button" data-info-con="${esc(c)}">✨ ${esc(c)}</button>`).join('')}</div><div class="sky-info-shortcuts stars">${['Polaris','Vega','Deneb','Altair','Sirius','Betelgeuse','Rigel'].map(n=>`<button type="button" data-info-star="${esc(n)}">⭐ ${esc(n)}</button>`).join('')}</div>`;box.querySelector('.sky-info-close').onclick=()=>box.hidden=true;box.querySelectorAll('[data-info-con]').forEach(b=>b.onclick=()=>openSkyObjectInfo('constellation',b.dataset.infoCon,source));box.querySelectorAll('[data-info-star]').forEach(b=>b.onclick=()=>openSkyObjectInfo('star',b.dataset.infoStar,source));
}
function skyAzCardinal(deg){return compassCardinal(deg)}
async function openSkyObjectInfo(kind,name,source='normal'){
 const box=skyInfoPanel(source);if(!box)return;box.hidden=false;
 if(kind==='star'){
  const st=SKY_STARS.find(x=>x.name===name);if(!st)return skyInfoIntro(source);const h=skyLocation?skyHorizontal(st,skyLocation.lat,skyLocation.lon,new Date()):null,desc=STAR_INFO[name]||`${name} pertenece a la constelación ${st.con}. La carta de BUEN CAMINO calcula su posición aparente para la hora y ubicación seleccionadas.`;
  box.innerHTML=`<div class="sky-object-head"><div><small>ESTRELLA</small><h3>⭐ ${esc(st.name)}</h3><span>${esc(st.con)}</span></div><button type="button" class="sky-info-close" aria-label="Cerrar información">×</button></div><p>${esc(desc)}</p><div class="constellation-facts"><span>✨ Constelación: ${esc(st.con)}</span><span>◉ Magnitud aparente: ${Number(st.mag).toFixed(2)}</span>${h?`<span>↗ Altitud ahora: ${Math.round(h.alt)}°</span><span>🧭 Acimut: ${Math.round(h.az)}° ${skyAzCardinal(h.az)}</span>`:''}</div><small class="license-note">La posición en pantalla es orientativa y se recalcula con la hora, GPS y sensores del teléfono.</small><div class="constellation-links"><a href="https://es.wikipedia.org/wiki/${encodeURIComponent(st.name.replace(/ /g,'_'))}" target="_blank" rel="noopener">Más información ↗</a><a href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(st.name+' star astronomy')}" target="_blank" rel="noopener">Fotos libres en Commons ↗</a></div>`;box.querySelector('.sky-info-close').onclick=()=>box.hidden=true;if(source==='normal')box.scrollIntoView({behavior:'smooth',block:'nearest'});return;
 }
 const info=CONSTELLATION_INFO[name];if(!info)return skyInfoIntro(source);box.innerHTML=`<div class="sky-object-head"><div><small>CONSTELACIÓN</small><h3>✨ ${esc(name)}</h3><span>${esc(info.latin)} · ${esc(info.abbr)}</span></div><button type="button" class="sky-info-close" aria-label="Cerrar información">×</button></div><p>${esc(info.text)}</p><div class="constellation-facts"><span>⭐ Brillante: ${esc(info.bright)}</span><span>🗓 Mejor época: ${esc(info.season)}</span></div><div class="constellation-photos"><div class="photo-loading">📷 Buscando fotografías reales en Wikimedia Commons…</div></div><div class="constellation-links"><a href="https://es.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g,'_'))}" target="_blank" rel="noopener">Wikipedia ↗</a><a href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(info.latin+' constellation')}" target="_blank" rel="noopener">Wikimedia Commons ↗</a></div><small class="license-note">Las imágenes se muestran solo si la API declara una licencia libre o dominio público. Algunas licencias gratuitas exigen atribución.</small>`;box.querySelector('.sky-info-close').onclick=()=>box.hidden=true;if(source==='normal')box.scrollIntoView({behavior:'smooth',block:'nearest'});
 const host=box.querySelector('.constellation-photos');try{const photos=await commonsConstellationPhotos(name);if(!host?.isConnected)return;if(!photos.length)throw 0;host.innerHTML=photos.map(p=>`<figure><a href="${esc(p.page)}" target="_blank" rel="noopener"><img src="${esc(p.thumb)}" alt="Fotografía de ${esc(name)}" loading="lazy"></a><figcaption><b>${esc(p.title)}</b><span>${esc(p.artist)}</span><a href="${esc(p.licenseUrl||p.page)}" target="_blank" rel="noopener">${esc(p.license)} ↗</a></figcaption></figure>`).join('')}catch{if(host)host.innerHTML='<div class="empty">No se encontró ahora una fotografía con licencia libre claramente identificada.</div>'}
}
async function skyStageLocation(n){const route=(await remoteStageRoute(n))||localRoute(n);if(route?.length){const p=route[Math.floor(route.length/2)],s=STAGES[n-1];return{lat:p[0],lon:p[1],label:`Etapa ${n} · ${s.from} → ${s.to}`}}const p=await stageWeatherPosition(n);if(p){const s=STAGES[n-1];return{lat:p.lat,lon:p.lon,label:`Destino etapa ${n} · ${s.to}`}}return null}
async function loadSkyStage(n){const status=document.getElementById('skyStatus');if(status){status.className='feature-status loading';status.innerHTML='<b>Calculando cielo…</b><span>Usando una posición de referencia de la etapa.</span>'}try{const requested=Number(n)||1,p=await skyStageLocation(requested);if(!p)throw 0;const sel=document.getElementById('skyStageSelect');if(sel&&Number(sel.value)!==requested)return;renderSky(p.lat,p.lon,p.label);if(status){status.className='feature-status ok';status.innerHTML='<b>✓ Cielo calculado</b><span>Activa MODO CIELO para que la vista responda al movimiento del teléfono.</span>'}}catch{if(status){status.className='feature-status warning';status.innerHTML='<b>No se pudo obtener la posición de la etapa</b><span>Pulsa “Usar mi GPS” o conecta el móvil y vuelve a intentarlo.</span>'}}}
function useGpsForSky(){
 const status=document.getElementById('skyStatus'),btn=document.getElementById('skyGpsBtn');if(!navigator.geolocation){toast('GPS no disponible');return}if(btn)btn.textContent='📍 GPS · BUSCANDO…';if(status){status.className='feature-status loading';status.innerHTML='<b>Activando GPS…</b><span>La ubicación se usa solo para calcular el cielo y no se guarda.</span>'}
 const ok=p=>{renderSky(p.coords.latitude,p.coords.longitude,'Mi ubicación GPS');if(btn)btn.textContent='✓ GPS ACTIVO';if(status){status.className='feature-status ok';status.innerHTML=`<b>✓ GPS activo</b><span>Precisión ±${Math.round(p.coords.accuracy)} m. La posición se actualiza mientras esta pantalla esté abierta.</span>`}};
 const bad=e=>{if(btn)btn.textContent='📍 REINTENTAR GPS';if(status){status.className='feature-status warning';status.innerHTML=`<b>No se pudo activar el GPS</b><span>${esc(e?.message||'Revisa el permiso de ubicación de Chrome o de la PWA.')}</span>`}};
 navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:true,timeout:18000,maximumAge:0});
 if(skyGpsWatch!=null)try{navigator.geolocation.clearWatch(skyGpsWatch)}catch{};skyGpsWatch=navigator.geolocation.watchPosition(ok,()=>{},{enableHighAccuracy:true,timeout:30000,maximumAge:10000});
}
function skyOrientationEvent(e,source){
 const alpha=Number(e.alpha),beta=Number(e.beta),gamma=Number(e.gamma);if(!Number.isFinite(alpha)||!Number.isFinite(beta)||!Number.isFinite(gamma))return;if(source==='fallback'&&e.absolute!==true&&!Number.isFinite(Number(e.webkitCompassHeading)))return;
 skyOrientationState={alpha,beta,gamma};if(skyLocation&&(document.getElementById('skySvg')||document.getElementById('skyFullSvg')))
 if(!skyOrientationEvent._raf){skyOrientationEvent._raf=requestAnimationFrame(()=>{skyOrientationEvent._raf=0;if(skyTrackActive&&skyOrientationState)renderSky(skyLocation.lat,skyLocation.lon,skyLocation.label);});}
}
async function startSkyTracking(){
 const status=document.getElementById('skyStatus'),btn=document.getElementById('skyTrackBtn');try{await requestCompassPermission();skyTrackActive=true;if(btn){btn.textContent='✓ MODO CIELO ACTIVO';btn.classList.add('active')}
  if(skyOrientationHandler)window.removeEventListener('deviceorientationabsolute',skyOrientationHandler,true);if(skyFallbackOrientationHandler)window.removeEventListener('deviceorientation',skyFallbackOrientationHandler,true);
  let absoluteSeen=false;skyOrientationHandler=e=>{absoluteSeen=true;skyOrientationEvent(e,'absolute')};skyFallbackOrientationHandler=e=>{if(!absoluteSeen)skyOrientationEvent(e,'fallback')};window.addEventListener('deviceorientationabsolute',skyOrientationHandler,true);window.addEventListener('deviceorientation',skyFallbackOrientationHandler,true);
  if(skyCompassCtrl&&!skyCompassCtrl.active)activateMapCompass(skyCompassCtrl);if(status){status.className='feature-status ok';status.innerHTML='<b>✓ Modo cielo activo</b><span>Apunta la parte trasera del teléfono hacia el cielo y muévelo despacio. La carta se desplaza con los sensores.</span>'}
 }catch(e){skyTrackActive=false;if(status){status.className='feature-status warning';status.innerHTML=`<b>No se pudo activar el movimiento del cielo</b><span>${esc(e?.message||'Revisa los permisos de orientación/movimiento.')}</span>`}}
}
async function commonsConstellationPhotos(name){
 const info=CONSTELLATION_INFO[name]||{latin:name},q=`${info.latin} constellation night sky photograph`,u='https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch='+encodeURIComponent(q)+'&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640';
 const r=await fetch(u,{cache:'force-cache'});if(!r.ok)throw new Error('Commons');const j=await r.json(),pages=Object.values(j?.query?.pages||{}),out=[];for(const p of pages){const ii=p?.imageinfo?.[0],m=ii?.extmetadata||{},lic=stripHtmlText(m.LicenseShortName?.value||m.UsageTerms?.value||'');if(!ii?.thumburl||!/(cc\s*by|cc0|public domain|pd-|gfdl|free art)/i.test(lic))continue;const file=String(p.title||'').toLowerCase();if(/diagram|map|chart|drawing|illustration|scheme/.test(file))continue;out.push({title:String(p.title||'').replace(/^File:/,''),thumb:ii.thumburl,page:ii.descriptionurl||'',artist:stripHtmlText(m.Artist?.value||m.Credit?.value||'Autor no indicado'),license:lic,licenseUrl:m.LicenseUrl?.value||''});if(out.length>=3)break}return out;
}

function skyGoStage(){const n=Number(document.getElementById('skyStageSelect')?.value)||Number(currentStageNo)||1;closeSkyFullView(false);featureReturn=null;stopFeatureSensors();detail(n,'resumen')}
function skyGoHome(){closeSkyFullView(false);featureReturn=null;stopFeatureSensors();home()}
function closeSkyFullView(restore=true){
 const overlay=skyFullOverlay;if(!overlay)return;if(skyFullCompassCtrl){deactivateMapCompass(skyFullCompassCtrl,true);skyFullCompassCtrl=null}overlay.remove();skyFullOverlay=null;document.body.classList.remove('sky-full-open');document.body.style.overflow=skyBodyOverflow||'';if(skyCompassCtrl?.panel?.isConnected&&(skyNormalCompassResume||skyTrackActive))activateMapCompass(skyCompassCtrl);skyNormalCompassResume=false;if(restore)requestAnimationFrame(()=>window.scrollTo({top:skyFullReturnScroll,left:0,behavior:'auto'}));
}
function openSkyFullView(){
 if(skyFullOverlay)return;skyFullReturnScroll=window.scrollY||0;skyBodyOverflow=document.body.style.overflow||'';skyNormalCompassResume=!!skyCompassCtrl?.active;if(skyCompassCtrl?.active)deactivateMapCompass(skyCompassCtrl,true);
 const overlay=document.createElement('section');overlay.className='sky-fullscreen-overlay';overlay.setAttribute('aria-label','Gran vista del cielo');overlay.innerHTML=`<header class="sky-full-top"><div class="sky-full-nav"><button id="skyFullBack" type="button">← VOLVER</button><button id="skyFullStage" type="button">👣 ETAPA</button><button id="skyFullHome" type="button">🏠 INICIO</button></div><div class="sky-full-tools"><button id="skyFullCompass" class="map-compass-toggle" type="button">🧭 BRÚJULA</button><button id="skyFullInfoBtn" type="button">ℹ INFO</button></div><small id="skyFullStatus">Gran vista cielo</small></header><div id="skyFullWrap" class="sky-full-canvas"><svg id="skyFullSvg" role="img" aria-label="Gran vista interactiva del cielo"></svg><section id="skyFullInfoPanel" class="sky-full-info-panel" hidden></section></div>`;document.body.appendChild(overlay);skyFullOverlay=overlay;document.body.classList.add('sky-full-open');document.body.style.overflow='hidden';
 document.getElementById('skyFullBack').onclick=()=>closeSkyFullView(true);document.getElementById('skyFullStage').onclick=skyGoStage;document.getElementById('skyFullHome').onclick=skyGoHome;document.getElementById('skyFullInfoBtn').onclick=()=>{const p=skyInfoPanel('full');p?.hidden?skyInfoIntro('full'):p.hidden=true};const wrap=document.getElementById('skyFullWrap');skyFullCompassCtrl=attachMapCompass({el:wrap},document.getElementById('skyFullCompass'));if(skyNormalCompassResume||skyTrackActive)activateMapCompass(skyFullCompassCtrl);requestAnimationFrame(()=>{if(skyLocation)renderSky(skyLocation.lat,skyLocation.lon,skyLocation.label)});
}

function openSkyFeature(stage=null){
 const n=Number(stage)||1,s=STAGES[n-1];featureShell('✨','Estrellas y constelaciones',stage?`Etapa ${n} · ${s.from} → ${s.to}`:'Cielo del Camino Francés',`<section class="feature-body sky-feature-body"><div class="sky-local-nav" aria-label="Navegación de cielo"><button id="skyLocalBack" type="button">← VOLVER</button><button id="skyLocalStage" type="button">👣 ETAPA</button><button id="skyLocalHome" type="button">🏠 INICIO</button></div><div class="feature-control-card sky-controls"><label for="skyStageSelect">POSICIÓN DE REFERENCIA</label><select id="skyStageSelect" class="feature-select">${featureStageOptions(n)}</select><div class="sky-action-grid"><button id="skyGpsBtn" class="feature-primary secondary" type="button">📍 USAR MI GPS</button><button id="skyTrackBtn" class="feature-primary" type="button">✨ ACTIVAR MODO CIELO</button><button id="skyCompassBtn" class="feature-primary secondary map-compass-toggle" type="button">🧭 BRÚJULA</button><button id="skyFullBtn" class="feature-primary sky-full-btn" type="button">🌌 GRAN VISTA CIELO</button><button id="skyInfoBtn" class="feature-primary secondary sky-info-btn" type="button">ℹ️ INFO ESTRELLAS Y CONSTELACIONES</button></div></div><div id="skyStatus" class="feature-status loading"></div><div id="skyInfo" class="sky-info"></div><div id="skyWrap" class="sky-wrap"><svg id="skySvg" role="img" aria-label="Mapa del cielo interactivo con estrellas y constelaciones"></svg></div><div id="skyVisible" class="sky-visible"></div><section id="skyObjectInfoPanel" class="constellation-panel sky-object-panel" hidden></section><div class="feature-safety"><b>✨ Cómo usar el cielo</b><p>1) Pulsa <b>USAR MI GPS</b>. 2) Pulsa <b>ACTIVAR MODO CIELO</b>. 3) Apunta la parte trasera del móvil hacia el cielo y muévelo lentamente. 4) Pulsa <b>GRAN VISTA CIELO</b> para ocupar toda la pantalla; funciona también al girar el móvil a horizontal. 5) Toca una estrella o constelación: su ficha aparecerá dentro de <b>INFO ESTRELLAS Y CONSTELACIONES</b>.</p><p>En la vista normal y en la grande tienes <b>🏠 INICIO · 👣 ETAPA · ← VOLVER</b>. VOLVER recupera la pantalla y el desplazamiento desde donde abriste esta herramienta.</p></div></section>`);
 const sel=document.getElementById('skyStageSelect');sel.onchange=()=>{currentStageNo=+sel.value;loadSkyStage(+sel.value)};document.getElementById('skyGpsBtn').onclick=useGpsForSky;document.getElementById('skyTrackBtn').onclick=startSkyTracking;document.getElementById('skyFullBtn').onclick=openSkyFullView;document.getElementById('skyInfoBtn').onclick=()=>{const p=skyInfoPanel('normal');p?.hidden?skyInfoIntro('normal'):p.hidden=true};document.getElementById('skyLocalBack').onclick=returnFromFeature;document.getElementById('skyLocalStage').onclick=skyGoStage;document.getElementById('skyLocalHome').onclick=skyGoHome;loadSkyStage(n);const wrap=document.getElementById('skyWrap');skyCompassCtrl=attachMapCompass({el:wrap},document.getElementById('skyCompassBtn'));skyTimer=setInterval(()=>{if(skyLocation&&document.getElementById('skySvg'))renderSky(skyLocation.lat,skyLocation.lon,skyLocation.label)},60000);
}

function home(){cleanupMaps();currentView='home';currentStageNo=null;setActive('home');const installed=isStandalone();app.innerHTML=`<section class="home-intro"><div><strong>33 etapas · mapas · servicios · gratis</strong><span>Camino Francés</span></div><div class="home-version-badge">V8.3 PRO · PUBLIC READY</div><div class="home-share-row"><button id="whatsappShare" class="whatsapp-share">🟢 WHATSAPP</button><button id="homeComments" class="comments-main">💬 COMENTARIOS</button></div><div class="home-public-actions"><button id="installAppBtn" class="install-app-main ${installed?'installed':''}">${installed?'✓ APP INSTALADA':'📲 INSTALAR APP'}</button><button id="appGuideBtn" class="app-guide-main">📖 GUÍA APP</button></div><div class="home-feature-actions" aria-label="Herramientas del Camino"><button data-feature="walk"><span>🚶</span><b>A PIE · RUTAS</b></button><button data-feature="bike"><span>🚴</span><b>RUTA BICI</b></button><button data-feature="compass"><span>🧭</span><b>BRÚJULA</b></button><button data-feature="sky"><span>✨</span><b>ESTRELLAS</b><small>Constelaciones</small></button></div><button id="aboutPrivacyBtn" class="about-privacy-main">ℹ ACERCA DE · PRIVACIDAD · DATOS</button><div class="connection-row"><span id="connectionStatus" role="status" aria-live="polite" class="connection-pill ${navigator.onLine?'online':'offline'}">${navigator.onLine?'● Con conexión':'● Sin conexión'}</span><small>La app básica funciona instalada; mapas, tiempo y servicios externos pueden necesitar internet.</small></div><div class="home-counters compact"><div>👁 <strong>${appVisitCount}</strong><span>visitas</span></div><div>👍 <strong>${likedStages.size}</strong><span>me gusta</span></div><div>💬 <strong>${comments.length}</strong><span>comentarios</span></div></div><small class="counter-note">Contadores de este dispositivo</small></section><section class="section home-first"><div class="section-head"><h2>Las 33 etapas</h2><button class="link-btn" data-nav="stages">Ver todas</button></div>${STAGES.slice(0,5).map(stageCard).join('')}</section><section class="section"><h2>Accesos rápidos</h2><div class="service-grid">${SERVICE_TYPES.slice(0,9).map(x=>`<button class="service-btn" data-quick="${x[1]}"><span>${x[0]}</span>${x[2]}</button>`).join('')}</div></section><section class="section support-card compact-support"><div><b>💛 Donación solidaria</b><span>Creador: ${esc(DONATION_CREATOR)}</span></div><button class="donate-main" data-donate>Donar</button></section>`;bindCommon();document.getElementById('whatsappShare').onclick=shareAppWhatsApp;document.getElementById('homeComments').onclick=openComments;document.getElementById('appGuideBtn').onclick=openAppGuide;document.getElementById('installAppBtn').onclick=installApp;document.getElementById('aboutPrivacyBtn').onclick=openAboutPrivacy;updateConnectionStatus();}
function stages(){cleanupMaps();currentView='stages';setActive('stages');app.innerHTML=`<section class="section"><h2>Etapas del Camino Francés</h2><input id="stageSearch" style="width:100%;padding:12px;border:1px solid #dce3eb;border-radius:12px;margin-bottom:12px" placeholder="Buscar localidad…"> <div id="stageList">${STAGES.map(stageCard).join('')}</div></section>`;bindCommon();document.getElementById('stageSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.getElementById('stageList').innerHTML=STAGES.filter(s=>(s.from+' '+s.to).toLowerCase().includes(q)).map(stageCard).join('');bindStageCards();};}
function detail(n,tab='resumen'){cleanupMaps();recordStageVisit(n);currentStageNo=n;currentDetailTab=tab;currentView=`detail-${n}`;setActive('stages');const s=STAGES.find(x=>x.n===n),liked=likedStages.has(n);app.innerHTML=`<section class="detail-head"><div class="backline"><button id="backBtn">‹ Volver</button><div class="detail-actions"><button id="favBtn" title="Favorito">${favorites.has('stage-'+n)?'♥':'♡'}</button><button id="likeBtn" class="${liked?'active':''}" title="Me gusta" aria-pressed="${liked}">👍</button><button id="shareBtn" title="Compartir">↗</button><button id="photoBtn" title="Fotos de la etapa">📷</button><button id="downloadBtn" title="Descargar ruta">⬇</button><button id="donateBtn" title="Donación">💛</button></div></div><div class="eyebrow">ETAPA ${n}</div><h1>${esc(s.from)} → ${esc(s.to)}</h1><div class="detail-stats"><span>🚶 ${s.km.toFixed(1)} km</span><span>◷ ${s.h}</span><span>⛰ +${s.gain} m</span><span>▥ ${esc(s.difficulty)}</span><span>👍 ${stageLikes(n)}</span><span>👁 ${stageVisits(n)}</span></div></section><div class="detail-feature-actions" aria-label="Herramientas de la etapa"><button data-feature="walk" data-feature-no="${n}"><span>🚶</span>A PIE</button><button data-feature="bike" data-feature-no="${n}"><span>🚴</span>BICI</button><button data-feature="compass" data-feature-no="${n}"><span>🧭</span>BRÚJULA</button><button data-feature="sky" data-feature-no="${n}"><span>✨</span>ESTRELLAS</button></div><div class="detail-tabs">${['resumen','mapa','servicios','alojamientos'].map(t=>`<button data-tab="${t}" class="${t===tab?'active':''}">${t.toUpperCase()}</button>`).join('')}</div><div id="detailBody"></div>`;document.getElementById('backBtn').onclick=stages;document.getElementById('favBtn').onclick=()=>{toggleFavoriteStage(n,document.getElementById('favBtn'));setTimeout(()=>detail(n,tab),0)};document.getElementById('likeBtn').onclick=()=>toggleLike(n,document.getElementById('likeBtn'));document.getElementById('shareBtn').onclick=()=>shareStage(n);document.getElementById('photoBtn').onclick=()=>openStagePhotos(n);document.getElementById('downloadBtn').onclick=()=>openRouteDownloads(n);document.getElementById('donateBtn').onclick=openDonation;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>detail(n,b.dataset.tab));bindFeatureButtons();renderDetail(s,tab);}
function renderDetail(s,tab){const body=document.getElementById('detailBody');if(tab==='resumen'){body.innerHTML=`<section class="section"><div class="stat-grid"><div class="stat">🚶<strong>${s.km.toFixed(1)} km</strong><span>Distancia</span></div><div class="stat">◷<strong>${s.h}</strong><span>Tiempo</span></div><div class="stat">⛰<strong>+${s.gain} m</strong><span>Desnivel</span></div><div class="stat">▥<strong>${esc(s.difficulty)}</strong><span>Dificultad</span></div></div>${s.n===1?'<div class="warning"><strong>⛰ Alta montaña.</strong> Ruta de Napoleón. Revisa meteorología y avisos antes de salir; con mala visibilidad, nieve, hielo o tormenta, prioriza la alternativa segura y las indicaciones oficiales.</div>':''}<h2>Preparación</h2><div id="stageWeatherPanel" class="weather-panel"><div class="weather-loading">🌦 Cargando tiempo de la etapa…</div></div><button id="summaryDoubts" class="summary-doubts">❓ DUDAS · CONSEJOS DEL PEREGRINO</button><div class="route-download-cta"><div><b>⬇ Ruta para GPS / Wikiloc</b><span>GPX, GPX + servicios, KML y TCX</span></div><button id="summaryDownload">DESCARGAR</button></div><h2 style="margin-top:22px">Fotos de peregrinos</h2><div id="stagePhotoPreview" class="stage-photo-preview"></div><h2 style="margin-top:22px">Mapa topográfico</h2><div class="map-toolbar"><button id="summaryRoute" class="map-chip ${routeVisible?'active':''}">🟨 Ruta ${routeVisible?'ON':'OFF'}</button><button id="summaryCompass" class="map-chip map-compass-toggle">🧭 BRÚJULA</button><button id="summary3D" class="map-chip terrain-chip">🏔 3D</button><button id="summaryBig" class="map-chip primary">⛶ AMPLIAR MAPA</button></div><div id="summaryMap" class="bc-map"></div><div class="map-note">El mapa usa un motor propio de BUEN CAMINO: no depende de Leaflet ni de librerías externas. Si OpenTopoMap falla, cada tesela intenta cargar OpenStreetMap como respaldo.</div></section>`;setTimeout(()=>{mainMap=buildStageMap('summaryMap',s.n,false);mainMapCompass=attachMapCompass(mainMap,document.getElementById('summaryCompass'));document.getElementById('summaryRoute').onclick=()=>toggleRoute(document.getElementById('summaryRoute'));document.getElementById('summary3D').onclick=()=>open3DMap(s.n);document.getElementById('summaryBig').onclick=()=>openFocusMap(s.n);const doubts=document.getElementById('summaryDoubts');if(doubts)doubts.onclick=openDoubts;const dl=document.getElementById('summaryDownload');if(dl)dl.onclick=()=>openRouteDownloads(s.n);loadStageWeather(s.n);renderStagePhotoPreview(s.n);},0);}
else if(tab==='mapa'){body.innerHTML=`<div class="map-workspace"><div class="map-shell"><div id="stageMap" class="bc-map tall"></div><div class="map-floats"><button id="routeFloat" class="map-float ${routeVisible?'active':''}">🟨 RUTA ${routeVisible?'ON':'OFF'}</button><button id="profileFloat" class="map-float">⛰ PERFIL</button><button id="servicesFloat" class="map-float">📌 SERVICIOS</button><button id="gpsFloat" class="map-float">📍 GPS</button><button id="compassFloat" class="map-float map-compass-toggle">🧭 BRÚJULA</button><button id="terrainFloat" class="map-float terrain-main">🏔 3D</button><button id="focusFloat" class="map-float main">⛶ MAPA GRANDE</button></div><aside id="stageProfilePanel" class="map-profile-overlay"><div class="elevation-head"><div><span>PERFIL DE DESNIVEL</span><strong id="elevReadout">Toca o desliza</strong></div><button id="stageProfileClose" class="profile-close" aria-label="Ocultar perfil">×</button></div><div id="elevationChart" class="elevation-chart"></div></aside></div></div>`;setTimeout(()=>{mainMap=buildStageMap('stageMap',s.n,false);mainMapCompass=attachMapCompass(mainMap,document.getElementById('compassFloat'));setupProfile('elevationChart',s.n,mainMap);const panel=document.getElementById('stageProfilePanel'),toggle=()=>panel.classList.toggle('profile-hidden');document.getElementById('routeFloat').onclick=()=>toggleRoute(document.getElementById('routeFloat'));document.getElementById('profileFloat').onclick=toggle;document.getElementById('stageProfileClose').onclick=toggle;document.getElementById('servicesFloat').onclick=()=>showMapServices(s.n,mainMap);document.getElementById('gpsFloat').onclick=()=>locate(mainMap);document.getElementById('terrainFloat').onclick=()=>open3DMap(s.n);document.getElementById('focusFloat').onclick=()=>openFocusMap(s.n);},0);}
else if(tab==='servicios'){renderServicesTab(s.n,false)}
else renderServicesTab(s.n,true);
}

function renderServicesTab(n,onlyLodging){
 const body=document.getElementById('detailBody'),buttons=(onlyLodging?[SERVICE_TYPES[0]]:SERVICE_TYPES);
 body.innerHTML=`<section class="section"><div class="section-head service-head"><h2>${onlyLodging?'Alojamientos':'Servicios de la etapa'}</h2><div class="service-head-actions"><button id="servicesMapBtn" class="aemet-btn secondary">📍 MAPA</button>${!onlyLodging?'<button id="aemetBtn" class="aemet-btn">🌦 AEMET</button>':''}</div></div><p class="map-note">Aquí se cargan también servicios actuales de OpenStreetMap a lo largo de la ruta. Cada lugar puede incluir teléfono, web, dirección, Maps, Google Earth, fotos y cómo llegar.</p><div class="pilgrim-priority"><button class="priority-service albergue" data-special-service="albergues"><span>🥾</span><b>ALBERGUES DEL CAMINO</b><small>En orden de marcha</small></button><button class="priority-service menu" data-special-service="menu"><span>🍲</span><b>MENÚ PEREGRINO</b><small>Verificado / confirmar</small></button></div><div class="pilgrim-needs"><button data-service="agua">💧<b>AGUA</b></button><button data-service="comer">🍴<b>COMER</b></button><button data-service="farmacia">🩹<b>BOTIQUÍN</b></button><button data-service="tienda">🔋<b>PILAS / CAPA</b></button><button data-service="informacion">🪪<b>CREDENCIAL</b></button></div><div class="service-grid">${buttons.map(x=>`<button class="service-btn" data-service="${x[1]}"><span>${x[0]}</span>${x[2]}</button>`).join('')}</div><div id="serviceResults"></div></section>`;
 const clearActive=()=>document.querySelectorAll('[data-service],[data-special-service]').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{clearActive();b.classList.add('active');showServiceList(n,b.dataset.service)});
 document.querySelectorAll('[data-special-service]').forEach(b=>b.onclick=()=>{clearActive();b.classList.add('active');showSpecialServiceList(n,b.dataset.specialService)});
 if(onlyLodging)document.querySelector('[data-special-service="albergues"]')?.click();
 document.getElementById('servicesMapBtn').onclick=()=>{detail(n,'mapa');setTimeout(()=>{if(mainMap){showMapServices(n,mainMap)}},120)};
 const a=document.getElementById('aemetBtn');if(a)a.onclick=()=>window.open(aemetUrl(n),'_blank','noopener');
}
async function showServiceList(n,type){const host=document.getElementById('serviceResults');if(!host)return;host.innerHTML='<div class="empty">Cargando datos abiertos de esta etapa…</div>';const all=await servicesForStage(n);if(!host.isConnected)return;let items=all.filter(x=>x.type===type).sort((a,b)=>(a.km??9999)-(b.km??9999));if(!items.length){host.innerHTML=`<div class="empty"><b>No hay datos abiertos suficientes para esta categoría.</b><p>No inventamos teléfonos ni establecimientos. Puedes consultar OpenStreetMap como respaldo.</p><a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(type+' '+STAGES[n-1].to)}" target="_blank" rel="noopener">Buscar en OpenStreetMap</a></div>`;return}const phoneCount=items.filter(x=>x.phone||x.phone2).length,webCount=items.filter(x=>x.website).length,hoursCount=items.filter(x=>x.hours).length,addressCount=items.filter(x=>x.address).length,completeCount=items.filter(x=>(x.phone||x.phone2)&&x.website&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)).length;host.innerHTML=`<div class="service-summary"><b>${items.length} resultados · ordenados por km</b><span>✓ ${completeCount} completos</span><span>📞 ${phoneCount} con teléfono</span><span>🌐 ${webCount} con web</span><span>🕒 ${hoursCount} con horario</span><span>📍 ${addressCount} con dirección</span></div>`+items.slice(0,80).map(serviceCard).join('')+`<p class="data-source-note">Open Pilgrimages / OpenStreetMap + datos locales verificados. Los datos pueden cambiar: conviene confirmar horarios, precios y disponibilidad.</p>`;}
function serviceIcon(type){return ({alojamiento:'🛏',comer:'🍴',agua:'💧',policia:'👮',farmacia:'✚',salud:'❤',taxi:'🚕',transporte:'🚌',tienda:'🛒',cajero:'🏧',wc:'🚻',bici:'🚲',informacion:'🟨',ayuntamiento:'🏛',gps:'📍'})[type]||'📍';}
function serviceCard(x){const q=x.query||x.name;const mapLink=x.lat?mapsUrl(x.lat,x.lon):`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;const d=x.details||{};const facts=[];if(d.operator)facts.push(`👤 ${esc(d.operator)}`);if(d.beds)facts.push(`🛏 ${esc(d.beds)} camas`);if(d.rooms)facts.push(`🚪 ${esc(d.rooms)} hab.`);if(d.stars)facts.push(`⭐ ${esc(d.stars)}`);if(d.cuisine)facts.push(`🍽 ${esc(d.cuisine)}`);if(d.charge)facts.push(`💶 ${esc(d.charge)}`);if(d.internet&&d.internet!=='no')facts.push(`📶 Internet`);if(d.wheelchair&&d.wheelchair!=='no')facts.push(`♿ ${esc(d.wheelchair)}`);if(d.reservation)facts.push(`📅 Reserva: ${esc(d.reservation)}`);const hasContact=x.phone||x.phone2||x.website||x.email,complete=!!((x.phone||x.phone2)&&x.website&&Number.isFinite(x.lat)&&Number.isFinite(x.lon));return `<article class="service-card ${x.pilgrimMenuVerified?'pilgrim-menu-card':''} ${x.pilgrimAlbergue?'pilgrim-albergue-card':''}"><div class="service-title"><span class="service-symbol">${x.specialIcon||serviceIcon(x.type)}</span>${x.pilgrimAlbergue&&serviceLogoUrl(x)?`<img class="service-logo" src="${esc(serviceLogoUrl(x))}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}<div><span class="kind">${esc(x.type)}${d.subtype?` · ${esc(d.subtype)}`:''}</span><h3>${esc(x.name)}</h3>${x.specialBadge?`<span class="special-service-badge">${esc(x.specialBadge)}</span>`:''}${complete?'<span class="data-complete">✓ Datos completos</span>':''}</div></div>${x.pilgrimAlbergue?`<div class="credential-strip"><span>🐚 Albergue del Camino</span><span class="${x.credentialStampInfo?.verified?'verified':''}">${esc(x.credentialStampInfo?.text||'Sello de credencial: confirmar en recepción')}</span></div>`:''}<div class="service-badges"><span class="${x.phone||x.phone2?'ok':'muted'}">📞 ${x.phone||x.phone2?'Teléfono':'Sin teléfono'}</span><span class="${x.website?'ok':'muted'}">🌐 ${x.website?'Web':'Sin web'}</span><span class="${x.hours?'ok':'muted'}">🕒 ${x.hours?'Horario':'Sin horario'}</span></div>${x.km!=null?`<p><b>🚶 Km ${Number(x.km).toFixed(1)}</b> del Camino</p>`:''}${x.address?`<p>📍 ${esc(x.address)}</p>`:''}${Number.isFinite(x.lat)?`<p class="coords">🧭 ${Number(x.lat).toFixed(5)}, ${Number(x.lon).toFixed(5)}</p>`:''}${x.hours?`<p><b>🕒 ${esc(x.hours)}</b></p>`:''}${facts.length?`<div class="service-facts">${facts.map(v=>`<span>${v}</span>`).join('')}</div>`:''}${d.description?`<p>ℹ️ ${esc(d.description)}</p>`:x.note?`<p>ℹ️ ${esc(x.note)}</p>`:''}${!hasContact?`<p class="missing-contact">No consta contacto publicado en los datos abiertos.</p>`:''}<div class="service-contact">${x.phone?`<a class="call" href="tel:${esc(x.phone.replace(/\s/g,''))}">📞 Llamar · ${esc(x.phone)}</a>`:''}${x.phone2?`<a class="call secondary-call" href="tel:${esc(x.phone2.replace(/\s/g,''))}">📞 ${esc(x.phone2)}</a>`:''}${x.website?`<a class="web" href="${esc(x.website)}" target="_blank" rel="noopener">🌐 Abrir sitio web</a>`:''}${x.email?`<a href="mailto:${esc(x.email)}">✉ ${esc(x.email)}</a>`:''}<a href="${mapLink}" target="_blank" rel="noopener">📍 Ver ubicación</a>${x.lat?`<a href="${directionsUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🚶 Cómo llegar</a><a class="earth-service" href="${earthUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🌍 Google Earth</a><a class="photo-service" href="${googleImageSearchUrl(x)}" target="_blank" rel="noopener">📷 Fotos del lugar</a><a href="${commonsNearbyUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🖼 Fotos cercanas</a><a href="${x.osmExact||osmUrl(x.lat,x.lon)}" target="_blank" rel="noopener">🗺 Ficha OSM</a>`:''}${x.pilgrimMenuSearch?`<a class="pilgrim-menu-search" href="${pilgrimMenuSearchUrl(x,x.stage||1)}" target="_blank" rel="noopener">🍲 Consultar menú peregrino</a>`:''}${!complete?`<a class="search-info" href="${publicSearchUrl(x)}" target="_blank" rel="noopener">🔎 Buscar información del lugar</a>`:''}${d.facebook?`<a href="${esc(d.facebook)}" target="_blank" rel="noopener">f Facebook</a>`:''}${d.instagram?`<a href="${esc(d.instagram)}" target="_blank" rel="noopener">◎ Instagram</a>`:''}</div></article>`;}

function findKartaPhoto(obj){
 const seen=new Set();function walk(v){if(!v||typeof v!=='object'||seen.has(v))return null;seen.add(v);if(Array.isArray(v)){for(const x of v){const r=walk(x);if(r)return r}return null}const keys=['fileurlProc','fileUrlProc','thumb','thumbnail','image','url','fileurl','fileUrl'];for(const k of keys){const u=v[k];if(typeof u==='string'&&/^https?:\/\//.test(u)&&/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u))return{url:u,meta:v}}for(const x of Object.values(v)){const r=walk(x);if(r)return r}return null}return walk(obj)
}
function closeStreetView(){document.getElementById('streetViewOverlay')?.remove()}
async function openStreetViewAt(lat,lon){
 closeStreetView();const ov=document.createElement('section');ov.id='streetViewOverlay';ov.className='street-view-overlay';ov.innerHTML=`<header><button id="streetBack" type="button">← MAPA</button><div><b>STREET VIEW</b><span>${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}</span></div><button id="streetClose" type="button" aria-label="Cerrar">×</button></header><div class="street-view-body"><div id="streetPreview" class="street-preview"><div class="feature-loading">🟨 Buscando imagen abierta a nivel de calle…</div></div><p>Se busca primero en <b>KartaView</b>, plataforma abierta de imágenes a nivel de calle. La cobertura puede ser irregular en caminos rurales.</p><div class="street-actions"><a href="https://kartaview.org/map/@${Number(lat).toFixed(6)},${Number(lon).toFixed(6)},17z" target="_blank" rel="noopener">KartaView ↗</a><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}" target="_blank" rel="noopener">Google Street View ↗</a></div><small>KartaView es la opción abierta y sin clave. Google Street View se ofrece como respaldo externo cuando exista cobertura.</small></div>`;document.body.appendChild(ov);document.getElementById('streetBack').onclick=closeStreetView;document.getElementById('streetClose').onclick=closeStreetView;
 const host=document.getElementById('streetPreview');try{const r=await fetch(`https://api.openstreetcam.org/2.0/photo/?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&radius=500`,{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json(),photo=findKartaPhoto(j);if(!photo?.url)throw 0;host.innerHTML=`<img src="${esc(photo.url)}" alt="Imagen de calle cercana de KartaView"><span>Imagen cercana · KartaView</span>`}catch{if(host)host.innerHTML='<div class="street-empty"><b>No aparece una imagen KartaView cercana.</b><span>Puedes probar los enlaces inferiores; la ausencia de imagen no significa que no exista camino.</span></div>'}
}

/* ---------- Motor de mapa propio ---------- */
function ll2world(lat,lon,z){const s=256*Math.pow(2,z),sin=Math.sin(lat*Math.PI/180);return{x:(lon+180)/360*s,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*s};}
function world2ll(x,y,z){const s=256*Math.pow(2,z),lon=x/s*360-180,n=Math.PI-2*Math.PI*y/s,lat=180/Math.PI*Math.atan(.5*(Math.exp(n)-Math.exp(-n)));return{lat,lon};}
class BCMap{
 constructor(el,opts={}){this.el=typeof el==='string'?document.getElementById(el):el;this.zoom=opts.zoom||11;this.center={lat:opts.lat||43.08,lon:opts.lon||-1.27};this.layer=opts.layer||'topo';this.route=[];this.routeOn=routeVisible;this.services=[];this.serviceFilter='all';this.extraLines=[];this.selectedRouteIndex=-1;this.onRoutePoint=null;this.travelMode=opts.travelMode||'';this._raf=0;this.tileNodes=new Map();this.activePointers=new Map();this.panStart=null;this.pinch=null;this.userInteracted=false;this._resizeHandler=()=>this.requestRender();this._build();this._bind();this.render();}
 _build(){this.el.innerHTML='<div class="bc-tiles"></div><svg class="bc-overlay"></svg><div class="bc-markers"></div><div class="bc-service-filters" hidden></div><div class="bc-map-controls"><button data-z="1" aria-label="Acercar">+</button><button data-z="-1" aria-label="Alejar">−</button></div><div class="bc-map-view-controls"><button class="bc-3d-mini" type="button" aria-label="Abrir mapa 3D"><span>3D</span></button><button class="bc-street-mini" type="button" aria-label="Abrir Street View cerca del centro del mapa"><span class="street-man" aria-hidden="true"></span><small>STREET<br>VIEW</small></button><button class="bc-symbols-btn" type="button" aria-label="Ver leyenda de símbolos del mapa topográfico">◉<small>SÍMBOLOS<br>TOPO</small></button></div><aside class="bc-map-legend topo-symbol-legend" hidden><div><b>🗺 LEYENDA DEL MAPA TOPO</b><button type="button" class="bc-map-legend-close" aria-label="Cerrar leyenda">×</button></div><small class="topo-legend-note">OpenTopoMap / OpenStreetMap · la forma exacta puede variar con el nivel de zoom.</small><span><i class="topo-contour"></i> Curva de nivel: altura del terreno</span><span><i class="topo-contour major"></i> Curva maestra / cota destacada</span><span><i class="topo-path"></i> Sendero, pista o camino</span><span><i class="topo-road major"></i> Carretera principal</span><span><i class="topo-road local"></i> Carretera local / calle</span><span><i class="topo-forest"></i> Bosque o zona de vegetación</span><span><i class="topo-water"></i> Río, arroyo, lago o embalse</span><span><i class="topo-building"></i> Edificio / zona construida</span><span><i class="topo-peak">▲</i> Cumbre / punto de altitud</span><span><i class="topo-parking">P</i> Aparcamiento</span><span><i class="topo-transport">▣</i> Transporte / parada</span><span><i class="topo-religious">✚</i> Elemento religioso; el icono concreto puede variar</span><small class="topo-legend-app-note">🟨 Las bolas y la línea azul/amarilla son de BUEN CAMINO, no del mapa Topo.</small></aside><button class="bc-center-route" title="Centrar toda la ruta" aria-label="Centrar ruta">🎯<span>RUTA</span></button><button class="bc-layer" title="Cambiar mapa" aria-label="Cambiar tipo de mapa"></button><div class="bc-scale"></div><div class="bc-map-msg">Cargando mapa…</div>';this.tiles=this.el.querySelector('.bc-tiles');this.svg=this.el.querySelector('.bc-overlay');this.markers=this.el.querySelector('.bc-markers');this.scale=this.el.querySelector('.bc-scale');this.msg=this.el.querySelector('.bc-map-msg');this.popup=null;this.serviceFilters=this.el.querySelector('.bc-service-filters');this.updateLayerButton();}
 updateLayerButton(){const b=this.el.querySelector('.bc-layer');if(!b)return;const topo=this.layer==='topo';b.textContent=topo?'🛣 CALLES':'⛰ TOPO';b.title=topo?'Cambiar a mapa de calles':'Cambiar a mapa topográfico';b.setAttribute('aria-label',b.title);b.classList.toggle('streets',!topo);}
 clearTileNodes(){for(const img of this.tileNodes.values())img.remove();this.tileNodes.clear();}
 toggleLayer(){this.layer=this.layer==='topo'?'osm':'topo';if(this.layer==='topo'&&this.zoom>17)this.zoom=17;this.clearTileNodes();this.updateLayerButton();this.render();toast(this.layer==='topo'?'Mapa topográfico':'Mapa de calles');}
 _bind(){this.el.querySelectorAll('[data-z]').forEach(b=>b.onclick=e=>{e.stopPropagation();this.userInteracted=true;this.setZoom(this.zoom+Number(b.dataset.z));});this.el.querySelector('.bc-layer').onclick=e=>{e.stopPropagation();this.userInteracted=true;this.toggleLayer();};this.el.querySelector('.bc-center-route').onclick=e=>{e.stopPropagation();if(!this.route?.length){toast('La ruta todavía se está cargando');return}this.userInteracted=false;this.fitRoute();toast('🎯 Ruta centrada');};const b3=this.el.querySelector('.bc-3d-mini');if(b3)b3.onclick=e=>{e.stopPropagation();open3DMap(this.stageNo||currentStageNo||1)};const street=this.el.querySelector('.bc-street-mini');if(street)street.onclick=e=>{e.stopPropagation();openStreetViewAt(this.center.lat,this.center.lon)};const symbols=this.el.querySelector('.bc-symbols-btn'),legend=this.el.querySelector('.bc-map-legend');if(symbols&&legend)symbols.onclick=e=>{e.stopPropagation();legend.hidden=!legend.hidden;symbols.classList.toggle('active',!legend.hidden)};this.el.querySelector('.bc-map-legend-close')?.addEventListener('click',e=>{e.stopPropagation();legend.hidden=true;symbols?.classList.remove('active')});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const resetTransforms=()=>{for(const node of [this.tiles,this.svg,this.markers])node.style.transform='';};
  this.el.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,.route-popup'))return;e.preventDefault();this.userInteracted=true;this.closePopup();this.el.setPointerCapture?.(e.pointerId);this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.activePointers.size===1){this.panStart={x:e.clientX,y:e.clientY,cp:ll2world(this.center.lat,this.center.lon,this.zoom),dx:0,dy:0};this.pinch=null;}else if(this.activePointers.size===2){const pts=[...this.activePointers.values()];this.panStart=null;resetTransforms();this.pinch={lastDist:Math.max(1,dist(pts[0],pts[1]))};}});
  this.el.addEventListener('pointermove',e=>{if(!this.activePointers.has(e.pointerId))return;e.preventDefault();this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.activePointers.size>=2){const pts=[...this.activePointers.values()].slice(0,2),d=Math.max(1,dist(pts[0],pts[1]));if(!this.pinch)this.pinch={lastDist:d};const ratio=d/this.pinch.lastDist;if(ratio>1.15&&this.zoom<18){this.pinch.lastDist=d;this.setZoom(this.zoom+1);}else if(ratio<0.87&&this.zoom>5){this.pinch.lastDist=d;this.setZoom(this.zoom-1);}return;}if(this.panStart){const dx=e.clientX-this.panStart.x,dy=e.clientY-this.panStart.y;this.panStart.dx=dx;this.panStart.dy=dy;for(const node of [this.tiles,this.svg,this.markers])node.style.transform=`translate(${dx}px,${dy}px)`;}});
  const finish=e=>{if(this.activePointers.has(e.pointerId))this.activePointers.delete(e.pointerId);if(this.activePointers.size===0){if(this.panStart){const ll=world2ll(this.panStart.cp.x-this.panStart.dx,this.panStart.cp.y-this.panStart.dy,this.zoom);this.center=ll;}this.panStart=null;this.pinch=null;resetTransforms();this.render();}else if(this.activePointers.size===1){resetTransforms();const p=[...this.activePointers.values()][0];this.panStart={x:p.x,y:p.y,cp:ll2world(this.center.lat,this.center.lon,this.zoom),dx:0,dy:0};this.pinch=null;}};
  this.el.addEventListener('pointerup',finish);this.el.addEventListener('pointercancel',finish);this.el.addEventListener('dblclick',e=>{e.preventDefault();this.setZoom(this.zoom+1)});window.addEventListener('resize',this._resizeHandler,{passive:true});}
 requestRender(){if(this._raf)return;this._raf=requestAnimationFrame(()=>{this._raf=0;this.render();});}
 setZoom(z){const max=this.layer==='topo'?17:18;this.zoom=Math.max(5,Math.min(max,z));this.closePopup();this.render();}
 setRoute(route,fit=true){this.route=route||[];if(fit&&this.route.length)this.fitRoute();else this.render();}
 setRouteVisible(on){this.routeOn=on;this.renderOverlay();}
 fitRoute(){if(!this.route.length)return;const lats=this.route.map(p=>p[0]),lons=this.route.map(p=>p[1]);const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);this.center={lat:(minLat+maxLat)/2,lon:(minLon+maxLon)/2};const w=Math.max(250,this.el.clientWidth),h=Math.max(250,this.el.clientHeight);for(let z=17;z>=6;z--){const a=ll2world(maxLat,minLon,z),b=ll2world(minLat,maxLon,z);if(Math.abs(b.x-a.x)<w*.86&&Math.abs(b.y-a.y)<h*.82){this.zoom=z;break}}this.render();}
 addServices(items){this.services=items||[];this.serviceFilter='all';this.renderServiceFilters();this.renderMarkers();}
 clearServices(){this.services=[];this.serviceFilter='all';this.renderServiceFilters();this.renderMarkers();}
 renderServiceFilters(){const h=this.serviceFilters;if(!h)return;if(!this.services.length){h.hidden=true;h.innerHTML='';return}h.hidden=false;const defs=[['all','Todos'],['alojamiento','🛏'],['comer','🍴'],['agua','💧'],['salud','✚']];h.innerHTML=defs.map(([k,l])=>`<button data-sf="${k}" class="${this.serviceFilter===k?'active':''}" title="${k==='all'?'Todos los servicios':k}">${l}</button>`).join('');h.querySelectorAll('[data-sf]').forEach(b=>b.onclick=e=>{e.stopPropagation();this.serviceFilter=b.dataset.sf;this.renderServiceFilters();this.renderMarkers()})}
 serviceMatches(s){if(this.serviceFilter==='all')return true;if(this.serviceFilter==='salud')return s.type==='salud'||s.type==='farmacia';return s.type===this.serviceFilter}
 clusterServices(items){const radius=this.zoom>=17?22:this.zoom>=15?34:this.zoom>=13?46:58,clusters=[];for(const s of items){const p=this.pixel(s.lat,s.lon);let best=null,bd=Infinity;for(const c of clusters){const d=Math.hypot(p.x-c.x,p.y-c.y);if(d<radius&&d<bd){best=c;bd=d}}if(best){best.items.push(s);best.x=(best.x*(best.items.length-1)+p.x)/best.items.length;best.y=(best.y*(best.items.length-1)+p.y)/best.items.length;best.lat=(best.lat*(best.items.length-1)+s.lat)/best.items.length;best.lon=(best.lon*(best.items.length-1)+s.lon)/best.items.length}else clusters.push({items:[s],x:p.x,y:p.y,lat:s.lat,lon:s.lon})}return clusters}
 setTravelMode(mode){this.travelMode=mode||'';this.renderMarkers();}
 setExtraLines(lines){this.extraLines=lines||[];this.renderOverlay();}
 setSelectedRouteIndex(i){this.selectedRouteIndex=i;this.renderOverlay();}
 render(){const w=this.el.clientWidth,h=this.el.clientHeight;if(w<20||h<20)return;this.renderTiles(w,h);this.renderOverlay();this.renderMarkers();this.renderScale();}
 tileUrl(z,x,y){if(this.layer==='topo'&&z<=17){const subs=['a','b','c'],sub=subs[Math.abs(x+y)%subs.length];return`https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;}return`https://tile.openstreetmap.org/${z}/${x}/${y}.png`;}
 renderTiles(w,h){const z=this.zoom,layer=this.layer,c=ll2world(this.center.lat,this.center.lon,z),ox=c.x-w/2,oy=c.y-h/2,ts=256,n=Math.pow(2,z);const minX=Math.floor(ox/ts),maxX=Math.floor((ox+w)/ts),minY=Math.floor(oy/ts),maxY=Math.floor((oy+h)/ts),needed=new Set();let visibleLoaded=0,total=0;for(let ty=minY;ty<=maxY;ty++){if(ty<0||ty>=n)continue;for(let tx=minX;tx<=maxX;tx++){const wx=((tx%n)+n)%n,key=`${layer}:${z}:${wx}:${ty}`;needed.add(key);total++;let img=this.tileNodes.get(key);if(!img){img=document.createElement('img');img.className='bc-tile';img.alt='';img.decoding='async';img.draggable=false;img.dataset.key=key;img.onload=()=>{img.dataset.loaded='1';if(this.msg)this.msg.style.display='none'};img.onerror=()=>{if(layer==='topo'&&!img.dataset.fallback){img.dataset.fallback='1';img.src=`https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`;return}img.style.opacity='.18'};img.src=this.tileUrl(z,wx,ty);this.tileNodes.set(key,img);this.tiles.appendChild(img);}img.style.left=(tx*ts-ox)+'px';img.style.top=(ty*ts-oy)+'px';if(img.dataset.loaded==='1')visibleLoaded++;}}
  for(const [key,img] of [...this.tileNodes]){if(!needed.has(key)){img.remove();this.tileNodes.delete(key);}}
  this.msg.textContent='Cargando mapa…';this.msg.style.display=visibleLoaded?'none':'block';const seq=(this._tileSeq||0)+1;this._tileSeq=seq;setTimeout(()=>{if(this.msg&&this._tileSeq===seq&&![...this.tileNodes.values()].some(i=>i.dataset.loaded==='1')){this.msg.textContent='El fondo tarda en cargar. La ruta local sigue disponible.'}},1800);}
 pixel(lat,lon){const w=this.el.clientWidth,h=this.el.clientHeight,c=ll2world(this.center.lat,this.center.lon,this.zoom),p=ll2world(lat,lon,this.zoom);return{x:w/2+(p.x-c.x),y:h/2+(p.y-c.y)};}
 renderOverlay(){const w=this.el.clientWidth,h=this.el.clientHeight;this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);this.svg.innerHTML='';const ns='http://www.w3.org/2000/svg';for(const linePts of this.extraLines){if(!linePts?.length)continue;const pxy=linePts.map(p=>this.pixel(p[0],p[1]));const e=document.createElementNS(ns,'polyline');e.setAttribute('points',pxy.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));e.setAttribute('fill','none');e.setAttribute('stroke','#1267d6');e.setAttribute('stroke-width',this.zoom>=13?'4':'3');e.setAttribute('opacity','.9');e.setAttribute('stroke-linecap','round');e.style.pointerEvents='none';this.svg.appendChild(e)}if(!this.routeOn||!this.route.length)return;const pts=this.route.map(p=>this.pixel(p[0],p[1]));const poly=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');const halo=document.createElementNS(ns,'polyline');halo.setAttribute('points',poly);halo.setAttribute('fill','none');halo.setAttribute('stroke','#fff4bd');halo.setAttribute('stroke-width',this.zoom>=15?'5':'4');halo.setAttribute('stroke-linecap','round');halo.setAttribute('stroke-linejoin','round');this.svg.appendChild(halo);const line=document.createElementNS(ns,'polyline');line.setAttribute('points',poly);line.setAttribute('fill','none');line.setAttribute('stroke','#0a3f86');line.setAttribute('stroke-width',this.zoom>=15?'2.8':'2.2');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');this.svg.appendChild(line);const target=this.zoom>=16?102:this.zoom>=14?68:41,step=Math.max(1,Math.ceil(this.route.length/target)),r=this.zoom>=17?10:this.zoom>=16?8.5:this.zoom>=15?7:this.zoom>=13?5.5:4.5;for(let i=0;i<this.route.length;i+=step)this.addRouteCircle(i,r);if((this.route.length-1)%step!==0)this.addRouteCircle(this.route.length-1,r);if(this.selectedRouteIndex>=0){const p=pts[Math.min(this.selectedRouteIndex,pts.length-1)];const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',r+5);c.setAttribute('fill','#ffc400');c.setAttribute('stroke','#e92b2b');c.setAttribute('stroke-width','3');this.svg.appendChild(c);}}
 addRouteCircle(i,r){const ns='http://www.w3.org/2000/svg',p=this.pixel(this.route[i][0],this.route[i][1]),c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',r);c.setAttribute('fill','#ffc400');c.setAttribute('stroke','#17345f');c.setAttribute('stroke-width','1.6');c.style.pointerEvents='all';c.style.cursor='pointer';c.addEventListener('click',e=>{e.stopPropagation();this.selectRoutePoint(i,p.x,p.y)});this.svg.appendChild(c);}
 selectRoutePoint(i,x,y){this.selectedRouteIndex=i;this.renderOverlay();this.onRoutePoint?.(i);this.closePopup();const p=this.route[i],samples=buildElevationSamples(this.stageNo||currentStageNo||1,[this.route]),idx=samples.length?nearestSample(samples,p[0],p[1]):0,s=samples[idx];const d=document.createElement('div');d.className='route-popup';d.style.left=x+'px';d.style.top=y+'px';d.innerHTML=`<strong>🟨 ${s?`Km ${s.km.toFixed(1)} · ${Math.round(s.ele)} m`:'Punto de ruta'}</strong><small>${p[0].toFixed(6)}, ${p[1].toFixed(6)}</small><div class="route-photo"></div><div class="popup-actions"><a href="${mapsUrl(p[0],p[1])}" target="_blank" rel="noopener">📍 Maps</a><a href="${earthUrl(p[0],p[1])}" target="_blank" rel="noopener">🌍 Earth</a><a href="${osmUrl(p[0],p[1])}" target="_blank" rel="noopener">🗺 OSM</a><a href="${commonsNearbyUrl(p[0],p[1])}" target="_blank" rel="noopener">📷 Fotos</a><button class="route-nearby-services">📌 Servicios cerca</button></div>`;this.el.appendChild(d);this.popup=d;d.querySelector('.route-nearby-services').onclick=e=>{e.stopPropagation();openNearbyServices(p[0],p[1],this.stageNo||currentStageNo||1)};loadNearbyPhoto(p[0],p[1],d.querySelector('.route-photo'));}
 closePopup(){this.popup?.remove();this.popup=null;}
 renderMarkers(){
  this.markers.innerHTML='';
  const visible=this.services.filter(s=>Number.isFinite(s.lat)&&this.serviceMatches(s)),clusters=this.clusterServices(visible);
  for(const c of clusters){
   if(c.items.length>1){const b=document.createElement('button');b.className='bc-marker bc-cluster';b.style.left=c.x+'px';b.style.top=c.y+'px';b.textContent=String(c.items.length);b.title=`${c.items.length} servicios · toca para acercar`;b.onclick=e=>{e.stopPropagation();this.center={lat:c.lat,lon:c.lon};this.setZoom(Math.min(this.zoom+2,this.layer==='topo'?17:18))};this.markers.appendChild(b);continue}
   const s=c.items[0],p={x:c.x,y:c.y},b=document.createElement('button');b.className='bc-marker';b.style.left=p.x+'px';b.style.top=p.y+'px';const markerIcon=s.specialIcon||serviceIcon(s.type);b.textContent=markerIcon;b.title=s.name;b.onclick=e=>{e.stopPropagation();this.closePopup();const d=document.createElement('div');d.className='route-popup service-popup';d.style.left=p.x+'px';d.style.top=p.y+'px';d.innerHTML=`<strong>${s.specialIcon||serviceIcon(s.type)} ${esc(s.name)}</strong>${s.specialBadge?`<small class="popup-special">${esc(s.specialBadge)}</small>`:''}${s.km!=null?`<small>Km ${Number(s.km).toFixed(1)} del Camino</small>`:''}${s.address?`<small>📍 ${esc(s.address)}</small>`:''}${s.hours?`<small>🕒 ${esc(s.hours)}</small>`:''}${s.phone?`<div class="popup-phone">📞 ${esc(s.phone)}</div>`:''}<div class="popup-actions">${s.phone?`<a href="tel:${s.phone.replace(/\s/g,'')}">📞 Llamar</a>`:''}${s.website?`<a href="${esc(s.website)}" target="_blank" rel="noopener">🌐 Web</a>`:''}<a href="${mapsUrl(s.lat,s.lon)}" target="_blank" rel="noopener">📍 Mapa</a><a href="${directionsUrl(s.lat,s.lon)}" target="_blank" rel="noopener">🚶 Ir</a><a href="${earthUrl(s.lat,s.lon)}" target="_blank" rel="noopener">🌍 Earth</a></div>`;this.el.appendChild(d);this.popup=d};this.markers.appendChild(b)
  }
  if(this.travelMode&&this.route?.length){
   const bike=this.travelMode==='bike',entries=[{p:this.route[0],icon:bike?'🚴':'🚶',label:bike?'Inicio ruta bici':'Inicio ruta a pie',kind:'start'},{p:this.route.at(-1),icon:'🏁',label:bike?'Fin ruta bici':'Fin ruta a pie',kind:'finish'}];
   for(const x of entries){const q=this.pixel(x.p[0],x.p[1]),b=document.createElement('button');b.type='button';b.className=`bc-marker bc-travel-marker ${bike?'bike':'walk'} ${x.kind}`;b.style.left=q.x+'px';b.style.top=q.y+'px';b.textContent=x.icon;b.title=x.label;b.setAttribute('aria-label',x.label);b.onclick=e=>{e.stopPropagation();toast(x.label)};this.markers.appendChild(b)}
  }
 }
 renderScale(){const lat=this.center.lat,metersPerPixel=156543.03392*Math.cos(lat*Math.PI/180)/Math.pow(2,this.zoom),targetPx=90,raw=metersPerPixel*targetPx;const nice=raw>1000?Math.round(raw/1000)+' km':Math.max(10,Math.round(raw/10)*10)+' m';this.scale.textContent=nice;}
 destroy(){window.removeEventListener('resize',this._resizeHandler);this.activePointers.clear();this.clearTileNodes();this.el.innerHTML='';}
}
function localRoute(n){return (typeof LOCAL_VERIFIED_STAGE_ROUTES!=='undefined'&&LOCAL_VERIFIED_STAGE_ROUTES[n])?LOCAL_VERIFIED_STAGE_ROUTES[n].map(p=>[+p[0],+p[1]]):[];}
function buildStageMap(id,n,services=false){const route=localRoute(n),m=new BCMap(id,{lat:42.65,lon:-4.0,zoom:6,layer:'topo'});m.stageNo=n;m.setRoute(route);m.setRouteVisible(routeVisible);if(route.length)loadMotorways(m,route);if(services)servicesForStage(n).then(items=>{if(m.el?.isConnected)m.addServices(items.filter(x=>Number.isFinite(x.lat)).slice(0,160))});setTimeout(()=>upgradeStageRoute(n,m),120);return m;}
async function loadMotorways(map,route){if(!map||!route?.length)return;const lats=route.map(p=>p[0]),lons=route.map(p=>p[1]),pad=.025,s=Math.min(...lats)-pad,w=Math.min(...lons)-pad,n=Math.max(...lats)+pad,e=Math.max(...lons)+pad;const q=`[out:json][timeout:7];way[\"highway\"~\"^(motorway|motorway_link)$\"](${s},${w},${n},${e});out geom;`;const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),6000);try{const r=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q),{signal:ctrl.signal});if(!r.ok)return;const j=await r.json();const lines=(j.elements||[]).filter(x=>Array.isArray(x.geometry)).map(x=>x.geometry.map(p=>[p.lat,p.lon]));map.setExtraLines(lines)}catch{}finally{clearTimeout(t)}}
function cleanupMaps(){stopFeatureSensors();mapCompassActive=null;mapCompassResume=null;mainMapCompass=null;focusMapCompass=null;mainMap?.destroy?.();mainMap=null;focusMap?.destroy?.();focusMap=null;if(!focusOverlay.hidden)closeFocusMap();close3DMap();}
function toggleRoute(btn){routeVisible=!routeVisible;localStorage.setItem('bc-route',routeVisible?'1':'0');mainMap?.setRouteVisible(routeVisible);focusMap?.setRouteVisible(routeVisible);if(btn){btn.classList.toggle('active',routeVisible);btn.textContent=`🟨 ${btn.classList.contains('map-float')?'RUTA':'Ruta'} ${routeVisible?'ON':'OFF'}`;}toast(routeVisible?'Ruta visible':'Ruta oculta');}
async function showMapServices(n,map){if(map.services.length){map.clearServices();toast('Servicios ocultos');return}toast('Cargando servicios…');const items=(await servicesForStage(n)).filter(x=>Number.isFinite(x.lat)).slice(0,180);if(!map?.el?.isConnected)return;map.addServices(items);toast(`${items.length} servicios visibles en el mapa`)}
function locate(map){if(!navigator.geolocation){toast('GPS no disponible');return}toast('Buscando tu ubicación…');navigator.geolocation.getCurrentPosition(p=>{const {latitude,longitude,accuracy}=p.coords;map.center={lat:latitude,lon:longitude};map.zoom=15;map.render();const s={type:'gps',name:`Tu posición · ±${Math.round(accuracy)} m`,lat:latitude,lon:longitude};map.addServices([...map.services,s]);toast(`GPS ±${Math.round(accuracy)} m`)},()=>toast('No se pudo obtener ubicación. Revisa permisos.'),{enableHighAccuracy:true,timeout:12000,maximumAge:10000});}

function havKm(a,b){const R=6371,r=Math.PI/180,dlat=(b[0]-a[0])*r,dlon=(b[1]-a[1])*r,la1=a[0]*r,la2=b[0]*r,h=Math.sin(dlat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function buildElevationSamples(n,segs){if(!segs?.length)return[];const route=segs.flat();if(route.length<2)return[];if(n!==1){const pts=route.filter(p=>p[2]!=null&&Number.isFinite(Number(p[2])));if(pts.length<8)return[];const cum=[0];for(let i=1;i<route.length;i++)cum[i]=cum[i-1]+havKm(route[i-1],route[i]);const out=[];for(let k=0;k<Math.min(180,route.length);k++){const i=Math.round(k*(route.length-1)/(Math.min(180,route.length)-1));const p=route[i];if(p[2]!=null&&Number.isFinite(Number(p[2])))out.push({km:cum[i],lat:p[0],lon:p[1],ele:+p[2]})}return out.length>=8?out:[]} const cum=[0];for(let i=1;i<route.length;i++)cum[i]=cum[i-1]+havKm(route[i-1],route[i]);const anchors=STAGE1_ELEVATION_ANCHORS.map(a=>{let bi=0,bd=1e9;for(let i=0;i<route.length;i++){const d=(route[i][0]-a[0])**2+(route[i][1]-a[1])**2;if(d<bd){bd=d;bi=i}}return{idx:bi,km:cum[bi],ele:a[2]}}).sort((a,b)=>a.idx-b.idx);const clean=[];for(const a of anchors){if(!clean.length||a.idx>clean.at(-1).idx)clean.push(a)}if(clean.length<2)return[];const elev=km=>{if(km<=clean[0].km)return clean[0].ele;if(km>=clean.at(-1).km)return clean.at(-1).ele;let j=0;while(j<clean.length-2&&clean[j+1].km<km)j++;const a=clean[j],b=clean[j+1],t=(km-a.km)/Math.max(.00001,b.km-a.km);return a.ele+(b.ele-a.ele)*t};const total=cum.at(-1),out=[];let ri=0;for(let k=0;k<180;k++){const km=total*k/179;while(ri<cum.length-2&&cum[ri+1]<km)ri++;const t=(km-cum[ri])/Math.max(.00001,cum[ri+1]-cum[ri]);out.push({km,lat:route[ri][0]+(route[ri+1][0]-route[ri][0])*t,lon:route[ri][1]+(route[ri+1][1]-route[ri][1])*t,ele:elev(km)})}return out;}
function nearestSample(samples,lat,lon){let b=0,bd=1e9;for(let i=0;i<samples.length;i++){const d=(samples[i].lat-lat)**2+(samples[i].lon-lon)**2;if(d<bd){bd=d;b=i}}return b;}
function nearestRoute(route,lat,lon){let b=0,bd=1e9;for(let i=0;i<route.length;i++){const d=(route[i][0]-lat)**2+(route[i][1]-lon)**2;if(d<bd){bd=d;b=i}}return b;}
function setupProfile(id,n,map,readoutId='elevReadout'){const host=document.getElementById(id);if(!host)return;if(!host.dataset.routeUpgradeBound){host.dataset.routeUpgradeBound='1';map.el.addEventListener('bc-route-upgraded',()=>{host.dataset.routeUpgradeBound='';setupProfile(id,n,map,readoutId)},{once:true});}const samples=buildElevationSamples(n,[map.route]);if(!samples.length){host.innerHTML='<div class="empty">Perfil verificado pendiente.</div>';return}const W=600,H=120,pad={l:28,r:8,t:8,b:19},min=Math.min(...samples.map(x=>x.ele)),max=Math.max(...samples.map(x=>x.ele)),x=i=>pad.l+i/(samples.length-1)*(W-pad.l-pad.r),y=e=>pad.t+(max-e)/(max-min||1)*(H-pad.t-pad.b),line=samples.map((p,i)=>`${x(i)},${y(p.ele)}`).join(' '),area=`${pad.l},${H-pad.b} ${line} ${W-pad.r},${H-pad.b}`;host.innerHTML=`<svg class="elevation-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polygon class="elev-fill" points="${area}"/><polyline class="elev-line" points="${line}"/><line id="elevCursor" class="elev-cursor" x1="${x(0)}" x2="${x(0)}" y1="${pad.t}" y2="${H-pad.b}"/><circle id="elevDot" class="elev-dot" cx="${x(0)}" cy="${y(samples[0].ele)}" r="5"/><text class="elev-label" x="2" y="14">${Math.round(max)} m</text><text class="elev-label" x="2" y="${H-6}">0 km</text><text class="elev-label" x="${W-42}" y="${H-6}">${samples.at(-1).km.toFixed(1)} km</text></svg>`;const svg=host.querySelector('svg'),cur=host.querySelector('#elevCursor'),dot=host.querySelector('#elevDot');const select=(idx,centerMap=false)=>{idx=Math.max(0,Math.min(samples.length-1,idx));const p=samples[idx];cur.setAttribute('x1',x(idx));cur.setAttribute('x2',x(idx));dot.setAttribute('cx',x(idx));dot.setAttribute('cy',y(p.ele));const r=document.getElementById(readoutId);if(r)r.textContent=`Km ${p.km.toFixed(1)} · ${Math.round(p.ele)} m`;const ri=nearestRoute(map.route,p.lat,p.lon);map.setSelectedRouteIndex(ri);if(centerMap){map.center={lat:p.lat,lon:p.lon};map.render();}};map.onRoutePoint=i=>{const p=map.route[i],idx=nearestSample(samples,p[0],p[1]);select(idx,false)};const fromEvent=e=>{const rect=svg.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*W,idx=Math.round((px-pad.l)/(W-pad.l-pad.r)*(samples.length-1));select(idx,false)};svg.addEventListener('pointerdown',e=>{svg.setPointerCapture?.(e.pointerId);fromEvent(e)});svg.addEventListener('pointermove',e=>{if(e.buttons||e.pressure>0)fromEvent(e)});select(0,false);}


/* ---------- Vista 3D gratuita: MapLibre + Mapterhorn ---------- */
let mapLibreLoadPromise=null,terrain3DRequestedFullscreen=false;
function loadMapLibre3D(){
 if(window.maplibregl)return Promise.resolve(window.maplibregl);
 if(mapLibreLoadPromise)return mapLibreLoadPromise;
 mapLibreLoadPromise=new Promise((resolve,reject)=>{
  if(!document.getElementById('bc-maplibre-css')){const l=document.createElement('link');l.id='bc-maplibre-css';l.rel='stylesheet';l.href='https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css';document.head.appendChild(l)}
  const urls=['https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js','https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js'];
  let i=0;
  const next=()=>{if(window.maplibregl){resolve(window.maplibregl);return}if(i>=urls.length){mapLibreLoadPromise=null;reject(new Error('No se pudo cargar el motor 3D'));return}const sc=document.createElement('script');sc.src=urls[i++];sc.async=true;sc.crossOrigin='anonymous';sc.onload=()=>window.maplibregl?resolve(window.maplibregl):next();sc.onerror=()=>{sc.remove();next()};document.head.appendChild(sc)};
  next();
 });
 return mapLibreLoadPromise;
}
function routeGeoJSON3D(route){return{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:(route||[]).map(p=>[+p[1],+p[0]])}}]}}
function routeSampleIndices3D(route,target=55){const n=route?.length||0;if(!n)return[];const step=Math.max(1,Math.ceil(n/target)),idx=[];for(let i=0;i<n;i+=step)idx.push(i);if(idx.at(-1)!==n-1)idx.push(n-1);return idx}
function routePointsGeoJSON3D(route){const features=routeSampleIndices3D(route).map(i=>{const p=route[i];return{type:'Feature',properties:{idx:i},geometry:{type:'Point',coordinates:[+p[1],+p[0]]}}});return{type:'FeatureCollection',features}}
function routeArrowsGeoJSON3D(route){const ids=routeSampleIndices3D(route),features=[];for(let j=0;j<ids.length-1;j++){const a=ids[j],b=ids[j+1],mid=Math.max(a,Math.min(b,Math.round((a+b)/2))),p=route[mid],from=route[a],to=route[b];if(!p||!from||!to)continue;features.push({type:'Feature',properties:{bearing:bearingDeg(from[0],from[1],to[0],to[1]),fromIdx:a,toIdx:b},geometry:{type:'Point',coordinates:[+p[1],+p[0]]}})}return{type:'FeatureCollection',features}}
function addRouteArrowImage3D(map){if(map.hasImage('bc-route-arrow'))return;const c=document.createElement('canvas');c.width=24;c.height=36;const x=c.getContext('2d');x.lineJoin='round';x.lineCap='round';x.beginPath();x.moveTo(8,33);x.lineTo(8,15);x.lineTo(3,15);x.lineTo(12,3);x.lineTo(21,15);x.lineTo(16,15);x.lineTo(16,33);x.closePath();x.fillStyle='#ffd21a';x.fill();x.lineWidth=3;x.strokeStyle='#17345f';x.stroke();map.addImage('bc-route-arrow',x.getImageData(0,0,c.width,c.height),{pixelRatio:2})}
function open3DRoutePointPopup(map,ml,route,idx,stageNo){
 const safe=Math.max(0,Math.min(route.length-1,Number(idx)||0)),p=route[safe];
 const node=document.createElement('div');node.className='terrain-popup terrain-route-popup';
 node.innerHTML=`<b>🟨 Punto de ruta 3D</b><small>${p[0].toFixed(6)}, ${p[1].toFixed(6)}</small><div class="route-photo terrain-route-photo"></div><div class="terrain-point-actions"><a href="${mapsUrl(p[0],p[1])}" target="_blank" rel="noopener">📍 Maps</a><a href="${earthUrl(p[0],p[1])}" target="_blank" rel="noopener">🌍 Earth</a><a href="${osmUrl(p[0],p[1])}" target="_blank" rel="noopener">🗺 OSM</a><a href="${commonsNearbyUrl(p[0],p[1])}" target="_blank" rel="noopener">📷 Commons</a><button type="button" class="terrain-nearby">📌 SERVICIOS CERCA</button></div>`;
 const pop=new ml.Popup({closeButton:true,maxWidth:'300px',focusAfterOpen:false}).setLngLat([p[1],p[0]]).setDOMContent(node).addTo(map);
 loadNearbyPhoto(p[0],p[1],node.querySelector('.terrain-route-photo'));const btn=node.querySelector('.terrain-nearby');
 btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();pop.remove();openNearbyServices(p[0],p[1],stageNo).catch(()=>toast('No se pudieron abrir los servicios cercanos'))});
 return pop;
}
function routeBearing3D(route){
 if(!route?.length||route.length<2)return 0;
 const a=route[Math.max(0,Math.floor(route.length*.08))],b=route[Math.min(route.length-1,Math.floor(route.length*.92))];
 const r=Math.PI/180,lat1=a[0]*r,lat2=b[0]*r,dLon=(b[1]-a[1])*r;
 const y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
 return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function close3DMap(){try{terrain3DMap?.remove?.()}catch{}terrain3DMap=null;try{screen.orientation?.unlock?.()}catch{}if(terrain3DRequestedFullscreen&&document.fullscreenElement){document.exitFullscreen?.().catch?.(()=>{})}terrain3DRequestedFullscreen=false;if(terrain3DOverlay){terrain3DOverlay.remove();terrain3DOverlay=null}document.body.classList.remove('terrain3d-open')}
async function toggle3DLandscape(){
 if(!terrain3DOverlay)return;
 const btn=document.getElementById('terrainRotate');
 if(window.innerWidth>window.innerHeight&&!terrain3DOverlay.classList.contains('force-landscape')){toast('El teléfono ya está en horizontal');setTimeout(()=>terrain3DMap?.resize?.(),180);return}
 try{if(terrain3DOverlay.requestFullscreen&&!document.fullscreenElement){await terrain3DOverlay.requestFullscreen();terrain3DRequestedFullscreen=true}if(screen.orientation?.lock){await screen.orientation.lock('landscape');if(btn)btn.textContent='↕ VERTICAL';setTimeout(()=>terrain3DMap?.resize?.(),260);return}}catch(e){}
 const on=terrain3DOverlay.classList.toggle('force-landscape');if(btn)btn.textContent=on?'↕ VERTICAL':'↻ HORIZONTAL';setTimeout(()=>terrain3DMap?.resize?.(),260);
}
async function open3DMap(n){
 close3DMap();
 const s=STAGES.find(x=>x.n===Number(n));
 terrain3DOverlay=document.createElement('section');terrain3DOverlay.className='terrain3d-overlay';terrain3DOverlay.innerHTML=`<div class="terrain3d-top"><div class="terrain3d-title"><b>BUEN CAMINO · 3D</b><span>Etapa ${n} · ${esc(s?.from||'')} → ${esc(s?.to||'')}</span></div><button id="terrainBase">⛰ TOPO</button><button id="terrainRoute">🟨 RUTA</button><button id="terrainCenter">🎯 CENTRAR</button><button id="terrainRouteView">👣 VISTA RUTA</button><button id="terrainLocate">📍 MI POSICIÓN</button><button id="terrainRelief">⛰ x1.2</button><button id="terrainNorth">↑ NORTE</button><button id="terrainServices">📌 SERVICIOS</button><button id="terrainRotate">↻ HORIZONTAL</button><button id="terrainClose">✕</button></div><button id="terrain2D" class="terrain2d-switch" aria-label="Volver al mapa 2D">🗺 2D</button><div id="terrain3DCanvas" class="terrain3d-canvas"><div class="terrain3d-loading"><strong>🏔 Preparando relieve 3D…</strong><span>El mapa 2D sigue disponible si tu móvil o la red no admiten 3D.</span></div></div><button id="terrainStreet" class="terrain-street-float" type="button" aria-label="Street View cerca del centro del mapa 3D"><span class="street-man" aria-hidden="true"></span><small>STREET<br>VIEW</small></button><button id="terrainSymbols" class="terrain-symbols-float" type="button">◉<small>SÍMBOLOS<br>TOPO</small></button><aside id="terrainLegend" class="terrain-map-legend topo-symbol-legend" hidden><b>🗺 LEYENDA DEL MAPA TOPO</b><small class="topo-legend-note">OpenTopoMap / OpenStreetMap · puede variar según zoom.</small><span><i class="topo-contour"></i> Curva de nivel: altura del terreno</span><span><i class="topo-contour major"></i> Curva maestra / cota</span><span><i class="topo-path"></i> Sendero, pista o camino</span><span><i class="topo-road major"></i> Carretera principal</span><span><i class="topo-road local"></i> Carretera local / calle</span><span><i class="topo-forest"></i> Bosque / vegetación</span><span><i class="topo-water"></i> Agua</span><span><i class="topo-building"></i> Edificio / zona construida</span><span><i class="topo-peak">▲</i> Cumbre / altitud</span><span><i class="topo-parking">P</i> Aparcamiento</span><span><i class="topo-transport">▣</i> Transporte / parada</span><span><i class="topo-religious">✚</i> Elemento religioso</span><small class="topo-legend-app-note">🟨 Ruta, bolas y flechas son superposiciones de BUEN CAMINO.</small><button id="terrainLegendClose" type="button">CERRAR</button></aside><div class="terrain3d-help">Dos dedos: inclinar y girar · Pellizcar: zoom · Arrastrar: mover</div>`;
 document.body.appendChild(terrain3DOverlay);document.body.classList.add('terrain3d-open');
 document.getElementById('terrainClose').onclick=close3DMap;document.getElementById('terrain2D').onclick=()=>{close3DMap();toast('Mapa 2D')};document.getElementById('terrainRotate').onclick=toggle3DLandscape;const terrainLegend=document.getElementById('terrainLegend');document.getElementById('terrainSymbols').onclick=()=>terrainLegend.hidden=!terrainLegend.hidden;document.getElementById('terrainLegendClose').onclick=()=>terrainLegend.hidden=true;document.getElementById('terrainStreet').onclick=()=>{const c=terrain3DMap?.getCenter?.();if(!c){toast('Espera a que termine de cargar el mapa 3D');return}openStreetViewAt(c.lat,c.lng)};
 let ml;try{ml=await loadMapLibre3D()}catch(e){const h=terrain3DOverlay.querySelector('.terrain3d-loading');if(h)h.innerHTML='<strong>3D no disponible ahora</strong><span>No se pudo cargar MapLibre. Cierra esta vista y usa el mapa topográfico 2D.</span>';return}
 let route=(await remoteStageRoute(n))||localRoute(n);if(!route?.length){const h=terrain3DOverlay.querySelector('.terrain3d-loading');if(h)h.innerHTML='<strong>Sin trazado 3D</strong><span>No se pudo obtener el recorrido preciso de esta etapa.</span>';return}
 const style='https://tiles.openfreemap.org/styles/liberty';
 try{
  terrain3DMap=new ml.Map({container:'terrain3DCanvas',style,center:[route[0][1],route[0][0]],zoom:11,pitch:62,bearing:0,maxPitch:85,renderWorldCopies:false,attributionControl:true});
  terrain3DMap.addControl(new ml.NavigationControl({visualizePitch:true}),'bottom-right');terrain3DMap.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
  terrain3DMap.on('load',()=>{
   terrain3DOverlay.querySelector('.terrain3d-loading')?.remove();
   try{if(!terrain3DMap.getSource('terrainSource'))terrain3DMap.addSource('terrainSource',{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json'});terrain3DMap.setTerrain({source:'terrainSource',exaggeration:1.2})}catch(e){toast('Relieve 3D limitado en este dispositivo')}
   try{
    const originalLayers=(terrain3DMap.getStyle().layers||[]).map(l=>l.id);terrain3DMap._bcBaseLayers=originalLayers;
    if(!terrain3DMap.getSource('topo'))terrain3DMap.addSource('topo',{type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png','https://b.tile.opentopomap.org/{z}/{x}/{y}.png','https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:17,attribution:'© OpenStreetMap · SRTM · OpenTopoMap'});
    terrain3DMap.addLayer({id:'topo-base',type:'raster',source:'topo',paint:{'raster-opacity':1,'raster-fade-duration':0}});
    // En modo TOPO ocultamos por completo las capas vectoriales base (líneas, textos, rellenos, etc.).
    // Así no se duplican carreteras/etiquetas sobre el raster topográfico al inclinar el terreno.
    originalLayers.forEach(id=>{try{terrain3DMap.setLayoutProperty(id,'visibility','none')}catch{}});
   }catch(e){console.warn('Topo 3D',e)}
   try{const vectorSource=Object.entries(terrain3DMap.getStyle().sources||{}).find(([,v])=>v?.type==='vector')?.[0];if(vectorSource&&!terrain3DMap.getLayer('bc-buildings-3d'))terrain3DMap.addLayer({id:'bc-buildings-3d',type:'fill-extrusion',source:vectorSource,'source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':'#d7dce3','fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],6],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':0.78}})}catch(e){console.warn('Edificios 3D',e)}
   terrain3DMap.addSource('bc-route',{type:'geojson',data:routeGeoJSON3D(route)});
   terrain3DMap.addSource('bc-route-points',{type:'geojson',data:routePointsGeoJSON3D(route)});
   terrain3DMap.addSource('bc-route-arrows',{type:'geojson',data:routeArrowsGeoJSON3D(route)});
   addRouteArrowImage3D(terrain3DMap);
   terrain3DMap.addLayer({id:'bc-route-guide',type:'line',source:'bc-route',paint:{'line-color':'#17345f','line-width':['interpolate',['linear'],['zoom'],8,1.2,12,1.7,15,2.2],'line-opacity':0.62}});
   terrain3DMap.addLayer({id:'bc-route-arrows-layer',type:'symbol',source:'bc-route-arrows',layout:{'icon-image':'bc-route-arrow','icon-size':['interpolate',['linear'],['zoom'],8,0.72,12,0.9,15,1.08],'icon-rotate':['get','bearing'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-allow-overlap':true,'icon-ignore-placement':true}});
   terrain3DMap.addLayer({id:'bc-route-points-layer',type:'circle',source:'bc-route-points',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,2.3,12,4.0,15,6.0],'circle-color':'#ffd21a','circle-stroke-color':'#17345f','circle-stroke-width':1.5}});
   const bounds=new ml.LngLatBounds();route.forEach(p=>bounds.extend([p[1],p[0]]));terrain3DMap.fitBounds(bounds,{padding:{top:70,bottom:55,left:45,right:45},duration:0,maxZoom:14});terrain3DMap.setPitch(62);
   terrain3DMap.on('click','bc-route-points-layer',e=>{const f=e.features?.[0],idx=Number(f?.properties?.idx||0);open3DRoutePointPopup(terrain3DMap,ml,route,idx,n)});
   terrain3DMap.on('mouseenter','bc-route-points-layer',()=>terrain3DMap.getCanvas().style.cursor='pointer');terrain3DMap.on('mouseleave','bc-route-points-layer',()=>terrain3DMap.getCanvas().style.cursor='');
  });
 }catch(e){const h=terrain3DOverlay.querySelector('.terrain3d-loading');if(h)h.innerHTML='<strong>El móvil no pudo iniciar el 3D</strong><span>Puede ser WebGL, memoria o conexión. El mapa 2D permanece disponible.</span>';return}
 let topo=true,routeOn=true,ex=1.2,servicesOn=false;
 document.getElementById('terrainBase').onclick=()=>{if(!terrain3DMap?.getLayer('topo-base'))return;topo=!topo;terrain3DMap.setLayoutProperty('topo-base','visibility',topo?'visible':'none');for(const id of (terrain3DMap._bcBaseLayers||[])){try{terrain3DMap.setLayoutProperty(id,'visibility',topo?'none':'visible')}catch{}}document.getElementById('terrainBase').textContent=topo?'⛰ TOPO · CURVAS':'🛣 CALLES'};
 document.getElementById('terrainRoute').onclick=()=>{routeOn=!routeOn;for(const id of ['bc-route-guide','bc-route-arrows-layer','bc-route-points-layer'])if(terrain3DMap?.getLayer(id))terrain3DMap.setLayoutProperty(id,'visibility',routeOn?'visible':'none');document.getElementById('terrainRoute').textContent=`🟨 RUTA ${routeOn?'ON':'OFF'}`};
 document.getElementById('terrainRelief').onclick=()=>{ex=ex<1.45?1.6:ex<1.9?2:1.2;try{terrain3DMap.setTerrain({source:'terrainSource',exaggeration:ex})}catch{}document.getElementById('terrainRelief').textContent=`⛰ x${ex.toFixed(1)}`};
 document.getElementById('terrainNorth').onclick=()=>terrain3DMap?.easeTo({bearing:0,pitch:62,duration:450});
 document.getElementById('terrainCenter').onclick=()=>{
  if(!terrain3DMap||!route?.length)return;
  const bounds=new ml.LngLatBounds();route.forEach(p=>bounds.extend([p[1],p[0]]));
  terrain3DMap.fitBounds(bounds,{padding:{top:72,bottom:60,left:48,right:48},duration:650,maxZoom:14});
  setTimeout(()=>terrain3DMap?.setPitch?.(62),680);
  toast('🎯 Ruta centrada en 3D');
 };
 document.getElementById('terrainRouteView').onclick=()=>{
  if(!terrain3DMap||!route?.length)return;
  const bounds=new ml.LngLatBounds();route.forEach(p=>bounds.extend([p[1],p[0]]));
  terrain3DMap.fitBounds(bounds,{padding:{top:80,bottom:70,left:55,right:55},duration:650,maxZoom:14});
  setTimeout(()=>terrain3DMap?.easeTo({bearing:routeBearing3D(route),pitch:68,duration:700}),680);
  toast('Vista orientada en el sentido de la etapa');
 };
 document.getElementById('terrainLocate').onclick=()=>{
  if(!navigator.geolocation){toast('GPS no disponible en este dispositivo');return}
  const btn=document.getElementById('terrainLocate');btn.textContent='📍 BUSCANDO…';
  navigator.geolocation.getCurrentPosition(pos=>{
   const {latitude,longitude,accuracy}=pos.coords;
   if(terrain3DMap.getLayer('bc-user-position'))terrain3DMap.removeLayer('bc-user-position');
   if(terrain3DMap.getLayer('bc-user-position-halo'))terrain3DMap.removeLayer('bc-user-position-halo');
   if(terrain3DMap.getSource('bc-user-position'))terrain3DMap.removeSource('bc-user-position');
   terrain3DMap.addSource('bc-user-position',{type:'geojson',data:{type:'Feature',properties:{accuracy:Math.round(accuracy)},geometry:{type:'Point',coordinates:[longitude,latitude]}}});
   terrain3DMap.addLayer({id:'bc-user-position-halo',type:'circle',source:'bc-user-position',paint:{'circle-radius':12,'circle-color':'#ffffff','circle-opacity':0.88,'circle-stroke-color':'#0b63b6','circle-stroke-width':2}});
   terrain3DMap.addLayer({id:'bc-user-position',type:'circle',source:'bc-user-position',paint:{'circle-radius':6,'circle-color':'#0b63b6','circle-stroke-color':'#ffffff','circle-stroke-width':2}});
   terrain3DMap.easeTo({center:[longitude,latitude],zoom:15.5,pitch:70,duration:900});
   btn.textContent='📍 MI POSICIÓN';
   toast(`Tu posición en 3D · ±${Math.round(accuracy)} m`);
  },()=>{
   btn.textContent='📍 MI POSICIÓN';
   toast('No se pudo obtener tu ubicación. Revisa el permiso GPS.');
  },{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
 };
 document.getElementById('terrainServices').onclick=async()=>{if(!terrain3DMap)return;servicesOn=!servicesOn;const b=document.getElementById('terrainServices');if(!servicesOn){if(terrain3DMap.getLayer('bc-services'))terrain3DMap.setLayoutProperty('bc-services','visibility','none');b.textContent='📌 SERVICIOS';return}b.textContent='📌 OCULTAR';if(terrain3DMap.getLayer('bc-services')){terrain3DMap.setLayoutProperty('bc-services','visibility','visible');return}toast('Cargando servicios 3D…');const items=(await servicesForStage(n)).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).slice(0,220);const fc={type:'FeatureCollection',features:items.map((x,i)=>({type:'Feature',properties:{i,name:x.name||'Servicio',type:x.type||'',phone:x.phone||'',website:x.website||'',address:x.address||''},geometry:{type:'Point',coordinates:[x.lon,x.lat]}}))};terrain3DMap.addSource('bc-services-source',{type:'geojson',data:fc});terrain3DMap.addLayer({id:'bc-services',type:'circle',source:'bc-services-source',paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,3,13,5.5,16,8],'circle-color':'#0b63b6','circle-stroke-color':'#fff','circle-stroke-width':2}});terrain3DMap.on('click','bc-services',e=>{const f=e.features?.[0],pr=f?.properties||{},co=f?.geometry?.coordinates;if(!co)return;const phone=pr.phone?`<a href="tel:${String(pr.phone).replace(/\s/g,'')}">📞 Llamar</a>`:'',web=pr.website?`<a href="${esc(pr.website)}" target="_blank" rel="noopener">🌐 Web</a>`:'';new ml.Popup({maxWidth:'290px'}).setLngLat(co).setHTML(`<div class="terrain-popup"><b>📌 ${esc(pr.name||'Servicio')}</b>${pr.address?`<small>📍 ${esc(pr.address)}</small>`:''}<div>${phone}${web}<a href="${directionsUrl(co[1],co[0])}" target="_blank" rel="noopener">🚶 Ir</a></div></div>`).addTo(terrain3DMap)});};
}

function requestLandscape(){
 const btn=document.getElementById('focusRotate');
 if(window.innerWidth>window.innerHeight&&!focusOverlay.classList.contains('force-landscape')){toast('El teléfono ya está en horizontal.');setTimeout(()=>focusMap?.render(),120);return;}
 const forced=focusOverlay.classList.toggle('force-landscape');
 if(btn)btn.textContent=forced?'↕ VERTICAL':'↻ HORIZONTAL';
 // La referencia visual de la brújula cambia al girar el mapa; reiniciamos el filtro para evitar un salto lento de 90°.
 if(compassUpdateTarget)compassSmoothedHeading=null;
 setTimeout(()=>{focusMap?.render();if(focusMapCompass?.active)positionMapCompass(focusMapCompass)},220);
}
function openFocusMap(n){
 mapCompassResume=mainMapCompass?.active?mainMapCompass:null;if(mapCompassResume)deactivateMapCompass(mapCompassResume,true);
 focusOverlay.hidden=false;focusOverlay.className='focus-overlay';focusOverlay.innerHTML=`<div class="focus-top"><strong>BUEN CAMINO · MAPA</strong><button id="focusCompass" class="focus-compass-toggle map-compass-toggle">🧭 BRÚJULA</button><button id="focusRoute">🟨 Ruta ${routeVisible?'ON':'OFF'}</button><button id="focusCenter">🎯 CENTRAR RUTA</button><button id="focusProfileToggle">⛰ PERFIL</button><button id="focusServices">📌 Servicios</button><button id="focus3D" class="terrain-top-btn">🏔 3D</button><button id="focusRotate">↻ HORIZONTAL</button><button id="focusClose">✕</button></div><div class="focus-body"><div class="focus-map"><div id="focusMapEl" class="bc-map"></div><aside id="focusProfilePanel" class="focus-profile-overlay"><div class="elevation-head"><div><span>DESNIVEL</span><strong id="focusReadout">Toca o desliza</strong></div><button id="focusProfileClose" class="profile-close" aria-label="Ocultar perfil">×</button></div><div id="focusProfile" class="elevation-chart"></div></aside></div></div>`;
 document.body.style.overflow='hidden';setTimeout(()=>{focusMap=buildStageMap('focusMapEl',n,false);focusMapCompass=attachMapCompass(focusMap,document.getElementById('focusCompass'));setupProfile('focusProfile',n,focusMap,'focusReadout');if(mapCompassResume)activateMapCompass(focusMapCompass)},50);
 const panel=document.getElementById('focusProfilePanel'),toggleProfile=()=>panel.classList.toggle('profile-hidden');document.getElementById('focusCompass').onclick=()=>focusMapCompass?toggleMapCompass(focusMapCompass):toast('Preparando brújula…');document.getElementById('focusRoute').onclick=()=>toggleRoute(document.getElementById('focusRoute'));document.getElementById('focusCenter').onclick=()=>{if(focusMap?.route?.length){focusMap.userInteracted=false;focusMap.fitRoute();toast('🎯 Ruta centrada en mapa grande')}else toast('La ruta todavía se está cargando')};document.getElementById('focusProfileToggle').onclick=toggleProfile;document.getElementById('focusProfileClose').onclick=toggleProfile;document.getElementById('focusServices').onclick=()=>showMapServices(n,focusMap);document.getElementById('focus3D').onclick=()=>open3DMap(n);document.getElementById('focusClose').onclick=closeFocusMap;document.getElementById('focusRotate').onclick=requestLandscape;
}
function closeFocusMap(){
 const resume=mapCompassResume;mapCompassResume=null;if(focusMapCompass)deactivateMapCompass(focusMapCompass,true);focusMapCompass=null;focusOverlay.classList.remove('force-landscape');focusMap?.destroy?.();focusMap=null;focusOverlay.hidden=true;focusOverlay.innerHTML='';document.body.style.overflow='';if(resume?.panel?.isConnected)activateMapCompass(resume);
}

window.addEventListener('resize',()=>{if(!focusOverlay.hidden){if(window.innerWidth>window.innerHeight&&focusOverlay.classList.contains('force-landscape')){focusOverlay.classList.remove('force-landscape');const b=document.getElementById('focusRotate');if(b)b.textContent='↻ HORIZONTAL';if(compassUpdateTarget)compassSmoothedHeading=null;}setTimeout(()=>{focusMap?.render();if(focusMapCompass?.active)positionMapCompass(focusMapCompass)},180)}else if(mainMapCompass?.active)setTimeout(()=>positionMapCompass(mainMapCompass),120)});

window.addEventListener('resize',()=>{if(skyLocation&&(document.getElementById('skySvg')||document.getElementById('skyFullSvg')))requestAnimationFrame(()=>renderSky(skyLocation.lat,skyLocation.lon,skyLocation.label));});

function mapView(){cleanupMaps();currentView='map';currentStageNo=1;setActive('map');app.innerHTML=`<section class="section"><h2>Mapa por etapa</h2><p class="map-note">Las 33 etapas cargan su tramo concreto del Camino Francés. Selecciona una etapa: el mapa se ajustará automáticamente a su recorrido.</p><select id="globalStageSelect" class="stage-select">${STAGES.map(s=>`<option value="${s.n}">${s.n}. ${esc(s.from)} → ${esc(s.to)}</option>`).join('')}</select><div class="map-toolbar"><button id="globalCompass" class="map-chip map-compass-toggle">🧭 BRÚJULA</button><button id="global3D" class="map-chip terrain-chip">🏔 MAPA 3D</button><button id="globalBig" class="map-chip primary">⛶ MAPA GRANDE / HORIZONTAL</button></div><div id="globalMap" class="bc-map tall" style="height:60dvh;min-height:430px"></div></section>`;const load=n=>{if(mainMapCompass)deactivateMapCompass(mainMapCompass,true);mainMapCompass=null;mainMap?.destroy?.();currentStageNo=n;mainMap=buildStageMap('globalMap',n,false);mainMapCompass=attachMapCompass(mainMap,document.getElementById('globalCompass'));document.getElementById('globalBig').onclick=()=>openFocusMap(n);document.getElementById('global3D').onclick=()=>open3DMap(n)};setTimeout(()=>load(1),0);document.getElementById('globalStageSelect').onchange=e=>load(+e.target.value);}
function favoritesView(){cleanupMaps();currentView='favorites';setActive('favorites');const list=[...favorites].map(k=>STAGES.find(s=>'stage-'+s.n===k)).filter(Boolean).sort((a,b)=>a.n-b.n);app.innerHTML=`<section class="section"><div class="section-head"><div><h2>♥ Rutas favoritas</h2><p class="map-note">Guarda tus etapas preferidas y descarga el trazado cuando lo necesites.</p></div></div>${list.length?`<div class="favorite-info">⬇ <b>Descargas:</b> GPX para GPS/Wikiloc, GPX con servicios, KML para Google Earth y TCX.</div>${list.map(favoriteRouteCard).join('')}`:'<div class="empty">Todavía no hay rutas favoritas. Pulsa ♡ en cualquier etapa para añadirla aquí.</div>'}</section>`;bindCommon();}
function myCamino(){cleanupMaps();currentView='mycamino';setActive('mycamino');app.innerHTML=`<section class="section"><h2>Mi Camino</h2><p class="map-note">Marca etapas realizadas.</p>${STAGES.map(s=>`<article class="stage-card" data-done="${s.n}"><div class="num">${doneStages.has(s.n)?'✓':s.n}</div><div><h3>${esc(s.from)} → ${esc(s.to)}</h3><div class="meta">${s.km.toFixed(1)} km</div></div><b>${doneStages.has(s.n)?'Hecha':''}</b></article>`).join('')}</section>`;document.querySelectorAll('[data-done]').forEach(x=>x.onclick=()=>{const n=+x.dataset.done;doneStages.has(n)?doneStages.delete(n):doneStages.add(n);save();myCamino()});}

function toggleLike(n,btn){likedStages.has(n)?likedStages.delete(n):likedStages.add(n);save();const on=likedStages.has(n);if(btn){btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on))}document.querySelectorAll(`[data-like-stage="${n}"]`).forEach(b=>{b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});document.querySelectorAll(`[data-like-stage="${n}"] small`).forEach(x=>x.textContent=String(stageLikes(n)));toast(on?'👍 Te gusta esta etapa':'Me gusta eliminado')}
async function shareStage(n){const s=STAGES.find(x=>x.n===n),url=APP_DIRECT_URL()+`#stage-${n}`,data={title:`BUEN CAMINO · Etapa ${n}`,text:`${s.from} → ${s.to} · ${s.km.toFixed(1)} km · Abre BUEN CAMINO directamente`,url};try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard){await navigator.clipboard.writeText(`${data.text} ${url}`);toast('Enlace directo de la etapa copiado');return}}catch(e){if(e?.name==='AbortError')return}window.prompt('Copia este enlace directo de BUEN CAMINO:',url)}
function openAppGuide(){
 const title=document.getElementById('doubtsTitle');
 if(title)title.textContent='GUÍA APP · Cómo usar BUEN CAMINO';
 document.getElementById('doubtsBody').innerHTML=`
 <div class="guide-intro"><b>BUEN CAMINO · Camino Francés</b><p>Guía práctica para utilizar la aplicación durante las 33 etapas, desde Saint-Jean-Pied-de-Port hasta Santiago de Compostela.</p></div>
 <div class="guide-card"><strong>1. 🏠 Inicio</strong><p>Desde Inicio puedes entrar en las etapas, Mi Camino, Favoritos y los accesos rápidos a servicios. También encontrarás Ruta bici, Brújula, Estrellas y constelaciones, Google Earth, la información del creador y la donación solidaria directa a Save the Children.</p></div>
 <div class="guide-card"><strong>2. 👣 Elegir una etapa</strong><p>Selecciona cualquiera de las 33 etapas. Cada una incluye inicio y final, distancia, tiempo estimado, desnivel, dificultad, meteorología, mapa, servicios, alojamientos y opciones GPS.</p></div>
 <div class="guide-card"><strong>3. 🗺 Mapas 2D y 3D</strong><p>En 2D puedes consultar la ruta, puntos amarillos, flechas de dirección, GPS y centrar el recorrido. En 3D puedes ver el relieve, la ruta tridimensional, las flechas en sentido de marcha y usar 🎯 Centrar.</p></div>
 <div class="guide-card"><strong>4. 🎯 GPS</strong><p>Activa la ubicación del teléfono cuando el navegador la solicite. La posición GPS te ayuda a comprobar visualmente dónde estás respecto al recorrido del Camino.</p></div>
 <div class="guide-card"><strong>5. 🟡 Puntos amarillos</strong><p>Toca un punto amarillo para abrir Maps, Earth, OSM y Servicios cerca. La ficha intenta cargar varias fotografías cercanas de Wikimedia Commons: deslízalas horizontalmente con el dedo; cada una conserva autor y licencia.</p></div>
 <div class="guide-card"><strong>6. ⛰ Perfil de desnivel</strong><p>Consulta el perfil interactivo de cada etapa para conocer subidas, bajadas, altitud y progresión del recorrido antes y durante la marcha.</p></div>
 <div class="guide-card"><strong>7. 📍 Servicios</strong><p>Las fichas pueden incluir, cuando consta, teléfono, web, email, dirección, horario, ubicación, Maps, cómo llegar, Google Earth, fotos y OSM. Si un dato no está confirmado, no debe darse por cierto.</p></div>
 <div class="guide-card"><strong>8. 🛏 Alojamientos</strong><p>Se priorizan los albergues del Camino, especialmente públicos o institucionales. Si no consta el sello de credencial se indica “confirmar en recepción”.</p></div>
 <div class="guide-card"><strong>9. 🍽 Menú peregrino</strong><p>Es una categoría especial. La aplicación diferencia los establecimientos donde consta el Menú peregrino de aquellos en los que debe confirmarse directamente.</p></div>
 <div class="guide-card"><strong>10. 🌦 Meteorología</strong><p>Consulta la información meteorológica antes de salir. Cuando corresponde, usa el acceso a AEMET para predicciones y avisos oficiales, especialmente con calor, lluvia, viento, tormenta, hielo o nieve.</p></div>
 <div class="guide-card"><strong>11. ⬇ Descargar una etapa para GPS</strong><p>Cada etapa permite descargar GPX, GPX + servicios, KML y TCX para utilizarlos en dispositivos GPS o aplicaciones compatibles.</p></div>
 <div class="guide-card"><strong>12. 🌍 Wikiloc y Google Earth</strong><p>Desde cada etapa puedes buscar el recorrido en Wikiloc y abrir la zona directamente en Google Earth.</p></div>
 <div class="guide-card"><strong>13. ♡ Favoritos</strong><p>Guarda las etapas que te interesen para encontrarlas rápidamente y acceder de nuevo a sus rutas y descargas.</p></div>
 <div class="guide-card"><strong>14. ◎ Mi Camino</strong><p>Utiliza Mi Camino para marcar las etapas realizadas y llevar un seguimiento personal de tu Camino Francés.</p></div>
 <div class="guide-card"><strong>15. 📷 Fotos · 💬 Comentarios · 👍 Me gusta</strong><p>La aplicación permite gestionar fotos de las etapas, comentarios, me gusta y visitas del dispositivo.</p></div>
 <div class="guide-card"><strong>16. 🟢 Compartir</strong><p>Puedes compartir BUEN CAMINO y las etapas mediante WhatsApp y las opciones de compartir disponibles en tu teléfono.</p></div>
 <div class="guide-card"><strong>17. ❓ Dudas y consejos</strong><p>En el Resumen de cada etapa encontrarás “DUDAS · CONSEJOS DEL PEREGRINO” con recomendaciones prácticas, botiquín, ampollas, equipo, meteorología, comunicación y acceso al 112.</p></div>
 <div class="guide-card"><strong>18. 📲 Instalar BUEN CAMINO</strong><p>Pulsa 📲 INSTALAR APP en Inicio. En Android se abrirá la instalación cuando el navegador la ofrezca. En iPhone, Safari permite instalarla con Compartir → Añadir a pantalla de inicio. Si ya está instalada, el botón lo indicará.</p></div>
 <div class="guide-card"><strong>19. 🚶 A pie · Rutas</strong><p>Disponible en Inicio y en cada etapa. Abre el trazado del Camino a pie con mapa topográfico, puntos amarillos, servicios y brújula. No sustituye las flechas y mojones físicos del Camino ni los avisos de desvíos o cierres.</p></div>
 <div class="guide-card"><strong>20. 🚴 Ruta bici</strong><p>Disponible en Inicio y en cada etapa. El selector muestra 🚴 en todas las etapas y el mapa marca con 🚴 el inicio de la ruta ciclista y con 🏁 su final. BRouter/OpenStreetMap calcula una ruta orientativa; si falla, se muestra el Camino solo como respaldo claramente indicado.</p></div>
 <div class="guide-card"><strong>21. 🧭 Brújula</strong><p>Usa rumbo magnético/absoluto del móvil con filtro anti-oscilación. Puede abrirse sola o flotar sobre mapa pequeño, MAPA GRANDE y mapas de rutas. El fondo es transparente y la brújula se arrastra con un dedo. Las marcas del aro dividen los 360 grados y la lectura central da el rumbo exacto. Normalmente la rosa es negra y la aguja roja; cuando el norte del mapa y el norte de la brújula coinciden (aprox. ±7°), la rosa pasa a rojo y la aguja a negro. Mantén el móvil lejos de metal/imanes y calibra con un movimiento en forma de 8 si oscila.</p></div>
 <div class="guide-card"><strong>22. ✨ Estrellas y constelaciones</strong><p>Primero pulsa <b>USAR MI GPS</b> y después <b>ACTIVAR MODO CIELO</b>. Apunta la parte trasera del móvil hacia el cielo y muévelo lentamente. Pulsa <b>🌌 GRAN VISTA CIELO</b> para abrir la carta a pantalla completa; al girar el teléfono a horizontal se adapta automáticamente. En la vista normal y en la grande tienes <b>🏠 INICIO · 👣 ETAPA · ← VOLVER</b>. Toca directamente una estrella, una línea de constelación o su nombre: la ficha se abre dentro de <b>ℹ️ INFO ESTRELLAS Y CONSTELACIONES</b>. Las constelaciones pueden mostrar fotografías de Wikimedia Commons cuando consta una licencia libre o dominio público, con autor y licencia. La brújula pequeña continúa siendo transparente, arrastrable y cambia de colores al alinear el norte.</p></div>
 <div class="guide-card"><strong>23. 🗺 Símbolos Topo · Street View · 3D</strong><p>El botón SÍMBOLOS TOPO explica curvas de nivel, senderos/pistas, tipos de carretera, vegetación, agua, edificios, cumbres, aparcamiento y otros iconos de la cartografía. El hombre amarillo aparece también en MAPA GRANDE y en 3D. En TOPO 3D se ocultan las capas duplicadas de calles/textos para evitar imágenes fantasma; se mantienen relieve, curvas, edificios y la ruta de BUEN CAMINO.</p></div>
 <div class="guide-card"><strong>24. 📷 Fotos Wikimedia cercanas</strong><p>Al tocar una bola amarilla, BUEN CAMINO carga una galería horizontal de hasta 10 fotografías cercanas de Wikimedia Commons y puedes deslizarla con el dedo. Se filtran archivos declarados con licencia libre o dominio público y se muestra autor/licencia; algunas licencias libres exigen atribución.</p></div>
 <div class="guide-flow"><b>Uso recomendado cada día</b><p><strong>Antes de salir:</strong> Etapa → Meteorología → Perfil → Servicios/albergues → Mapa → GPS.</p><p><strong>Durante la marcha:</strong> Mapa 2D/3D + GPS → puntos amarillos → Servicios cerca.</p><p><strong>Al terminar:</strong> Alojamiento → Mi Camino → favoritos, comentarios o fotos si lo deseas.</p></div>
 <div class="guide-warning"><b>Importante</b><p>BUEN CAMINO es una herramienta de ayuda. Ante desvíos, obras, cierres, mal tiempo o emergencias prevalecen la señalización física actual, las indicaciones oficiales y los servicios de emergencia.</p></div>`;
 document.getElementById('doubtsBackdrop').hidden=false;
}
function updateConnectionStatus(){
 const el=document.getElementById('connectionStatus');
 if(!el)return;
 const online=navigator.onLine;
 el.textContent=online?'● Con conexión':'● Sin conexión';
 el.classList.toggle('online',online);el.classList.toggle('offline',!online);
}
function updateInstallButton(){
 const b=document.getElementById('installAppBtn');if(!b)return;
 const installed=isStandalone();
 b.textContent=installed?'✓ APP INSTALADA':'📲 INSTALAR APP';
 b.classList.toggle('installed',installed);
}
function openInstallHelp(){
 const title=document.getElementById('doubtsTitle');if(title)title.textContent='Instalar BUEN CAMINO';
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 document.getElementById('doubtsBody').innerHTML=`<div class="install-sheet"><div class="install-big">📲</div><h3>BUEN CAMINO en tu pantalla de inicio</h3>${ios?'<p><b>iPhone / iPad:</b> abre BUEN CAMINO en Safari, pulsa <b>Compartir</b> y después <b>Añadir a pantalla de inicio</b>. Activa “Abrir como app web” si aparece.</p>':'<p><b>Android:</b> abre el menú del navegador y elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>. En Chrome, cuando la instalación automática esté disponible, el botón 📲 INSTALAR APP la abrirá directamente.</p>'}<div class="offline-note"><b>Uso sin conexión</b><p>La estructura de la aplicación y los datos incluidos quedan disponibles después de cargar/instalar la PWA. Los mapas, meteorología, búsquedas de servicios, fotos y otros proveedores externos pueden necesitar conexión. Los datos de Open Pilgrimages usados por las rutas se guardan como respaldo después de descargarse correctamente.</p></div></div>`;
 document.getElementById('doubtsBackdrop').hidden=false;
}
async function installApp(){
 if(isStandalone()){toast('✓ BUEN CAMINO ya está instalada');return}
 if(deferredInstallPrompt){
  deferredInstallPrompt.prompt();
  try{const choice=await deferredInstallPrompt.userChoice;if(choice?.outcome==='accepted')toast('Instalación iniciada');}catch{}
  deferredInstallPrompt=null;updateInstallButton();return;
 }
 openInstallHelp();
}
function openAboutPrivacy(){
 const title=document.getElementById('doubtsTitle');if(title)title.textContent='Acerca de · Privacidad · Datos';
 document.getElementById('doubtsBody').innerHTML=`
 <div class="about-card"><b>BUEN CAMINO · Camino Francés</b><p>Aplicación gratuita de apoyo al peregrino con 33 etapas. Creador: <strong>${esc(DONATION_CREATOR)}</strong>.</p></div>
 <div class="privacy-card"><strong>🔒 Tus datos en este dispositivo</strong><p>Favoritos, etapas realizadas de Mi Camino, “me gusta”, contadores y comentarios se guardan en el almacenamiento local del navegador. Las fotos que añades se guardan en la base de datos local del dispositivo. BUEN CAMINO no tiene cuentas de usuario ni un servidor propio que reciba esos datos en esta versión.</p></div>
 <div class="privacy-card"><strong>🎯 Ubicación GPS</strong><p>La ubicación se solicita únicamente cuando pulsas una función GPS, incluida la opción de calcular el cielo para tu posición. BUEN CAMINO la usa en ese momento y no la guarda en el historial de la app. Al cargar mapas u otros servicios externos, tu navegador se conecta a sus proveedores según sus propias políticas.</p></div>
 <div class="privacy-card"><strong>🌐 Servicios externos</strong><p>Mapas, meteorología, rutas, servicios, fotos y enlaces pueden contactar con proveedores como OpenStreetMap/OpenTopoMap, Open-Meteo, AEMET, Open Pilgrimages, Overpass, BRouter, Wikimedia Commons, Google Earth/Maps o Wikiloc. Estos servicios pueden recibir información técnica habitual de una conexión web, como la dirección IP.</p></div>
 <div class="privacy-card"><strong>💛 Donaciones</strong><p>Las donaciones se realizan directamente en la web oficial de Save the Children. BUEN CAMINO no procesa, gestiona ni recibe el dinero.</p></div>
 <div class="privacy-card"><strong>⚠ Responsabilidad de uso</strong><p>La app es una ayuda de orientación e información. La señalización física actual, cierres, avisos oficiales, condiciones meteorológicas y servicios de emergencia prevalecen siempre.</p></div>
 <a class="privacy-full-link" href="privacy.html" target="_blank" rel="noopener">ABRIR POLÍTICA DE PRIVACIDAD COMPLETA ↗</a>
 <button id="clearLocalDataBtn" class="clear-data-btn" type="button">BORRAR MIS DATOS DE ESTE DISPOSITIVO</button><small class="clear-data-note">El borrado requiere una confirmación y elimina Favoritos, Mi Camino, likes, comentarios, contadores y fotos locales. No modifica la aplicación.</small>`;
 document.getElementById('doubtsBackdrop').hidden=false;
 document.getElementById('clearLocalDataBtn').onclick=clearLocalAppData;
}
async function clearLocalAppData(){
 if(!confirm('¿Borrar los datos personales guardados por BUEN CAMINO en este dispositivo? Esta acción no se puede deshacer.'))return;
 try{
  Object.keys(localStorage).filter(k=>k.startsWith('bc-')).forEach(k=>localStorage.removeItem(k));
  Object.keys(sessionStorage).filter(k=>k.startsWith('bc-')).forEach(k=>sessionStorage.removeItem(k));
  if('indexedDB' in window){try{const db=await photoDb();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close?.()}catch{}}
  toast('Datos locales borrados');setTimeout(()=>location.reload(),500);
 }catch{toast('No se pudieron borrar todos los datos')}
}
function openPublicWelcome(){
 if(currentView!=='home'||localStorage.getItem('bc-public-welcome-v76'))return;
 localStorage.setItem('bc-public-welcome-v76','1');
 const title=document.getElementById('doubtsTitle');if(title)title.textContent='Bienvenido a BUEN CAMINO';
 document.getElementById('doubtsBody').innerHTML=`<div class="welcome-sheet"><div class="welcome-mark">👣</div><h3>Tu compañero gratuito en el Camino Francés</h3><p>33 etapas, mapas 2D/3D, GPS, perfil, servicios, alojamientos, meteorología y descargas para llevar el Camino contigo.</p><div class="welcome-points"><span>✓ Sin registro</span><span>✓ Datos personales en tu dispositivo</span><span>✓ Instalable como app</span></div><div class="welcome-actions"><button id="welcomeStart" type="button">EMPEZAR</button><button id="welcomeGuide" type="button">VER GUÍA</button></div><small>Recuerda: la app ayuda, pero la señalización y los avisos oficiales prevalecen.</small></div>`;
 document.getElementById('doubtsBackdrop').hidden=false;
 document.getElementById('welcomeStart').onclick=()=>document.getElementById('doubtsBackdrop').hidden=true;
 document.getElementById('welcomeGuide').onclick=openAppGuide;
}
function openDonation(){const title=document.getElementById('doubtsTitle');if(title)title.textContent='Donación solidaria';document.getElementById('doubtsBody').innerHTML=`<div class="donation-sheet"><div class="donation-heart">💛</div><h3>Donación directa a Save the Children</h3><p>BUEN CAMINO es un proyecto gratuito creado por <b>${esc(DONATION_CREATOR)}</b>. Si deseas hacer una aportación solidaria, puedes realizarla directamente en la web oficial de Save the Children.</p><a class="donate-link" href="${esc(DONATION_URL)}" target="_blank" rel="noopener noreferrer">DONAR A SAVE THE CHILDREN</a><small class="donation-charity-note">El enlace abre la web oficial de Save the Children. BUEN CAMINO no gestiona ni recibe la donación.</small></div>`;document.getElementById('doubtsBackdrop').hidden=false}
function openDoubts(){document.getElementById('doubtsTitle').textContent='DUDAS · Consejos del peregrino';document.getElementById('doubtsBody').innerHTML=`
<div class="doubt-alert"><b>Consejos prácticos</b><span>Para pequeñas incidencias y preparación. No sustituyen valoración médica ni las indicaciones oficiales.</span></div>

<div class="doubt-card important"><strong>🦶 Ampollas · qué hacer</strong>
<p><b>Si está cerrada:</b> mantenla limpia y seca, evita seguir rozándola y protégela con un apósito blando o hidrocoloide. No la revientes por tu cuenta ni retires la piel que la cubre.</p>
<p><b>Si se ha roto sola:</b> lávate las manos, deja drenar el líquido, limpia suavemente y cúbrela con un apósito limpio. No arranques la piel.</p>
<p><b>Pide ayuda sanitaria</b> si está muy dolorida, caliente, cada vez más roja, aparece pus amarillo/verde, fiebre o empeora. Si tienes diabetes, problemas de circulación o poca sensibilidad en los pies, consulta pronto ante una ampolla o herida.</p>
</div>

<div class="doubt-card"><strong>🥾 Evitar rozaduras</strong><p>Usa calzado ya probado y que ajuste bien. Mantén los pies secos, cambia los calcetines si están húmedos y atiende cualquier “punto caliente” antes de que aparezca la ampolla. No estrenes botas en una etapa larga.</p></div>

<div class="doubt-card"><strong>🩹 Botiquín de peregrino</strong><p>Tiritas de varios tamaños, gasas estériles, apósitos para ampollas/hidrocoloides, esparadrapo o cinta médica, vendas, suero fisiológico para limpieza, antiséptico adecuado, guantes desechables, pinzas y pequeñas tijeras de punta redondeada. Lleva tu medicación habitual y conoce cómo usar lo que transportas.</p></div>

<div class="doubt-card"><strong>🔦 Luz, pilas y respaldo</strong><p>Linterna frontal o linterna pequeña <b>a pilas</b>, más un juego de pilas de repuesto guardado seco. Mantén también el móvil cargado, cable y powerbank. Una <b>radio pequeña a pilas</b> puede servir como respaldo informativo en una emergencia, pero no sustituye el teléfono, el GPS ni los avisos oficiales.</p></div>

<div class="doubt-card"><strong>🎒 Equipo útil</strong><p>Agua, algo de comida, capa impermeable, abrigo ligero, protección solar, gorra, gafas de sol, manta térmica ligera, silbato, documentación/credencial y una bolsa impermeable para electrónica y material de cura.</p></div>

<div class="doubt-card"><strong>⛰ Relieve y meteorología</strong><p>Revisa desnivel, horario y AEMET antes de salir. En niebla, tormenta, hielo, nieve, calor intenso o viento fuerte adapta o suspende la etapa. Evita atajos y sigue la señalización oficial.</p></div>

<div class="doubt-card"><strong>📡 Comunicación y ruta</strong><p>Descarga el GPX antes de salir si esperas poca cobertura, comparte tu plan con alguien y no dependas de una sola tecnología. Conserva batería para emergencias.</p></div>

<div class="doubt-card"><strong>🎒 Peso y ritmo</strong><p>Lleva solo lo necesario y ajusta bien la mochila. Empieza a ritmo tranquilo, bebe con regularidad y descansa antes de llegar al agotamiento. El peso adecuado depende de tu condición física, equipo y etapa.</p></div>

<div class="danger-links"><a class="aid" href="https://www.cruzroja.es/guiaprevencion/primeros-auxilios.html" target="_blank" rel="noopener">🩹 PRIMEROS AUXILIOS</a><a class="emg" href="tel:112">☎ 112</a></div>
<div class="advice-sources"><a href="https://www.nhs.uk/conditions/blisters/" target="_blank" rel="noopener">Ampollas · NHS ↗</a><a href="https://www2.cruzroja.es/web/ahora/-/todo-lo-que-debe-tener-botiquin-primeros-auxilios-casa" target="_blank" rel="noopener">Botiquín · Cruz Roja ↗</a></div>
`;document.getElementById('doubtsBackdrop').hidden=false;}
function toggleFavoriteStage(n,btn){
 const k='stage-'+Number(n),adding=!favorites.has(k);
 if(adding)favorites.add(k);else favorites.delete(k);
 save();
 if(btn){btn.textContent=adding?'♥':'♡';btn.classList.toggle('active',adding);btn.setAttribute('aria-pressed',String(adding))}
 toast(adding?'♥ Ruta añadida a Favoritos':'Ruta eliminada de Favoritos');
 if(currentView==='favorites')setTimeout(favoritesView,0);
}
function favoriteRouteCard(s){
 return `<article class="favorite-route-card"><div class="favorite-route-main"><div class="num">${s.n}</div><div><h3>${esc(s.from)} → ${esc(s.to)}</h3><div class="meta">${s.km.toFixed(1)} km · ${s.h} · ${esc(s.difficulty)}</div><small>Ruta guardada en Favoritos</small></div><button class="favorite-heart active" data-fav-stage="${s.n}" aria-label="Quitar etapa ${s.n} de favoritos">♥</button></div><div class="favorite-route-actions"><button data-open-stage="${s.n}">🗺 ABRIR RUTA</button><button class="primary" data-download-stage="${s.n}">⬇ GPS / WIKILOC</button></div><div class="favorite-formats">GPX · GPX + servicios · KML / Earth · TCX</div></article>`;
}
function bindStageCards(){
 document.querySelectorAll('[data-stage]').forEach(x=>x.onclick=()=>detail(+x.dataset.stage));
 document.querySelectorAll('[data-open-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();detail(+b.dataset.openStage)});
 document.querySelectorAll('[data-like-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleLike(+b.dataset.likeStage,b)});
 document.querySelectorAll('[data-fav-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavoriteStage(+b.dataset.favStage,b)});
 document.querySelectorAll('[data-download-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();openRouteDownloads(+b.dataset.downloadStage)});
 document.querySelectorAll('[data-earth-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStageEarth(+b.dataset.earthStage)});
 document.querySelectorAll('[data-wikiloc-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();openStageWikiloc(+b.dataset.wikilocStage)});
 document.querySelectorAll('[data-share-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();shareStage(+b.dataset.shareStage)});document.querySelectorAll('[data-feature-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();openFeature(b.dataset.featureStage,+b.dataset.featureStageNo)});
}
function bindCommon(){bindStageCards();bindFeatureButtons();document.querySelectorAll('[data-donate]').forEach(b=>b.onclick=openDonation);document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{detail(1,'servicios');setTimeout(()=>document.querySelector(`[data-service="${b.dataset.quick}"]`)?.click(),40)});}
function navigate(v){if(v==='home')home();else if(v==='stages')stages();else if(v==='map')mapView();else if(v==='favorites')favoritesView();else if(v==='mycamino')myCamino();}
document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));document.getElementById('brandBtn').onclick=home;/* El botón superior muestra EARTH solo en Inicio; DUDAS queda únicamente en el Resumen de cada etapa. */document.getElementById('closeDoubts').onclick=()=>document.getElementById('doubtsBackdrop').hidden=true;document.getElementById('doubtsBackdrop').onclick=e=>{if(e.target.id==='doubtsBackdrop')e.currentTarget.hidden=true};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallButton();});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;localStorage.setItem('bc-installed','1');updateInstallButton();toast('✓ BUEN CAMINO instalada');});
window.addEventListener('online',updateConnectionStatus);window.addEventListener('offline',updateConnectionStatus);
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js?v=83',{updateViaCache:'none'})
    .then(reg=>reg.update().catch(()=>{}))
    .catch(()=>{});
}
const initialStage=Number((location.hash.match(/^#stage-(\d+)/)||[])[1]);if(initialStage>=1&&initialStage<=33)detail(initialStage);else{home();setTimeout(openPublicWelcome,180);}
