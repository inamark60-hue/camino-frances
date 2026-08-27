# BUEN CAMINO — V8.0 PRO · PUBLIC READY

## V8.0 — Rutas a pie, brújula universal, cielo orientado y mapas ampliados

- Nuevo acceso **🚶 A PIE · RUTAS** en Inicio y botón pequeño en las 33 etapas. Usa el trazado real disponible del Camino y mantiene las advertencias de señalización física.
- Brújula flotante transparente, segmentada cada 10°, arrastrable y reutilizable en mapas pequeño/grande y en la carta celeste. Rosa negra + aguja roja; al coincidir el norte del mapa/cielo y el norte del dispositivo, rosa roja + aguja negra.
- Estrellas y constelaciones renovadas: GPS continuo opcional, orientación por sensores del móvil, vista que responde al movimiento y fichas internas de Osa Mayor, Osa Menor, Casiopea, Orión, Cisne y Lira.
- Las fichas de constelaciones y los puntos amarillos pueden cargar fotografías reales desde Wikimedia Commons, filtrando licencias abiertas y mostrando autor/licencia/enlace cuando los metadatos están disponibles.
- Botones laterales en mapas: **3D**, hombre amarillo **Street View** y **SÍMBOLOS** con leyenda. Street View busca primero fotografía abierta de KartaView y ofrece Google como respaldo externo.
- Vista 3D basada en OpenFreeMap/MapLibre con caminos, edificios extruidos y relieve; en modo **TOPO · CURVAS** superpone OpenTopoMap para mantener las curvas de nivel visibles.
- Botón 3D con fondo blanco y volumen azul. Guía App ampliada con el uso de A pie, brújula, cielo, símbolos, Street View, 3D y fotos libres.
- Se conservan íntegramente `data.js`, `verified-routes.js`, las **33 etapas** y las funciones anteriores. Recursos y Service Worker actualizados a **V8.0**.


## V7.9 — Brújula flotante en mapas pequeño y grande

- Corregida la brújula para no mezclar eventos absolutos y relativos.
- Prioriza `webkitCompassHeading` en iOS y `deviceorientationabsolute` en Android/Chromium.
- Filtro circular adaptativo para reducir oscilaciones, incluido el salto 359°/0°.
- Compensación de orientación visual y del modo horizontal forzado del mapa grande.
- **🧭 BRÚJULA** flotante disponible en mapa pequeño, mapa de etapa y mapa grande.
- Fondo totalmente transparente; rosa negra y aguja roja. Al alinear el norte del mapa con el norte de la brújula, la rosa pasa a rojo y la aguja a negro.
- La brújula se puede arrastrar con el dedo y conserva su posición relativa entre ventanas de mapa.
- Se conserva la brújula independiente de Inicio y Etapas.
- Recursos y Service Worker actualizados a **V7.9**.


## V7.7 — Ruta bici, brújula y cielo dentro de la app

- Nuevos botones **🚴 RUTA BICI · 🧭 BRÚJULA · ✨ ESTRELLAS / CONSTELACIONES** en Inicio y en las etapas.
- Las tres funciones se abren como pantallas internas de BUEN CAMINO, con **← VOLVER** a la ventana exacta anterior.
- **Ruta bici**: cálculo orientativo mediante BRouter con perfil de bicicleta `trekking` y datos OpenStreetMap; si el servicio no responde, se muestra el Camino como referencia claramente advertida, sin afirmar que todos los tramos sean ciclables.
- **Brújula**: utiliza Device Orientation del móvil, con solicitud de permiso cuando el sistema lo exige y sin guardar el rumbo.
- **Estrellas y constelaciones**: carta celeste local calculada con fecha/hora y posición de etapa o GPS; incluye estrellas brillantes y trazos de Osa Mayor, Casiopea, Orión, Cisne y Lira cuando están sobre el horizonte.
- Política de privacidad actualizada para reflejar GPS de cielo, sensores de orientación y BRouter.
- Se conservan las **33 etapas**, mapas 2D/3D, GPS, perfiles, servicios, albergues, AEMET, Earth, Wikiloc, descargas, Favoritos, Mi Camino, fotos, comentarios, guía y donación directa a Save the Children.
- Recursos y Service Worker actualizados a **V7.7**.

## V7.6 — Public Ready

