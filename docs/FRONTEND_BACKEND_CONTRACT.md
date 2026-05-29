# Contrato frontend-backend

Esta guía resume los endpoints que el frontend puede consumir sin conocer detalles internos de Firebase, Gemini o Geoapify Cloud.

Base local recomendada:

```text
https://localhost:7271
```

En `frontend/.env.local`:

```env
VITE_API_URL=https://localhost:7271
VITE_GEOAPIFY_API_KEY=TU_API_KEY_DE_GEOAPIFY
VITE_GEOAPIFY_TILE_STYLE=osm-bright
VITE_GEOAPIFY_ROUTE_MODE=walk
```

## Reportes para mapa

```http
GET /api/reports/map
```

Devuelve reportes listos para pintar marcadores en Geoapify. Por defecto regresa solo reportes activos.

Filtros útiles:

```http
GET /api/reports/map?status=active&minSeverity=2&limit=50
GET /api/reports/map?type=blocked_ramp
GET /api/reports/map?search=rampa
GET /api/reports/map?north=32.54&south=32.50&east=-117.02&west=-117.08
```

Respuesta por elemento:

```json
{
  "id": 7,
  "type": "blocked_ramp",
  "typeLabel": "Rampa bloqueada",
  "title": "Rampa bloqueada",
  "description": "Rampa bloqueada por carro frente al cruce",
  "latitude": 32.5201,
  "longitude": -117.0412,
  "position": { "lat": 32.5201, "lng": -117.0412 },
  "severity": 3,
  "severityLabel": "Alta",
  "severityColor": "#dc2626",
  "status": "active",
  "statusLabel": "Activo",
  "markerColor": "#dc2626",
  "markerIcon": "♿",
  "requiresAttention": true,
  "imageUrl": null,
  "createdAtDisplay": "Hace 5 minutos",
  "confirmations": 0,
  "rejections": 0
}
```

El frontend puede usar directamente:

```js
<Marker position={reporte.position} />
```

## Lista completa de reportes

```http
GET /api/reports
```

Filtros:

```http
GET /api/reports?status=active&type=blocked_ramp&search=rampa&minSeverity=2&limit=100
```

La respuesta completa incluye campos visuales adicionales como `position`, `markerColor`, `markerIcon`, `statusLabel`, `severityColor`, `requiresAttention` y `createdAtDisplay`.

## Opciones de formulario

```http
GET /api/reports/options
```

Usar este endpoint para llenar selects de tipo, severidad, estatus y leyenda de colores.

## Crear reporte

```http
POST /api/reports
Content-Type: multipart/form-data
```

Campos aceptados:

```text
type o tipo
description o descripcion
latitude o latitud o lat
longitude o longitud o lng
severity o severidad
image o foto
```

Valores recomendados para `type`:

```text
sidewalk_damage
blocked_ramp
missing_ramp
stairs
unsafe_crossing
construction
obstacle
transport_issue
other
```

El backend también acepta etiquetas visibles en español como `Banqueta rota`, `Rampa bloqueada`, `Cruce inseguro`, `Sin banqueta`, etc.

## Score de ruta

```http
GET /api/routes/options
```

Sirve para que el frontend conozca los límites y campos opcionales del score de ruta.

Cuando Geoapify Routing regrese una ruta real, el frontend debe mandar el polyline decodificado al backend:

```http
POST /api/routes/score
Content-Type: application/json
```

Alias equivalente:

```http
POST /api/routes/accessibility
Content-Type: application/json
```

Request recomendado:

```json
{
  "points": [
    { "lat": 32.514947, "lng": -117.038247 },
    { "lat": 32.51598, "lng": -117.034608 },
    { "lat": 32.510182, "lng": -117.036537 }
  ],
  "radiusMeters": 50,
  "distanceMeters": 1200,
  "durationSeconds": 900,
  "travelMode": "walking",
  "source": "geoapify-routing",
  "includeReports": true
}
```

Campos importantes:

```text
points: puntos reales de la ruta generada por Geoapify. Mínimo 2, máximo 1000.
radiusMeters: radio para considerar reportes cercanos. Default 50, rango 10-300.
distanceMeters: distancia que Geoapify calculó, opcional.
durationSeconds: duración que Geoapify calculó, opcional.
travelMode: normalmente walking.
includeReports: si es false, omite la lista completa de reportes para respuestas más ligeras.
```

Respuesta útil para pintar la ruta:

