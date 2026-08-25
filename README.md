# Camino Francés — PWA Android gratuita

Prototipo funcional de una guía del Camino Francés pensada exclusivamente para Android móvil.

## Qué incluye
- 33 etapas navegables.
- Diseño móvil basado en el mockup aprobado.
- Ficha de etapa con distancia, duración, dificultad y desnivel.
- Etapa 30 (Portomarín → Palas de Rei) como ficha piloto ampliada.
- OpenStreetMap + Leaflet (sin API comercial de pago).
- Geolocalización del teléfono.
- Favoritos guardados localmente.
- “Mi Camino” con etapas completadas y progreso.
- PWA instalable en Android.
- Caché básica offline del núcleo de la aplicación.
- Sin cuenta obligatoria y sin backend de pago.

## Ejecutar localmente
La PWA necesita servirse por HTTP/HTTPS (no abrir `index.html` directamente).

Con Python instalado:

```bash
python -m http.server 8080
```

Después abre en Chrome para Android la IP/URL correspondiente, por ejemplo `http://localhost:8080` en un ordenador o una URL HTTPS cuando se publique.

## Publicar gratis
Se puede publicar en GitHub Pages, Cloudflare Pages, Netlify o Vercel usando sus planes gratuitos. Para instalación PWA y GPS en producción se recomienda HTTPS, que estos servicios proporcionan.

## Importante sobre los datos
Los datos de alojamientos y servicios de la Etapa 30 son deliberadamente demostrativos. Antes de publicar al público deben sustituirse por información verificable de fuentes oficiales o por datos obtenidos legalmente de OpenStreetMap/Overpass. No se muestran precios “en tiempo real” porque eso normalmente requiere servicios externos y condiciones comerciales.

## Próxima fase recomendada
1. Cargar trazados GPX/GeoJSON reales de las 33 etapas.
2. Crear dataset verificado de localidades y servicios.
3. Incorporar consulta gratuita a OpenStreetMap/Overpass con caché prudente.
4. Añadir descarga offline de una etapa seleccionada.
5. Añadir panel de administración gratuito con Supabase, solo si hace falta.


## Versión 2 — mapas corregidos
- El mapa general carga el trazado completo real del Camino Francés desde un GeoJSON abierto.
- Cada ficha de etapa recorta el trazado entre el inicio y el final de la etapa.
- El mapa ajusta automáticamente el zoom al recorrido visible.
- La geolocalización sigue funcionando sobre el mapa.
- El service worker usa una caché nueva (`camino-frances-v2`) para forzar la actualización de la app instalada.

Fuente de trazado: Open Pilgrimages / OpenStreetMap (ODbL). Para Galicia, la Xunta de Galicia también publica el KML oficial del Camino Francés.


## V3 — corrección cartográfica
- Se elimina el recorte automático que podía asignar una etapa a una zona incorrecta.
- La etapa 1 usa un GPX específico de Fundación ONCE (ruta de Napoleón).
- El mapa general conserva segmentos GeoJSON separados para evitar unir tramos inconexos.
- Las demás etapas no dibujan rutas aproximadas hasta completar su validación.
- Caché PWA renovada a v3.


## V3.1 — trazado local de la etapa 1
- La etapa 1 ya no intenta descargar el GPX desde otra web al abrirse.
- El trazado se incluye dentro de la propia PWA (`verified-routes.js`) para evitar bloqueos CORS.
- Los puntos usados proceden del GPX publicado por Fundación ONCE para Saint-Jean-Pied-de-Port → Roncesvalles.
- La aplicación mantiene la regla de seguridad: una etapa sin trazado validado no dibuja rutas aproximadas.
- Caché renovada a `camino-frances-v31`.
- El mapa base de OpenStreetMap sigue necesitando conexión para descargar teselas que no estén ya en caché.

**Nota:** el trazado local de V3.1 está simplificado a una selección de puntos del GPX oficial para la visualización cartográfica. No debe usarse como navegación turn-by-turn ni sustituye la señalización física del Camino.
