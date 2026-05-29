# Streets-H

Plataforma web para planear rutas accesibles en Tijuana, reportar barreras físicas y construir un mapa vivo de accesibilidad urbana con ayuda de la comunidad.

## Descripción

**Streets-H** es una plataforma colaborativa enfocada en accesibilidad urbana. Su objetivo es ayudar a personas con discapacidad motriz, adultos mayores, familias y ciudadanos en general a planear trayectos más seguros, evitando obstáculos como banquetas rotas, rampas bloqueadas, cruces inseguros, obras, escalones sin rampa y otras barreras físicas.

La aplicación permite visualizar reportes ciudadanos en un mapa, crear reportes con fotografía y ubicación, calcular rutas con nivel de accesibilidad, validar si una barrera sigue presente y consultar métricas de impacto urbano para priorizar la atención de zonas críticas.

Aunque el repositorio conserva el nombre técnico `HackFox2026`, el nombre del producto es:

```text
Streets-H
```

## Objetivo del proyecto

Crear una plataforma sencilla y útil que permita:

- Planear trayectos accesibles en la ciudad.
- Reportar barreras físicas usando fotografía y ubicación.
- Crear reportes rápidos asistidos por inteligencia artificial.
- Crear reportes manuales con tipo, severidad y descripción.
- Consultar reportes ciudadanos en un mapa vivo.
- Calcular un porcentaje de accesibilidad por ruta.
- Pintar rutas según su accesibilidad:
  - Verde: ruta accesible.
  - Naranja: accesibilidad intermedia.
  - Rojo: ruta poco accesible.
- Validar reportes con acciones comunitarias:
  - Sigue Ahí
  - Ya no Está
- Mostrar métricas de impacto urbano y zonas críticas.
- Comparar escenarios de rutas accesibles hacia destinos esenciales.

## Tecnologías utilizadas

### Frontend

- React
- Vite
- JavaScript
- CSS
- React Router
- React Icons
- Leaflet
- Geoapify Maps
- Geoapify Routing API

### Backend

- ASP.NET Core Web API
- C#
- .NET 9
- Controllers
- Services
- DTOs
- Repositories
- Almacenamiento local de imágenes

### Base de datos

- Firebase Cloud Firestore
- Repositorio en memoria como fallback para desarrollo local

### Inteligencia artificial

- Gemini Vision desde backend
- Análisis de imagen para sugerir:
  - Tipo de barrera
  - Severidad
  - Descripción
  - Impacto de accesibilidad

### Despliegue posible

- Docker
- Google Cloud Run
- Firebase / Google Cloud

## Estructura del repositorio

```text
HackFox2026/
├── backend/                  ASP.NET Core Web API
│   ├── Controllers/
│   ├── DTOs/
│   ├── Models/
│   ├── Services/
│   ├── wwwroot/
│   │   └── uploads/
│   │       └── reports/
│   ├── Program.cs
│   ├── HackFox2026.csproj
│   └── HackFox2026.http
├── frontend/                 React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
├── HackFox2026.sln
└── .vsconfig
```

## Funcionalidades principales

### 1. Inicio

La página principal presenta el concepto de Streets-H y sus funciones principales:

- Planeación de trayectos.
- Reporte de barreras físicas.
- Consulta de reportes globales.
- Diseño accesible.
- Resumen de actividad reciente.
- Acceso a mapa, reportes, impacto urbano y escenario accesible.

### 2. Mapa

La sección de mapa permite:

- Visualizar reportes ciudadanos.
- Consultar barreras físicas cercanas.
- Trazar rutas entre dos puntos.
- Calcular accesibilidad de una ruta.
- Mostrar el porcentaje de accesibilidad.
- Cambiar el color de la ruta según el resultado:
  - Verde para rutas accesibles.
  - Naranja para rutas intermedias.
  - Rojo para rutas poco accesibles.
- Detectar reportes cercanos a la ruta.
- Mostrar qué reportes afectan el trayecto.

### 3. Crear reporte

