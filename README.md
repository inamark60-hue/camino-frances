# BUEN CAMINO — V7.2 PRO

## V7.2 PRO · GPS, centrado de ruta y servicios oficiales

- Eliminado el botón global **DUDAS** de la cabecera; se conserva **DUDAS PEREGRINO** dentro del Resumen de cada etapa.
- Todos los mapas 2D incorporan **◎ Centrar ruta** y **📍 Mi posición GPS**; la posición del peregrino queda visible y se actualiza mientras el mapa está abierto.
- El mapa 3D añade **◎ CENTRAR RUTA** y mantiene **📍 MI POSICIÓN**, ahora con actualización GPS continua mientras la vista 3D está abierta.
- Servicios incluye acceso prioritario a **Albergues del Camino**, **Credencial / Compostela** y **Menú peregrino**.
- Los albergues solo muestran etiqueta **oficial / red pública** cuando la fuente permite identificar esa gestión; se añade acceso al listado oficial de la Red Pública de Albergues de Galicia.
- Se muestran logo/icono web cuando existe, indicación de credencial requerida en red pública identificada y **sello de credencial** cuando el dato aparece expresamente.
- Panel de información oficial con enlaces a Credencial, Compostela y Oficina de Acogida al Peregrino.

## V6.6.2 · cambio rápido 2D / 3D

- Nuevo botón flotante **🗺 2D** siempre visible dentro del mapa 3D.
- Un toque cierra el relieve 3D y vuelve inmediatamente al mapa 2D de la misma etapa.
- En el mapa 2D se mantiene el botón **🏔 3D**, formando un cambio directo 2D ↔ 3D.
- El botón 2D permanece visible también en horizontal, sin depender del botón ✕.

## Novedad principal: mapa 3D

- Botón **🏔 3D** en Resumen, Mapa, Mapa grande y Mapa por etapa.
- Relieve tridimensional real con **MapLibre GL JS** y datos de elevación **Mapterhorn**, sin clave API.
- Base topográfica OpenTopoMap con curvas de nivel, con cambio a calles OpenStreetMap.
- Ruta amarilla drapeada sobre el terreno, puntos de ruta interactivos y servicios opcionales en 3D.
- Gestos táctiles: pellizco para zoom, dos dedos para inclinar/girar y arrastre para mover.
- Botones Norte, relieve x1.2/x1.6/x2.0, Ruta ON/OFF y Servicios.
- El mapa 2D sigue siendo el modo estable de respaldo si WebGL, la red o el relieve 3D no están disponibles.
- Todo sin APIs de pago.

# BUEN CAMINO — V6.5.1 PRO

Guía PWA gratuita del Camino Francés con 33 etapas.

## V6.5.1

- Cada punto amarillo de la ruta incorpora **📌 Servicios cerca** junto a Maps, Earth, OSM y Fotos.
- Búsqueda gratuita en OpenStreetMap/Overpass alrededor del punto: alojamientos, comida, agua, policía, farmacia/salud, tiendas, WC, cajeros y transporte.
- Cada resultado indica **distancia y dirección de brújula** desde el punto (N, NE, E, etc.), dirección postal y contacto cuando constan.
- Botones **Ir desde este punto** e **Ir desde mi ubicación** abren navegación a pie sin API de pago.
- Si Overpass no responde, se usan los servicios ya disponibles de la etapa como respaldo.



- La portada muestra de forma visible la versión instalada: **V6.5.1 PRO**.

- Servicios del mapa agrupados automáticamente para evitar saturación de iconos.
- Filtros rápidos sobre el mapa: todos, dormir, comer, agua y salud/farmacia.
- Servicios y alojamientos ordenados por kilómetro del Camino.
- Marca `✓ Datos completos` cuando existe teléfono + web + ubicación.
- Cuando faltan datos, botón para buscar información pública del establecimiento.
- Panel meteorológico compacto dentro de cada etapa con temperatura, probabilidad de lluvia, viento y rachas; enlace a AEMET para la información oficial y avisos.
- Descarga de cada etapa en **GPX**, **GPX + servicios**, **KML** y **TCX**.
- GPX pensado para GPS y para importación en Wikiloc.
- Se mantienen mapas topográficos, rutas precisas, perfil de desnivel interactivo, GPS, fotos, Me gusta, visitas, comentarios, WhatsApp, Favoritos, Mi Camino, DUDAS y primeros auxilios.

## Datos y coste

La app se mantiene sin APIs de pago. Los mapas y datos abiertos pueden depender de conexión. Los datos meteorológicos rápidos se muestran como ayuda; para avisos y predicción oficial se enlaza AEMET.

Los trazados y servicios no sustituyen la señalización del Camino ni los avisos oficiales sobre cierres, obras o condiciones meteorológicas.

- Donación: se indica en letra pequeña que la aportación se destinará a **Save the Children**, con enlace directo a su página oficial de donaciones.


## V6.6.2

- Corrección del bloqueo de caché de la PWA en Android.
- `app.js`, `styles.css` y manifest llevan versión única `662`.
- Service worker con estrategia **network-first** para HTML/JS/CSS/manifest.
- Mantiene el selector directo **2D ↔ 3D**.