```json
{
  "score": 36,
  "accessibilityPercent": 36,
  "level": "low",
  "levelLabel": "Ruta poco accesible",
  "color": "red",
  "message": "La ruta tiene varias barreras cercanas. Se recomienda buscar una alternativa si es posible.",
  "summary": "Ruta poco accesible: se detectaron 3 reportes cercanos.",
  "radiusMeters": 50,
  "nearbyReports": 3,
  "nearbyReportIds": [4, 2, 1],
  "warnings": ["1 obra o reparación", "1 rampa bloqueada", "1 banqueta dañada"],
  "routeStyle": {
    "strokeColor": "#dc2626",
    "strokeOpacity": 0.95,
    "strokeWeight": 7,
    "badgeLabel": "Rojo",
    "description": "Ruta poco accesible"
  },
  "impactReports": [
    {
      "id": 2,
      "type": "blocked_ramp",
      "typeLabel": "Rampa bloqueada",
      "distanceMeters": 21.6,
      "distanceLabel": "22 m",
      "penalty": 18,
      "impactLevel": "high",
      "impactLabel": "Impacto alto"
    }
  ],
  "routeLengthMeters": 1188.2,
  "routeLengthLabel": "1.19 km",
  "googleDistanceMeters": 1200,
  "googleDistanceLabel": "1.2 km",
  "durationLabel": "15 min",
  "bounds": {
    "north": 32.51598,
    "south": 32.510182,
    "east": -117.034608,
    "west": -117.038247
  }
}
```

El frontend puede pasar `routeStyle.strokeColor`, `routeStyle.strokeOpacity` y `routeStyle.strokeWeight` a la polyline de Geoapify. El backend ya calcula cercanía contra segmentos de la ruta, por lo que no depende de que el polyline tenga puntos extremadamente densos.

## Estadísticas

```http
GET /api/stats
```

Devuelve totales para cards o dashboard sencillo:

```text
totalReports
activeReports
resolvedReports
rejectedReports
highSeverityReports
mediumSeverityReports
lowSeverityReports
mostCommonTypeLabel
reportsByType
reportsByStatus
```

## Firebase y Gemini

El frontend no consume Firebase directamente. Todo debe pasar por el backend.

```http
GET /api/firebase/status
GET /api/vision/status
POST /api/vision/analyze-report-image
```

Las llaves de Gemini y credenciales de Google Cloud no deben ir en React.

## Crear reporte con foto y Gemini

Para el flujo asistido por IA, el frontend puede llamar directamente:

```http
POST /api/reports/analyze-and-create
Content-Type: multipart/form-data
```

Campos mínimos:

```text
image o foto
latitude o latitud o lat
longitude o longitud o lng
```

Campos opcionales que el usuario puede corregir antes de enviar:

```text
type o tipo
description o descripcion
severity o severidad
```

La respuesta trae el reporte guardado y la sugerencia de Gemini:

```json
{
  "report": { "id": 8, "type": "blocked_ramp", "position": { "lat": 32.5201, "lng": -117.0412 } },
  "geminiRequested": true,
  "geminiSucceeded": true,
  "geminiError": null,
  "vision": {
    "type": "blocked_ramp",
    "typeLabel": "Rampa bloqueada",
    "severity": 3,
    "severityLabel": "Alta",
    "confidence": 0.86,
    "suggestedDescription": "Rampa bloqueada por un vehículo.",
    "accessibilityImpact": "Puede impedir el paso de personas en silla de ruedas."
  }
}
```

Flujo recomendado en React:

```text
1. Usuario selecciona foto y ubicación.
2. Frontend manda FormData a /api/reports/analyze-and-create.
3. Backend analiza con Gemini, guarda imagen local y crea el documento en Firestore.
4. Frontend refresca GET /api/reports/map para mostrar el nuevo marcador.
```

Si prefieren que el usuario revise la sugerencia antes de guardar, usen primero:

```http
POST /api/vision/analyze-report-image
```

y después creen el reporte con:

```http
POST /api/reports
```

## Imágenes de reportes

El frontend debe usar el campo `imageUrl` que devuelve el backend. En esta versión las imágenes se guardan localmente y `imageUrl` llega como ruta relativa:

```json
{
  "imageUrl": "/uploads/reports/archivo.jpg",
  "imageStorageProvider": "local",
  "imageContentType": "image/jpeg"
}
```

El helper `getImageUrl` en `frontend/src/services/api.js` convierte esa ruta relativa en URL completa usando `VITE_API_URL`.


## Home / dashboard

El frontend usa estos endpoints para llenar la pantalla de inicio con datos reales:

```text
GET /api/dashboard/summary?recentLimit=5&hotspotLimit=3
GET /api/reports/hotspots?limit=3
```

`/api/dashboard/summary` devuelve totales, reportes activos, reportes con imagen, barrera más común, reportes recientes y hotspots principales.

`/api/reports/hotspots` agrupa reportes activos cercanos para mostrar zonas críticas.
