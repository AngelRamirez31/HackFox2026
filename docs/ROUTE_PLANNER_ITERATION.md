# Iteración: ruta básica A → B

Esta iteración agrega una interfaz segura para probar rutas peatonales dentro del mapa antes de integrar el porcentaje de accesibilidad.

## Funcionalidad agregada

- Selección de punto A y punto B con clic en el mapa.
- Marcadores A y B arrastrables.
- Cálculo de ruta peatonal usando Geoapify Routing desde el frontend.
- Dibujo de la ruta sobre el mapa.
- Resumen de distancia y tiempo estimado.
- Botón para limpiar la ruta.
- El score de accesibilidad se mantiene separado y listo para la siguiente iteración.

## Flujo esperado

1. Abrir `http://localhost:5173/mapa`.
2. Seleccionar `Elegir punto A`.
3. Dar clic en el mapa.
4. Seleccionar o dejar activo `Elegir punto B`.
5. Dar clic en otro punto del mapa.
6. Presionar `Trazar ruta`.
7. Ver la ruta dibujada, distancia y tiempo aproximado.

## Requisitos

El frontend necesita una key válida de Geoapify en:

```env
VITE_GEOAPIFY_API_KEY=...
```

La API key debe pertenecer a Geoapify y permitir Map Tiles API y Routing API.

## Iteración backend: score de accesibilidad listo para ruta real

La ruta A → B debe seguir dependiendo de Geoapify Routing. El backend no inventa rutas ni dibuja líneas provisionales.

Cuando el frontend tenga una ruta real, debe mandar los puntos del polyline a:

```http
POST /api/routes/score
```

o al alias:

```http
POST /api/routes/accessibility
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

El backend cruza la ruta con reportes activos de Firestore usando distancia a segmentos de la ruta, no solo distancia a puntos sueltos. Esto evita que se ignoren barreras ubicadas entre dos puntos del polyline.

Respuesta útil para UI:

```json
{
  "score": 72,
  "accessibilityPercent": 72,
  "level": "medium",
  "levelLabel": "Ruta con precaución",
  "color": "yellow",
  "summary": "Ruta con precaución: se detectaron 2 reportes cercanos.",
  "routeStyle": {
    "strokeColor": "#f59e0b",
    "strokeOpacity": 0.9,
    "strokeWeight": 6,
    "badgeLabel": "Amarillo",
    "description": "Ruta con precaución"
  },
  "impactReports": []
}
```

`routeStyle` se puede pasar directo a la polyline de Geoapify cuando la key de Directions esté lista.
