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

La solución de la raíz es la recomendada porque deja visible el backend, la documentación y archivos importantes del frontend.

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
```

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

La API key de Google Maps se usa en el frontend porque carga el mapa. La key de Gemini o credenciales de Google Cloud no deben ir en React; deben manejarse desde backend o variables seguras. En esta primera iteración Gemini queda contemplado como siguiente paso, sin exponer llaves.

## Archivos importantes

```text
HackFox2026.sln                         Solución principal para Visual Studio
backend/HackFox2026.csproj              Proyecto backend ASP.NET Core
backend/Program.cs                      Configuración de servicios, CORS y static files
backend/HackFox2026.http                Pruebas de API desde Visual Studio
backend/Controllers/                    Endpoints del backend
backend/Services/                       Lógica de reportes, archivos y score de accesibilidad
backend/wwwroot/uploads/reports/        Carpeta local para fotos de reportes
frontend/package.json                   Dependencias del frontend React/Vite
```
