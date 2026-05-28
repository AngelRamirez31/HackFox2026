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
POST /api/routes/score
Content-Type: application/json
```

```json
{
  "points": [
    { "lat": 32.514947, "lng": -117.038247 },
    { "lat": 32.515980, "lng": -117.034608 }
  ],
  "radiusMeters": 80
}
```

El frontend puede mandar los puntos de una ruta generada con Google Maps Routes, Directions o un polyline decodificado. El backend cruza esos puntos con reportes activos cercanos y devuelve un score de accesibilidad.

Respuesta esperada:

```json
{
  "score": 72,
  "level": "medium",
  "color": "yellow",
  "radiusMeters": 80,
  "nearbyReports": 2,
  "warnings": ["1 banqueta dañada", "1 rampa bloqueada"],
  "reports": []
}
```

## Estadísticas

```http
GET /api/stats
```

Devuelve totales por estatus, tipo y reportes graves activos.

## Datos demo

```http
POST /api/demo/seed-reports
```

Agrega reportes demo de Tijuana si todavía no existen. Está pensado para pruebas locales y demos rápidas con Firestore o memoria. Por seguridad, solo funciona cuando el backend corre en ambiente `Development` o cuando se activa explícitamente:

```text
Demo__EnableSeedEndpoint=true
```

El endpoint no borra datos existentes; solo agrega reportes que no encuentre cerca de los datos demo ya sembrados.

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

Autenticación local recomendada con Google Cloud CLI:

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

Devuelve una lista ligera de reportes lista para Google Maps. Por defecto regresa reportes `active`.

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

El frontend puede usar `routeStyle` directamente para pintar la polyline de Google Maps en verde, amarillo o rojo.

### Documentación para frontend

Ver también:

```text
docs/FRONTEND_BACKEND_CONTRACT.md
```