La sección de creación de reportes permite dos modos.

#### Reporte rápido

El reporte rápido solicita únicamente:

- Fotografía.
- Ubicación actual.

Después, el backend puede usar Gemini Vision para sugerir automáticamente:

- Tipo de barrera.
- Severidad.
- Descripción.
- Impacto de accesibilidad.

Endpoint utilizado:

```text
POST /api/reports/quick
```

#### Reporte manual

El reporte manual permite completar:

- Tipo de barrera.
- Nivel de severidad.
- Descripción.
- Fotografía opcional.
- Ubicación.

Si se agrega imagen, también puede usarse Gemini para complementar el análisis.

Endpoints relacionados:

```text
POST /api/reports
POST /api/reports/analyze-and-create
```

### 4. Reportes globales

La página de reportes permite consultar todos los reportes ciudadanos registrados.

Incluye:

- Badges de prioridad.
- Badges de confianza.
- Badge de “Requiere Verificación”.
- Resumen para autoridad.
- Botón para copiar resumen.
- Validación comunitaria:
  - Sigue Ahí
  - Ya no Está
- Botón para ver reporte en mapa.
- Filtros por:
  - Prioridad
  - Confianza
  - Verificación
  - Severidad
- Ordenamiento por:
  - Más recientes
  - Mayor prioridad
  - Mayor severidad
  - Menor confianza
  - Requiere verificación

### 5. Impacto urbano

La sección de impacto muestra información útil para priorizar acciones urbanas.

Incluye:

- Índice de urgencia urbana.
- Resumen ejecutivo.
- Botón para copiar resumen ejecutivo.
- Reportes totales.
- Reportes que requieren verificación.
- Reportes críticos.
- Zonas críticas.
- Baja confianza.
- Patrones urbanos por tipo de problema.
- Zonas críticas principales.
- Reportes críticos.
- Reportes por verificar.
- Acciones sugeridas.

Esta sección está pensada para mostrar valor a autoridades, jueces o equipos de planeación urbana.

### 6. Escenario accesible

La sección de escenario permite comparar una ruta directa contra una alternativa Streets-H.

Muestra:

- Destino de interés.
- Persona objetivo.
- Misión.
- Mejora mostrada.
- Comparación entre ruta normal y ruta accesible.
- Porcentaje de accesibilidad.
- Distancia.
- Tiempo estimado.
- Barreras cercanas.
- Riesgo principal.
- Recomendación de ruta.

## Backend

El backend está desarrollado con ASP.NET Core Web API.

### Endpoints principales

```text
GET    /api/health
GET    /api/reports/options
GET    /api/reports
GET    /api/reports/{id}
GET    /api/reports/map
GET    /api/reports/nearby
GET    /api/reports/hotspots
POST   /api/reports
POST   /api/reports/quick
POST   /api/reports/analyze-and-create
POST   /api/reports/{id}/confirm
POST   /api/reports/{id}/reject
PUT    /api/reports/{id}/status
POST   /api/routes/score
GET    /api/stats
GET    /api/vision/status
POST   /api/vision/analyze-report-image
GET    /api/firebase/status
GET    /api/essential-destinations
GET    /api/scenarios/accessibility
```

## Cómo ejecutar el backend

Desde la raíz del repositorio:

```bash
cd backend
dotnet restore
dotnet run
```

El backend normalmente queda disponible en:

```text
https://localhost:7271
http://localhost:5208
```

Endpoint rápido de prueba:

```text
GET https://localhost:7271/api/health
```

## Cómo ejecutar el frontend

Desde la raíz del repositorio:

```bash
cd frontend
npm install
npm run dev
```

El frontend normalmente queda disponible en:

```text
http://localhost:5173
```

## Variables de entorno del frontend

Crear el archivo:

```text
frontend/.env.local
```

Contenido recomendado:

```env
VITE_API_URL=https://localhost:7271
VITE_GEOAPIFY_API_KEY=TU_API_KEY_DE_GEOAPIFY
VITE_GEOAPIFY_TILE_STYLE=osm-bright
VITE_GEOAPIFY_ROUTE_MODE=walk
```

