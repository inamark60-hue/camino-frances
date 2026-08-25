# BUEN CAMINO — V5.0 ESTABLE

Versión de estabilización de la guía Android del Camino Francés.

## Qué cambia

- Se elimina la dependencia de Leaflet/unpkg: el mapa usa un motor cartográfico propio en JavaScript.
- El trazado de la etapa 1 está dentro de la aplicación y se dibuja aunque fallen datos externos.
- OpenTopoMap se usa como fondo topográfico; si una tesela falla, intenta OpenStreetMap como respaldo.
- Modo MAPA GRANDE/HORIZONTAL independiente del bloqueo de giro de Android: la vista se rota internamente cuando hace falta.
- Perfil de desnivel compacto y sincronizado en ambos sentidos con los puntos amarillos de la ruta.
- Los puntos amarillos aumentan de tamaño al hacer zoom.
- Servicios y Alojamientos de la etapa 1 disponen de una base local verificada con teléfonos, webs, direcciones y enlaces de mapa; no dependen de Overpass para mostrar los datos esenciales.
- Se mantienen DUDAS, Primeros Auxilios, 112, AEMET, GPS, favoritos y Mi Camino.

## Principio de datos

BUEN CAMINO no inventa establecimientos, teléfonos ni rutas. Las demás etapas se irán incorporando y verificando progresivamente.
