# Backend API

Proyecto backend ubicado en:

```text
backend/
```


Base local recomendada:

```text
https://localhost:7271
```

## Health

```http
GET /api/health
```

Sirve para verificar que el backend esté vivo y que el frontend pueda conectarse.

## Reportes

```http
GET /api/reports/options
```

Devuelve los tipos, severidades, estatus y nombres de campos aceptados por el backend. Este endpoint ayuda al frontend a evitar valores inválidos.

```http
GET /api/reports
```

Devuelve todos los reportes.

```http
GET /api/reports?status=active&type=blocked_ramp
```

Permite filtrar por estatus y tipo.

```http
GET /api/reports/nearby?lat=32.514947&lng=-117.038247&radiusMeters=800
```

Devuelve reportes dentro de un radio.

```http
POST /api/reports
Content-Type: multipart/form-data
```

Campos aceptados:

```text
type o tipo: sidewalk_damage | blocked_ramp | missing_ramp | stairs | unsafe_crossing | construction | obstacle | transport_issue | other
description o descripcion: texto corto opcional, máximo 500 caracteres
latitude, latitud o lat: número entre -90 y 90
longitude, longitud o lng: número entre -180 y 180
severity o severidad: 1 | 2 | 3 | baja | media | alta
image o foto: archivo opcional .jpg, .jpeg, .png o .webp, máximo 5 MB
```

Para facilitar la conexión con el frontend actual, el backend también acepta nombres visibles en español como `Banqueta rota`, `Rampa bloqueada`, `Sin banqueta`, `Obstáculo en el camino`, `Escalón sin rampa`, `Pendiente peligrosa` y `Cruce inseguro`, normalizándolos al tipo interno correcto.

```http
PUT /api/reports/{id}/status
Content-Type: application/json
```

```json
{
  "status": "resolved"
}
```

Estatus permitidos:

```text
active | resolved | rejected
```

```http
POST /api/reports/{id}/confirm
POST /api/reports/{id}/reject
```

Sirven para validación comunitaria.

## Rutas

```http
GET /api/routes/options
```

Devuelve el contrato recomendado para calcular accesibilidad de rutas, incluyendo límites, campos opcionales y niveles de score.

```http
POST /api/routes/score
Content-Type: application/json
```

Alias equivalente:

```http
POST /api/routes/accessibility
Content-Type: application/json
```

Request mínimo:

```json
{
  "points": [
    { "lat": 32.514947, "lng": -117.038247 },
    { "lat": 32.515980, "lng": -117.034608 }
  ],
  "radiusMeters": 50
}
```

Request recomendado cuando el frontend ya tenga la ruta real de Geoapify Routing:

```json
{
  "points": [
    { "lat": 32.514947, "lng": -117.038247 },
    { "lat": 32.515980, "lng": -117.034608 },
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

El frontend debe mandar los puntos del polyline real de Geoapify. El backend no calcula la ruta A → B; solo analiza accesibilidad sobre la ruta ya generada.

La mejora importante de esta iteración es que el backend calcula distancia de cada reporte a los segmentos de la ruta, no únicamente a puntos individuales. Así se detectan barreras ubicadas entre dos puntos del polyline.

Respuesta esperada:

```json
{
  "score": 72,
  "accessibilityPercent": 72,
  "level": "medium",
  "levelLabel": "Ruta con precaución",
  "color": "yellow",
  "message": "La ruta tiene barreras cercanas. Se recomienda avanzar con precaución.",
  "summary": "Ruta con precaución: se detectaron 2 reportes cercanos.",
  "radiusMeters": 50,
  "nearbyReports": 2,
  "nearbyReportIds": [2, 7],
  "warnings": ["1 banqueta dañada", "1 rampa bloqueada"],
  "routeStyle": {
    "strokeColor": "#f59e0b",
    "strokeOpacity": 0.9,
    "strokeWeight": 6,
    "badgeLabel": "Amarillo",
    "description": "Ruta con precaución"
  },
  "impactReports": [
    {
      "id": 7,
      "type": "blocked_ramp",
      "typeLabel": "Rampa bloqueada",
      "distanceMeters": 18.4,
      "distanceLabel": "18 m",
      "penalty": 18,
      "impactLevel": "high",
      "impactLabel": "Impacto alto"
    }
  ],
  "routeLengthMeters": 1190.5,
  "routeLengthLabel": "1.19 km",
  "googleDistanceMeters": 1200,
  "googleDistanceLabel": "1.2 km",
  "durationSeconds": 900,
  "durationLabel": "15 min",
  "travelMode": "walking",
  "source": "geoapify-routing"
}
```

`routeStyle` se puede usar directamente para pintar la ruta en el frontend según accesibilidad.

## Estadísticas

```http
GET /api/stats
```

Devuelve totales por estatus, tipo y reportes graves activos.


## Seguridad básica aplicada

- CORS limitado a `localhost:5173`.
- Validación de coordenadas, severidad, tipo y estatus.
- Subida de imágenes limitada a 5 MB.
- Solo se aceptan `.jpg`, `.jpeg`, `.png` y `.webp`.
- Las imágenes se guardan con nombre aleatorio.
- No hay API keys ni credenciales en el repositorio.
- La clave de Gemini queda pensada para backend, no para React.

## Gemini Vision

La clave de Gemini no debe guardarse en React ni en archivos del repositorio. Para desarrollo local se usa User Secrets dentro de `backend/`:

```bash
dotnet user-secrets set "Gemini:ApiKey" "TU_API_KEY_DE_GEMINI"
```

Para revisar si el backend detecta la clave:

```http
GET /api/vision/status
```

Respuesta esperada si ya está configurada:

```json
{
  "configured": true,
  "resource": "Gemini Vision desde backend",
  "keyLocation": "User Secrets en local o variable Gemini__ApiKey en despliegue"
}
```

Para analizar una foto antes de crear el reporte:

```http
POST /api/vision/analyze-report-image
Content-Type: multipart/form-data
```

Campo:

```text
image: archivo .jpg, .jpeg, .png o .webp, máximo 5 MB
```

Respuesta esperada:

```json
{
  "type": "sidewalk_damage",
  "typeLabel": "Banqueta dañada",
  "severity": 3,
  "severityLabel": "Alta",
  "confidence": 0.86,
  "summary": "Se observa una banqueta dañada que dificulta el paso.",
  "suggestedDescription": "Banqueta dañada que puede bloquear el paso de una silla de ruedas.",
  "accessibilityImpact": "Puede obligar a personas con movilidad reducida a bajar a la calle.",
  "model": "gemini-2.5-flash"
}
```

La respuesta de Gemini funciona como sugerencia. El frontend debe permitir que el usuario confirme o edite el tipo, severidad y descripción antes de guardar el reporte.

## Firebase / Firestore

Esta iteración ya incluye un repositorio para guardar reportes en Firebase Cloud Firestore desde el backend. Por seguridad, el proyecto sigue arrancando con memoria local si no se configura Firebase.

```http
GET /api/firebase/status
```

Sirve para revisar qué almacenamiento está activo:

```json
{
  "provider": "InMemory",
  "database": "InMemory",
  "firestoreEnabled": false,
  "projectConfigured": false,
  "reportsCollection": "reports"
}
```

Para activar Firestore localmente desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Persistence:Provider" "Firestore"
dotnet user-secrets set "Firebase:ProjectId" "ID_DEL_PROYECTO_FIREBASE"
dotnet user-secrets set "Firebase:ReportsCollection" "reports"
```

Autenticación local recomendada con Geoapify Cloud CLI:

```bash
gcloud auth application-default login
```

Alternativa con archivo de credenciales local, sin subirlo al repo:

```bash
dotnet user-secrets set "Firebase:CredentialsPath" "C:\\ruta\\segura\\firebase-service-account.json"
```

El backend no guarda credenciales en `appsettings.json`. Para despliegue en Cloud Run, lo ideal es usar la service account del servicio y variables de entorno:

```text
Persistence__Provider=Firestore
Firebase__ProjectId=ID_DEL_PROYECTO_FIREBASE
Firebase__ReportsCollection=reports
Gemini__ApiKey=TU_API_KEY_DE_GEMINI
```

Colección usada en Firestore:

```text
reports
```

Documento auxiliar usado para IDs numéricos compatibles con el frontend:

```text
_metadata/counters
```

