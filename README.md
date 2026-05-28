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
- Siguientes recursos posibles: Firebase, Cloud Storage y Gemini Vision desde backend

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
- `GET /api/reports`
- `GET /api/reports/{id}`
- `GET /api/reports/nearby`
- `POST /api/reports`
- `PUT /api/reports/{id}/status`
- `POST /api/reports/{id}/confirm`
- `POST /api/reports/{id}/reject`
- `POST /api/routes/score`
- `GET /api/stats`

La primera iteración usa almacenamiento en memoria para avanzar rápido durante el hackathon. La siguiente mejora natural es cambiar `InMemoryReportRepository` por SQLite, Firestore o Cloud SQL.
