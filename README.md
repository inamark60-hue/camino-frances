# BUEN CAMINO — V4.9.1 PRO

Actualización centrada en **servicios útiles, cartografía y lectura del relieve**, manteniendo el proyecto sin APIs de pago.
## Corrección V4.9.1

- El mapa ya fija una **vista provisional inmediata** antes de esperar a los datos remotos, evitando la pantalla gris.
- OpenStreetMap queda como **respaldo automático bajo OpenTopoMap**: si las teselas topográficas fallan, siempre queda cartografía visible.
- Las descargas JSON tienen tiempo máximo y se usa el **trazado local verificado** como respaldo.
- Se evita que dos inicializaciones de mapa se pisen entre sí al cambiar rápidamente de Resumen a Mapa grande.
- Los servicios se cargan después y **ya no bloquean el dibujo del mapa**.


## Cambios principales

- **Puntos amarillos de la ruta interactivos**: al tocarlos, BUEN CAMINO selecciona el punto equivalente en el perfil de desnivel y muestra km, altitud y coordenadas cuando el perfil está disponible.
- Cada punto de ruta ofrece accesos externos gratuitos a **Google Maps satélite**, **Google Earth web** y **OpenStreetMap**. No se usa Google Maps Platform ni Places API.
- Los puntos amarillos son más grandes a niveles altos de zoom para poder seguir la ruta sin tapar el mapa.
- **Autopistas (OSM `motorway`) resaltadas en azul** mediante una superposición obtenida de OpenStreetMap/Overpass cuando hay datos disponibles.
- **Perfil de desnivel más pequeño** para dejar más superficie útil al mapa, tanto en vertical como en horizontal.
- **Servicios de etapa renovados**: Dormir, Comer, Agua, Farmacia, Salud, Taxi, Bus/Tren, Tienda, Cajero, Lavandería, WC, Bicicleta, Sellos, Policía y Ayuntamiento.
- Las fichas de servicios pueden mostrar **teléfono, web, horario, ubicación, km del Camino y coordenadas** cuando las fuentes abiertas los publican.
- Botones directos a **OpenStreetMap, Google Maps, vista satélite y Google Earth** para cada lugar.
- La pestaña **Alojamientos** carga alojamientos reales de fuentes abiertas en lugar de fichas de ejemplo cuando hay datos para la etapa.
- **Meteorología AEMET**: en la Etapa 1 abre directamente la predicción oficial de Orreaga/Roncesvalles; el resto de etapas enlaza a la predicción municipal de AEMET mientras se incorporan los enlaces municipales específicos.
- Se mantienen: mapa topográfico con curvas de nivel, RUTA ON/OFF, GPS, mapa grande/horizontal, DUDAS, Primeros Auxilios y 112.

## Fuentes gratuitas

- Open Pilgrimages / OpenStreetMap (ODbL) — ruta y puntos útiles.
- OpenTopoMap — cartografía topográfica y curvas de nivel.
- Overpass API — consultas OSM bajo demanda para servicios y autopistas.
- AEMET — meteorología oficial mediante enlace público.
- Google Maps URLs / Google Earth web — solo enlaces externos gratuitos; no se utiliza ninguna API de pago.

## Importante

La información de teléfonos, horarios y establecimientos puede cambiar. BUEN CAMINO muestra únicamente datos publicados en las fuentes abiertas y no inventa contactos, precios ni disponibilidad. El mapa es una ayuda al peregrino y no sustituye la señalización oficial, avisos meteorológicos ni indicaciones de emergencias.