## V6.7 — Navegación 3D refinada

- Menos puntos amarillos visibles en 3D para leer mejor el trazado.
- Línea de ruta más clara sobre el relieve.
- Cabecera 3D más compacta.
- **👣 VISTA RUTA** orienta la cámara automáticamente en el sentido de marcha de la etapa.
- **📍 MI POSICIÓN** coloca al peregrino sobre el terreno 3D usando el GPS del teléfono.
- Se mantiene el cambio directo **🗺 2D ↔ 🏔 3D**.


## V6.8 — Flechas de sentido y Servicios 3D reparados

- En 3D se elimina la banda amarilla continua entre puntos.
- Entre cada par de bolas amarillas aparecen **flechas amarillas pequeñas** orientadas en el sentido de marcha de la etapa.
- Se conserva una guía azul muy fina para mantener legible el trazado preciso sin tapar el terreno.
- Al tocar una bola amarilla aparece siempre el panel con **Maps, Earth, OSM, Fotos y Servicios cerca**.
- **Servicios cerca** abre ahora por encima del mapa 3D (antes podía quedar oculto detrás del relieve).
- El botón de Servicios usa un listener directo, sin IDs compartidos entre popups.
- La búsqueda mantiene hoteles/albergues, comida, agua, policía, salud/farmacia, tiendas, WC, cajeros, taxi/transporte y navegación hacia el lugar elegido.


## V6.8.1 — Dirección de flechas corregida

- Cada flecha amarilla se orienta **desde la bola precedente hacia la bola siguiente**.
- La orientación se calcula usando exactamente las coordenadas de esas dos bolas visibles.
- El icono base de la flecha apunta ahora al norte; la rotación cartográfica usa 0°=N, 90°=E, 180°=S y 270°=O.
- Se mantienen Maps, Earth, OSM, Fotos y Servicios cerca al pulsar una bola amarilla.


## V6.9 — Consejos del peregrino y rutas favoritas

- Botón **❓ DUDAS · CONSEJOS DEL PEREGRINO** dentro de la pantalla Resumen de cada etapa.
- Consejos ampliados sobre ampollas, rozaduras, botiquín, luz/pilas, radio de respaldo, meteorología, comunicación y equipo.
- Recomendaciones de ampollas prudentes: proteger, no reventar deliberadamente, no retirar la piel y vigilar signos de infección.
- Botón **♡ / ♥ Favorito** directamente en las tarjetas de las rutas.
- Botón **⬇** directamente en cada ruta para abrir descargas.
- Pantalla **Favoritos** rediseñada para rutas guardadas, con **GPS / Wikiloc** y acceso a GPX, GPX + servicios, KML / Earth y TCX.
- Se mantienen mapa 2D/3D, flechas de dirección, servicios cercanos y el resto de funciones anteriores.


## V7.0 — Albergues y menú del peregrino

- En **Servicios** aparecen en primer lugar dos accesos especiales:
  - **🥾 ALBERGUES DEL CAMINO**
  - **🍲 MENÚ PEREGRINO**
- En **Alojamientos**, la primera vista abre directamente los albergues/refugios del Camino.
- Los albergues se muestran en **orden de marcha por km** y tienen botón **Ver en mapa**.
- El mapa usa un icono especial 🥾 para esta vista.
- **Menú peregrino** distingue entre:
  - **✓ Menú peregrino indicado** cuando los datos lo dicen expresamente.
  - Restaurantes de la etapa donde conviene **confirmar** si lo ofrecen.
- Cada restaurante no verificado tiene un botón **🍲 Consultar menú peregrino**.
- El botón especial existe en las 33 etapas.
- No se marca como “menú peregrino” un establecimiento si no hay evidencia en los datos disponibles.


## V7.1 — Servicios reforzados + Earth/Wikiloc por etapa

- Se eliminan del **Resumen** los seis botones de preparación que ocupaban espacio.
- Esas necesidades se trasladan a **Servicios de etapa**: Agua, Comer, Botiquín/Farmacia, Pilas/Capa/Tienda y Credencial/Información.
- **Servicios** combina los puntos existentes con una búsqueda en vivo de OpenStreetMap alrededor del trazado de cada etapa.
- Se refuerza especialmente la detección de **albergues/hostels/refugios y alojamientos** a lo largo de la ruta.
- Las fichas muestran, cuando existen: teléfono, segundo teléfono, web, email, horario, dirección y km de marcha.
- Cada lugar con coordenadas incorpora **Maps, Cómo llegar, Google Earth, Fotos del lugar, Fotos cercanas y ficha OSM**.
- En “Servicios cerca del punto” se añaden **Earth y Fotos**.
- En **Inicio**, el botón superior rojo DUDAS se sustituye por **🌍 EARTH**. DUDAS sigue disponible dentro de cada etapa.
- Las 33 tarjetas de etapa incorporan botones directos **🌍 EARTH · 🟢 WIKILOC · ⬇ GPS**.
- El botón GPS mantiene las descargas **GPX, GPX + servicios, KML y TCX**.
- Wikiloc abre la búsqueda de la etapa por origen/destino; el GPX de BUEN CAMINO puede importarse para conservar el trazado descargado.
