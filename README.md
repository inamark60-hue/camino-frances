# BUEN CAMINO — V6.2 PRO

Compartir directo y funciones de comunidad local.

- Botón grande para compartir BUEN CAMINO por WhatsApp con el enlace directo de la aplicación (GitHub Pages), no el repositorio de GitHub.
- Compartir cada etapa mantiene un enlace directo `#stage-N`.
- Contadores visibles de visitas, etapas que gustan y comentarios guardados en el dispositivo.
- Contadores por etapa de visitas y Me gusta del dispositivo.
- Botón de comentarios en Inicio. Los comentarios se guardan localmente y no se envían a un servidor.
- Botón 📷 en cada etapa para añadir fotos del usuario desde cámara/galería.
- Galería local por etapa, con opción de compartir o eliminar cada foto.
- Las fotos se comprimen antes de guardarlas en IndexedDB para reducir espacio.
- Se mantienen las 33 etapas, mapas, rutas, servicios, alojamientos, GPS, perfil, AEMET, DUDAS, compartir y donación al creador inatiusmarki.

## Importante sobre los contadores y la comunidad

Esta versión no usa un servidor de pago ni un backend externo. Por tanto, los likes, visitas, comentarios y fotos son locales a cada dispositivo. Para tener cifras globales y fotos/comentarios compartidos entre todos los peregrinos haría falta un backend común y moderación.

El enlace compartido abre directamente la web-app de BUEN CAMINO. Si el receptor la tiene instalada, Android/Chrome puede reutilizar la PWA, pero una apertura garantizada dentro de la app instalada requiere una aplicación nativa/Android con enlaces de aplicación verificados.