Los endpoints públicos no cambian. El frontend puede seguir usando `GET /api/reports`, `POST /api/reports`, `POST /api/routes/score` y `GET /api/stats`; el cambio de memoria a Firestore ocurre solamente en backend.

## Iteración frontend-ready

Esta iteración agrega campos y endpoints pensados para que el frontend consuma menos lógica y pueda pintar mapa, tarjetas y rutas directamente.

### Reportes para marcadores

```http
GET /api/reports/map
```

Devuelve una lista ligera de reportes lista para Geoapify. Por defecto regresa reportes `active`.

Filtros soportados:

```http
GET /api/reports/map?status=active&minSeverity=2&limit=50
GET /api/reports/map?type=blocked_ramp
GET /api/reports/map?search=rampa
GET /api/reports/map?north=32.54&south=32.50&east=-117.02&west=-117.08
```

Cada elemento incluye:

```text
position.lat / position.lng
markerColor
markerIcon
severityColor
statusLabel
requiresAttention
createdAtDisplay
```

### Nuevos campos visuales en reportes

`GET /api/reports`, `GET /api/reports/{id}`, `POST /api/reports`, confirmaciones y cambios de estado ahora incluyen campos extra para frontend:

```text
position
statusLabel
severityColor
markerColor
markerIcon
requiresAttention
createdAtDisplay
```

Esto no rompe los campos anteriores; solo agrega datos adicionales.

### Score de ruta extendido

`POST /api/routes/score` ahora devuelve:

```text
levelLabel
message
nearbyReportIds
routeStyle.strokeColor
routeStyle.strokeOpacity
routeStyle.strokeWeight
routeStyle.badgeLabel
routeStyle.description
```

El frontend puede usar `routeStyle` directamente para pintar la polyline de Geoapify en verde, amarillo o rojo.

### Documentación para frontend

Ver también:

```text
docs/FRONTEND_BACKEND_CONTRACT.md
```

## Crear reporte con asistencia de Gemini

Esta iteración agrega un flujo directo para foto → Gemini → reporte → Firestore:

```http
POST /api/reports/analyze-and-create
Content-Type: multipart/form-data
```

Campos aceptados:

```text
image o foto: obligatorio para este endpoint
latitude, latitud o lat: número entre -90 y 90
longitude, longitud o lng: número entre -180 y 180
type o tipo: opcional; si no viene, Gemini lo sugiere
description o descripcion: opcional; si no viene, Gemini sugiere una descripción
severity o severidad: opcional; si no viene, Gemini lo sugiere
```

Respuesta esperada:

```json
{
  "report": {
    "id": 8,
    "type": "blocked_ramp",
    "typeLabel": "Rampa bloqueada",
    "description": "Rampa bloqueada por un vehículo.",
    "position": { "lat": 32.5201, "lng": -117.0412 },
    "severity": 3,
    "severityLabel": "Alta",
    "imageUrl": "/uploads/reports/archivo.jpg"
  },
  "geminiRequested": true,
  "geminiSucceeded": true,
  "geminiError": null,
  "vision": {
    "type": "blocked_ramp",
    "typeLabel": "Rampa bloqueada",
    "severity": 3,
    "severityLabel": "Alta",
    "confidence": 0.86,
    "summary": "Se observa una rampa bloqueada.",
    "suggestedDescription": "Rampa bloqueada por un vehículo.",
    "accessibilityImpact": "Puede impedir el paso de personas en silla de ruedas.",
    "model": "gemini-2.5-flash"
  },
  "message": "Reporte creado con sugerencias de Gemini."
}
```

También se puede usar el endpoint normal con `useGemini=true`:

```http
POST /api/reports
Content-Type: multipart/form-data
```

En ese caso, la respuesta se mantiene como `ReportResponse` para no romper al frontend actual, pero el backend puede usar Gemini para completar tipo, severidad o descripción cuando falten.

## Almacenamiento de imágenes

Las fotos de reportes se guardan localmente en el backend, dentro de:

```text
backend/wwwroot/uploads/reports/
```

El campo `imageUrl` queda como una ruta relativa, por ejemplo:

```text
/uploads/reports/archivo.jpg
```

El backend sirve esas imágenes con `UseStaticFiles()`. Para uso local esto es suficiente y evita depender de Firebase Storage/Blaze.
