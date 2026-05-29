# Integracion frontend-backend

Esta iteracion conecta el frontend React/Vite con el backend ASP.NET Core.

## Variables locales del frontend

Crear `frontend/.env.local`:

```env
VITE_API_URL=https://localhost:7271
VITE_GEOAPIFY_API_KEY=TU_API_KEY_DE_GEOAPIFY
VITE_GEOAPIFY_TILE_STYLE=osm-bright
VITE_GEOAPIFY_ROUTE_MODE=walk
```

Si el backend corre con `dotnet run` en HTTP, usar:

```env
VITE_API_URL=http://localhost:5208
```

## Flujo conectado

- `MapView.jsx` consume `GET /api/reports/map` para pintar marcadores reales desde Firestore.
- `MapView.jsx` consume `POST /api/routes/score` para calcular un score demo con reportes cercanos.
- `CrearReporte.jsx` consume `POST /api/reports/analyze-and-create` cuando el usuario sube foto.
- `CrearReporte.jsx` consume `POST /api/reports` cuando el usuario no sube foto.
- `Reportes.jsx` consume `GET /api/reports` y `GET /api/stats`.
- `Reportes.jsx` usa `POST /api/reports/{id}/confirm`, `POST /api/reports/{id}/reject` y `PUT /api/reports/{id}/status`.

## Prueba rapida

Backend:

```bash
cd backend
dotnet run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Nota

El frontend no se conecta directo a Firebase ni Gemini. Todo pasa por el backend para no exponer llaves ni credenciales.
