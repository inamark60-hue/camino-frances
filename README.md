# BUEN CAMINO — V6.6.2 PRO

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
