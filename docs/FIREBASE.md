# Firebase / Firestore para HackFox2026

Esta iteración prepara el backend para usar Firebase Cloud Firestore como base de datos de reportes.

## Objetivo

Mantener los mismos endpoints del backend y cambiar solamente la capa de almacenamiento:

```text
Frontend React/Vite -> ASP.NET Core API -> Firebase Cloud Firestore
```

El frontend no necesita conocer credenciales de Firebase. Todo se maneja desde backend.

## Por qué Firestore

Para el track Tijuana Sin Barreras, Firestore permite guardar reportes ciudadanos con ubicación, tipo de barrera, severidad, estado y confirmaciones. Esto ayuda a construir el mapa vivo de barreras físicas sin depender de una base local.

## Configuración local

Desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Persistence:Provider" "Firestore"
dotnet user-secrets set "Firebase:ProjectId" "ID_DEL_PROYECTO_FIREBASE"
dotnet user-secrets set "Firebase:ReportsCollection" "reports"
```

Autenticación recomendada con Google Cloud CLI:

```bash
gcloud auth application-default login
```

Alternativa usando un archivo JSON local de service account:

```bash
dotnet user-secrets set "Firebase:CredentialsPath" "C:\\ruta\\segura\\firebase-service-account.json"
```

No subas ese JSON al repositorio.

## Validación

Corre el backend y abre:

```text
GET https://localhost:7271/api/firebase/status
GET https://localhost:7271/api/health
```

Si Firestore está activo, `/api/health` debe mostrar:

```json
{
  "storage": "firebase-firestore"
}
```

## Estructura en Firestore

Colección principal:

```text
reports
```

Cada documento usa el ID numérico del reporte para mantener compatibilidad con rutas como:

```text
GET /api/reports/1
PUT /api/reports/1/status
POST /api/reports/1/confirm
```

Documento auxiliar para controlar IDs:

```text
_metadata/counters
```

Campo usado:

```text
reportsLastId
```

## Variables para Cloud Run

Para despliegue en Google Cloud Run:

```text
Persistence__Provider=Firestore
Firebase__ProjectId=ID_DEL_PROYECTO_FIREBASE
Firebase__ReportsCollection=reports
Gemini__ApiKey=TU_API_KEY_DE_GEMINI
```

En Cloud Run lo recomendado es usar la service account del servicio con permisos sobre Firestore, no subir archivos JSON al contenedor.

## Fallback seguro

Si no se configura Firestore, el backend usa `InMemoryReportRepository`. Esto permite que cualquier integrante pueda correr la API sin credenciales y sin romper el frontend.


## Datos demo en Firestore

Cuando Firestore esté activo y la colección `reports` esté vacía, puedes sembrar reportes demo desde Visual Studio o Postman:

```http
POST /api/demo/seed-reports
```

En local funciona automáticamente porque Visual Studio y `dotnet run` suelen usar ambiente `Development`. En despliegue se mantiene desactivado salvo que agregues esta variable:

```text
Demo__EnableSeedEndpoint=true
```

Este endpoint no borra reportes reales. Solo agrega reportes demo que todavía no existan cerca de las coordenadas configuradas.

## Compatibilidad con frontend

El backend acepta campos en inglés y español para que el frontend pueda enviar `tipo`, `descripcion`, `latitud`, `longitud`, `severidad` y `foto` sin romper el contrato. Internamente todo queda normalizado antes de guardarse en Firestore.

## Imágenes de reportes

Las fotos se guardan localmente en el backend dentro de `backend/wwwroot/uploads/reports/`. Firestore guarda la ruta relativa en el campo `imageUrl`.

No se usa Firebase Storage en esta versión para evitar depender del plan Blaze durante la demo.
