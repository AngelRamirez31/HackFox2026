# HackFox2026

Plataforma web para planear rutas accesibles en Tijuana y reportar barreras físicas mediante fotografías y ubicación.

## Descripción

HackFox2026 busca ayudar a personas con discapacidad motriz, adultos mayores y familias a encontrar trayectos más seguros y accesibles. La aplicación permite visualizar rutas, reportar obstáculos urbanos y consultar un mapa vivo con información generada por los usuarios.

## Estructura del repositorio

```text
HackFox2026/
├── backend/              ASP.NET Core Web API
│   ├── Controllers/
│   ├── DTOs/
│   ├── Models/
│   ├── Services/
│   ├── Program.cs
│   ├── HackFox2026.csproj
│   └── HackFox2026.http
├── frontend/             React + Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── docs/
├── HackFox2026.sln       Solución principal para Visual Studio 2022
└── .vsconfig
```

## Objetivo

Crear una plataforma sencilla que permita:

- Planear trayectos accesibles.
- Reportar barreras físicas con fotografía y ubicación.
- Consultar reportes de otros usuarios.
- Mostrar un porcentaje de accesibilidad por ruta.
- Cambiar el color de las rutas según su nivel de accesibilidad.

## Tecnologías utilizadas

- Backend: ASP.NET Core Web API, C#, .NET 9
- Frontend: React, Vite, JavaScript, CSS
- Mapa: Google Maps Platform
- Despliegue opcional: Docker y Google Cloud Run
- IA opcional: Gemini Vision desde backend para sugerir tipo y severidad de barreras
- Base de datos opcional: Firebase Cloud Firestore desde backend
- Siguientes recursos posibles: Cloud Storage y Cloud Run

## Cómo abrirlo en Visual Studio 2022

Abrir desde la raíz del repo:

```text
HackFox2026.sln
```

Seleccionar el perfil `https` y correr con `F5` o `Ctrl + F5`.

El backend abrirá:

```text
https://localhost:7271/api/health
```

También existe una solución interna solo del backend:

```text
backend/HackFox2026.sln
```

La guía completa está en:

```text
docs/VISUAL_STUDIO.md
docs/FIREBASE.md
```

## Cómo ejecutar el backend

```bash
git clone https://github.com/AngelRamirez31/HackFox2026.git
cd HackFox2026/backend
dotnet restore
dotnet run
```

El backend normalmente queda en:

```text
https://localhost:7271
http://localhost:5208
```

Endpoint rápido de prueba:

```text
GET https://localhost:7271/api/health
```

## Cómo ejecutar el frontend

```bash
cd HackFox2026/frontend
npm install
npm run dev
```

El frontend normalmente queda en:

```text
http://localhost:5173
```

## Variables de entorno del frontend

Crear el archivo `frontend/.env.local`:

```env
VITE_API_URL=https://localhost:7271
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_DE_GOOGLE_MAPS
```

La clave de Gemini o credenciales de Google Cloud no deben ir en React.

## Backend inicial implementado

- `GET /api/health`
- `GET /api/reports/options`
- `GET /api/reports`
- `GET /api/reports/{id}`
- `GET /api/reports/nearby`
- `POST /api/reports`
- `PUT /api/reports/{id}/status`
- `POST /api/reports/{id}/confirm`
- `POST /api/reports/{id}/reject`
- `POST /api/routes/score`
- `GET /api/stats`
- `GET /api/vision/status`
- `POST /api/vision/analyze-report-image`
- `GET /api/firebase/status`
- `POST /api/demo/seed-reports`

La primera iteración usaba almacenamiento en memoria. Esta versión ya incluye soporte opcional para Firebase Cloud Firestore desde backend, manteniendo memoria local como fallback seguro para desarrollo sin credenciales.


## Firebase / Firestore en backend

El backend puede guardar reportes en Firebase Cloud Firestore sin cambiar los endpoints que consume el frontend. Por seguridad, el proyecto arranca con memoria local hasta que se configure Firebase en User Secrets o variables de entorno.

Desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Persistence:Provider" "Firestore"
dotnet user-secrets set "Firebase:ProjectId" "ID_DEL_PROYECTO_FIREBASE"
dotnet user-secrets set "Firebase:ReportsCollection" "reports"
```

Para autenticación local con Google Cloud CLI:

```bash
gcloud auth application-default login
```

También se puede usar una credencial local sin subirla al repo:

```bash
dotnet user-secrets set "Firebase:CredentialsPath" "C:\\ruta\\segura\\firebase-service-account.json"
```

Verificación rápida:

```text
GET https://localhost:7271/api/firebase/status
GET https://localhost:7271/api/health
```

## Gemini API en backend

La clave de Gemini no va en React ni en GitHub. Para desarrollo local, desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Gemini:ApiKey" "TU_API_KEY_DE_GEMINI"
```

Después de correr el backend, verifica:

```text
GET https://localhost:7271/api/vision/status
```

Si responde `configured: true`, el endpoint de análisis de imágenes ya puede usarse desde el backend.

## Visual Studio

Abre `HackFox2026.sln` desde la raiz del repositorio. La solucion carga solamente el proyecto `backend/HackFox2026.csproj` para evitar que Visual Studio marque `frontend` o `docs` como proyectos no soportados.

El frontend sigue estando separado en `frontend/` y se corre por terminal con `npm install` y `npm run dev`.


## Iteración actual del backend

Esta versión agrega compatibilidad directa con el frontend actual: el backend acepta campos de formulario tanto en español como en inglés (`tipo/type`, `descripcion/description`, `latitud/latitude`, `longitud/longitude`, `severidad/severity`, `foto/image`). También normaliza tipos visibles como `Banqueta rota` o `Rampa bloqueada` al formato interno usado por la API.

Para demos con Firebase o memoria local, se agregó:

```text
POST /api/demo/seed-reports
```

Este endpoint agrega reportes demo de Tijuana sin borrar datos existentes y solo está habilitado en ambiente de desarrollo o cuando `Demo__EnableSeedEndpoint=true`.

## Iteración frontend-ready

La API ahora incluye respuestas más cómodas para el frontend:

- `GET /api/reports/map`: reportes listos para marcadores de Google Maps.
- `GET /api/reports`: filtros extra por búsqueda, severidad y límite.
- `POST /api/routes/score`: respuesta extendida con `routeStyle` para pintar la ruta.
- `GET /api/reports/options`: leyenda visual para tipos, severidades y estados.

Guía rápida para conectar frontend y backend:

```text
docs/FRONTEND_BACKEND_CONTRACT.md
```

## Iteración Gemini-assisted reports

Esta versión agrega el flujo backend para crear reportes asistidos por Gemini:

```text
POST /api/reports/analyze-and-create
```

El endpoint recibe una imagen, latitud y longitud. El backend analiza la foto con Gemini, sugiere tipo/severidad/descripción, guarda la imagen localmente en `wwwroot/uploads/reports/` y crea el reporte en Firestore o memoria según la configuración activa.

También se puede usar el endpoint normal con el campo `useGemini=true`:

```text
POST /api/reports
```

La clave de Gemini sigue viviendo solamente en backend mediante User Secrets o variables de entorno.

## Integracion frontend-backend actual

El frontend ya consume la API del backend para mostrar reportes reales, crear reportes con foto, usar Gemini desde el backend y consultar estadisticas.

Archivo local requerido en `frontend/.env.local`:

```env
VITE_API_URL=https://localhost:7271
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_DE_GOOGLE_MAPS
```

Endpoints conectados en frontend:

```text
GET    /api/reports/map
GET    /api/reports
GET    /api/stats
POST   /api/reports
POST   /api/reports/analyze-and-create
POST   /api/routes/score
POST   /api/reports/{id}/confirm
POST   /api/reports/{id}/reject
PUT    /api/reports/{id}/status
```

El frontend no usa Firebase ni Gemini directamente; esas integraciones se mantienen en backend para proteger credenciales.

## Firebase Storage para fotos

El backend ya puede guardar imágenes de reportes en Firebase Storage / Google Cloud Storage. Para activarlo en desarrollo local, desde `backend/` configura:

```bat
dotnet user-secrets set "Storage:Provider" "FirebaseStorage"
dotnet user-secrets set "Firebase:StorageBucket" "TU_BUCKET_DE_FIREBASE_STORAGE"
dotnet user-secrets set "Firebase:StorageFolder" "reports"
```

Luego verifica:

```text
https://localhost:7271/api/storage/status
```

Si no se configura Storage, el backend usa almacenamiento local como fallback en `backend/wwwroot/uploads/reports/`.
