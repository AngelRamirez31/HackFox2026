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

Campos:

```text
type: sidewalk_damage | blocked_ramp | missing_ramp | stairs | unsafe_crossing | construction | obstacle | transport_issue | other
description: texto corto opcional
latitude: número entre -90 y 90
longitude: número entre -180 y 180
severity: 1 | 2 | 3
image: archivo opcional .jpg, .jpeg, .png o .webp, máximo 5 MB
```

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