Importante:

Las claves de Gemini, Firebase o Google Cloud no deben ir en React ni en archivos públicos del frontend.

## Configuración de Firebase / Firestore

El backend puede guardar reportes en Firebase Cloud Firestore. Si no se configura Firestore, puede usar almacenamiento en memoria para desarrollo local.

Desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Persistence:Provider" "Firestore"
dotnet user-secrets set "Firebase:ProjectId" "ID_DEL_PROYECTO_FIREBASE"
dotnet user-secrets set "Firebase:ReportsCollection" "reports"
```

Para usar un archivo de credenciales local:

```bash
dotnet user-secrets set "Firebase:CredentialsPath" "C:\\ruta\\segura\\firebase-service-account.json"
```

También puede configurarse en `appsettings.Development.json`:

```json
{
  "Persistence": {
    "Provider": "Firestore"
  },
  "Firebase": {
    "ProjectId": "TU_PROJECT_ID",
    "CredentialsPath": "C:\\ruta\\segura\\firebase-service-account.json",
    "ReportsCollection": "reports"
  }
}
```

Verificación rápida:

```text
GET https://localhost:7271/api/firebase/status
GET https://localhost:7271/api/health
```

## Configuración de Gemini

La clave de Gemini debe configurarse únicamente en backend.

Desde la carpeta `backend/`:

```bash
dotnet user-secrets set "Gemini:ApiKey" "TU_API_KEY_DE_GEMINI"
```

Verificación:

```text
GET https://localhost:7271/api/vision/status
```

Si responde `configured: true`, el análisis de imágenes ya está disponible.

## Imágenes de reportes

Por ahora, las imágenes se guardan localmente en el backend:

```text
backend/wwwroot/uploads/reports/
```

Firestore guarda solamente la referencia:

```text
/uploads/reports/archivo.jpg
```

No se deben subir imágenes generadas ni archivos de credenciales al repositorio.

## Archivos que no deben subirse a GitHub

No subir:

```text
backend/secrets/
firebase-service-account.json
*.json con credenciales privadas
.env
.env.local
appsettings.Development.json si contiene rutas o claves privadas
backend/wwwroot/uploads/
```

Agregar o verificar en `.gitignore`:

```gitignore
backend/secrets/
backend/wwwroot/uploads/
*.env
.env
.env.local
*firebase-service-account*.json
*firebase-adminsdk*.json
```

## Visual Studio 2022

Abrir desde la raíz del repositorio:

```text
HackFox2026.sln
```

Seleccionar el perfil `https` y correr con:

```text
F5
```

o:

```text
Ctrl + F5
```

También existe una solución interna del backend:

```text
backend/HackFox2026.sln
```

El frontend sigue separado en:

```text
frontend/
```

y se ejecuta por terminal con:

```bash
npm install
npm run dev
```

## Flujo general de la aplicación

```text
Usuario
  ↓
Frontend React
  ↓
Backend ASP.NET Core
  ↓
Firestore / Memoria local
  ↓
Mapa, reportes, rutas e impacto urbano
```

Gemini y Firebase se consumen desde backend para proteger credenciales.

## Estado actual del proyecto

Streets-H actualmente cuenta con:

- Frontend en React.
- Backend en ASP.NET Core.
- Mapa interactivo con Geoapify.
- Reportes ciudadanos.
- Reporte rápido con foto y ubicación.
- Reporte manual.
- Integración opcional con Gemini Vision.
- Integración opcional con Firebase Firestore.
- Validación comunitaria.
- Rutas con porcentaje de accesibilidad.
- Colores de ruta según accesibilidad.
- Página de reportes globales.
- Página de impacto urbano.
- Página de escenario accesible.
- Almacenamiento local de imágenes.

## Equipo

Proyecto desarrollado para HackFox 2026. Angel, Diego, Esteban y Elisa


