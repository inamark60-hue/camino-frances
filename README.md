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