- Nuevo botón **📲 INSTALAR APP** en Inicio, compatible con el aviso nativo de instalación PWA cuando el navegador lo ofrece y con instrucciones para Android/iPhone cuando no está disponible.
- Bienvenida de primer uso, mostrada una sola vez en el dispositivo.
- Nuevo apartado **Acerca de · Privacidad · Datos**, con explicación transparente del almacenamiento local, GPS y proveedores externos.
- Nueva página pública **privacy.html**, preparada para enlazarla desde una futura ficha de tienda.
- Opción confirmada para borrar Favoritos, Mi Camino, likes, comentarios, contadores y fotos locales.
- Estado visible **Con conexión / Sin conexión**.
- Service Worker V7.6: conserva el enfoque network-first y añade respaldo en caché para los datos abiertos de Open Pilgrimages tras su primera descarga, sin cachear masivamente mapas o servicios externos.
- Metadatos PWA/iPhone mejorados y manifest clasificado como travel/navigation.
- Se mantienen las **33 etapas** y todas las funciones de V7.5.


## V7.5 — Guía de uso integrada

- Nuevo botón **📖 GUÍA APP · CÓMO USAR BUEN CAMINO** en la pantalla de Inicio.
- La guía se abre dentro de la propia PWA y explica las 33 etapas, mapas 2D/3D, GPS, puntos amarillos, perfil, servicios, alojamientos, Menú peregrino, meteorología, descargas GPS, Earth/Wikiloc, Favoritos, Mi Camino, comunidad, compartir, consejos e instalación.
- Incluye un flujo recomendado antes, durante y después de cada etapa y un aviso de seguridad.
- Se conservan todas las funciones de V7.4 y las **33 etapas**.
- Recursos y service worker actualizados a **V7.5 PRO** para renovar correctamente la caché PWA.

## V7.4 — Creador y donación solidaria

- Creador mostrado como **Ignacio Marquiegui**.
- La donación abre directamente la página oficial de **Save the Children España**.
- BUEN CAMINO no procesa, gestiona ni recibe las donaciones.
- Recursos y service worker actualizados a **V7.4 PRO** para renovar correctamente la caché PWA.

## V7.3 — Correcciones de coherencia y PWA

- Se mantiene íntegra la aplicación V7.2 y sus **33 etapas**.
- Versión visible, manifest, recursos y service worker unificados en **V7.3 PRO**.
- `data.js` y `verified-routes.js` llevan también versión de caché para evitar mezclar archivos de distintas versiones en Android/PWA.
- La limpieza de caché elimina únicamente cachés antiguas de **BUEN CAMINO** y no otras cachés del mismo origen.
- Eliminados de `data.js` los antiguos servicios demostrativos de la etapa 30 y coordenadas heredadas que no estaban conectadas a la aplicación.
- Se conserva **🌍 EARTH** solo en Inicio y **❓ DUDAS · CONSEJOS DEL PEREGRINO** únicamente en el Resumen de las etapas.
- Se mantienen mapas 2D/3D, 🎯 centrar ruta, flechas 3D en sentido de marcha, GPS, perfil, servicios, albergues, Menú peregrino, AEMET, Favoritos, descargas, Wikiloc, Earth, fotos, comentarios, likes, visitas, WhatsApp y Mi Camino.


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

- Donación: enlace directo a la página oficial de **Save the Children España**; BUEN CAMINO no gestiona ni recibe la aportación.


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


## V7.2 — Centrar ruta y cabecera limpia

- **Nuevo botón 🎯 CENTRAR RUTA en MAPA GRANDE**, visible en la barra superior.
- Todos los mapas 2D llevan además un botón flotante **🎯 RUTA** en el centro superior del mapa.
- Al pulsarlo, el mapa vuelve a encuadrar automáticamente toda la etapa después de hacer zoom o desplazarla.
- El mapa 3D incorpora **🎯 CENTRAR**.
- Se elimina el botón superior duplicado **DUDAS** dentro de las etapas.
- Se mantiene únicamente **❓ DUDAS · CONSEJOS DEL PEREGRINO** en el Resumen de cada etapa.
- En Inicio se mantiene **🌍 EARTH**.
- Los albergues del Camino se mejoran con distintivo 🐚, identificación público/institucional cuando los datos lo permiten, logo de su web cuando existe y estado de sello de credencial.
- Si no consta el sello, la app indica **confirmar en recepción** en lugar de inventarlo.
