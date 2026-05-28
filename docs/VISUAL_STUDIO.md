# Guía rápida para Visual Studio 2022

Esta versión está preparada para abrirse desde Visual Studio 2022 Community, el IDE morado.

## Cómo abrir el proyecto

1. Descomprime el ZIP.
2. Abre Visual Studio 2022.
3. Selecciona `Open a project or solution`.
4. Abre este archivo desde la raíz del repo:

```text
HackFox2026.sln
```

La solución de la raíz es la recomendada para backend porque carga solamente el proyecto ASP.NET Core y evita que Visual Studio marque `frontend/` o `docs/` como proyectos no soportados.

También puedes abrir la solución interna si solo vas a trabajar backend:

```text
backend/HackFox2026.sln
```

## Estructura clara del repo

```text
HackFox2026/
├── backend/              Proyecto ASP.NET Core Web API
├── frontend/             Proyecto React/Vite
├── docs/                 Documentación técnica
└── HackFox2026.sln       Solución principal para Visual Studio
```

## Workload necesario

En Visual Studio Installer debe estar instalado:

```text
ASP.NET and web development
```

El proyecto usa:

```text
.NET 9
ASP.NET Core Web API
Controllers
OpenAPI
Static files para imágenes subidas
CORS para el frontend en Vite
```

## Perfil de ejecución recomendado

En la barra superior de Visual Studio selecciona el perfil:

```text
https
```

Luego ejecuta con:

```text
F5
```

O sin depuración:

```text
Ctrl + F5
```

Al iniciar, Visual Studio debe abrir:

```text
https://localhost:7271/api/health
```

Si el navegador muestra `status: ok`, el backend está corriendo correctamente.

## Probar endpoints desde Visual Studio

El archivo siguiente ya trae peticiones listas para probar:

```text
backend/HackFox2026.http
```

Desde Visual Studio puedes abrirlo y presionar `Send Request` sobre cada petición.

Endpoints incluidos:

```text
GET    /api/health
GET    /api/reports
GET    /api/reports/nearby
POST   /api/reports
PUT    /api/reports/{id}/status
POST   /api/reports/{id}/confirm
POST   /api/reports/{id}/reject
POST   /api/routes/score
GET    /api/stats
GET    /api/vision/status
POST   /api/vision/analyze-report-image
GET    /api/firebase/status
```


## Configurar Firebase Firestore en Visual Studio / backend

Esta versión ya trae repositorio para Firebase Cloud Firestore. Para evitar errores cuando alguien del equipo no tenga credenciales, el proyecto arranca con almacenamiento en memoria local. Para activar Firebase, abre una terminal en `backend/` y configura User Secrets:

```bat
dotnet user-secrets set "Persistence:Provider" "Firestore"
dotnet user-secrets set "Firebase:ProjectId" "ID_DEL_PROYECTO_FIREBASE"
dotnet user-secrets set "Firebase:ReportsCollection" "reports"
```

Para autenticarte localmente con Google Cloud CLI:

```bat
gcloud auth application-default login
```

Alternativa con una credencial local que no se sube al repositorio:

```bat
dotnet user-secrets set "Firebase:CredentialsPath" "C:\\ruta\\segura\\firebase-service-account.json"
```

Verifica la configuración con:

```text
https://localhost:7271/api/firebase/status
```

Si `firestoreEnabled` aparece en `true` y `projectConfigured` aparece en `true`, el backend ya intentará guardar los reportes en Firestore.

## Configurar Gemini en Visual Studio / backend

Desde una terminal ubicada en `backend/`, guarda la clave de Gemini con User Secrets:

```bat
dotnet user-secrets set "Gemini:ApiKey" "TU_API_KEY_DE_GEMINI"
```

Luego corre el backend y abre:

```text
https://localhost:7271/api/vision/status
```

Si aparece `configured: true`, el backend ya puede llamar a Gemini Vision.

## Correr el frontend aparte

Visual Studio corre el backend. El frontend React/Vite se corre en otra terminal:

```bat
cd HackFox2026\frontend
npm install
npm run dev
```

El frontend debe abrirse en:

```text
http://localhost:5173
```

El backend ya permite CORS desde ese origen.

## Archivo local del frontend

Crear este archivo local:

```text
frontend/.env.local
```

Contenido:

```env
VITE_API_URL=https://localhost:7271
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_DE_GOOGLE_MAPS
```

No subir `.env.local` a GitHub.

## Notas de seguridad para el concurso

La API key de Google Maps se usa en el frontend porque carga el mapa. La key de Gemini o credenciales de Google Cloud no deben ir en React; deben manejarse desde backend o variables seguras. En esta iteración Gemini ya queda integrado desde backend para analizar fotos de barreras. La clave se lee desde User Secrets o desde una variable segura, nunca desde React.

## Archivos importantes

```text
HackFox2026.sln                         Solución principal para Visual Studio
backend/HackFox2026.csproj              Proyecto backend ASP.NET Core
backend/Program.cs                      Configuración de servicios, CORS y static files
backend/HackFox2026.http                Pruebas de API desde Visual Studio
backend/Controllers/                    Endpoints del backend
backend/Services/                       Lógica de reportes, archivos, Firestore y score de accesibilidad
backend/wwwroot/uploads/reports/        Carpeta local para fotos de reportes
frontend/package.json                   Dependencias del frontend React/Vite
```


## Nota sobre frontend y docs en la solucion

La solucion principal `HackFox2026.sln` carga unicamente el backend ASP.NET Core. No incluye `frontend/` ni `docs/` como proyectos de Visual Studio porque Visual Studio puede mostrarlos como no soportados si no estan instaladas las cargas de trabajo de Node/JavaScript o si se agregan como carpetas de solucion.

Para trabajar el frontend, abre `frontend/` en VS Code o desde una terminal:

```bat
cd frontend
npm install
npm run dev
```
