# Iteración: ruta básica A → B

Esta iteración agrega una interfaz segura para probar rutas peatonales dentro del mapa antes de integrar el porcentaje de accesibilidad.

## Funcionalidad agregada

- Selección de punto A y punto B con clic en el mapa.
- Marcadores A y B arrastrables.
- Cálculo de ruta peatonal usando Google Maps Directions desde el frontend.
- Dibujo de la ruta sobre el mapa.
- Resumen de distancia y tiempo estimado.
- Botón para limpiar la ruta.
- El score de accesibilidad se mantiene separado y listo para la siguiente iteración.

## Flujo esperado

1. Abrir `http://localhost:5173/mapa`.
2. Seleccionar `Elegir punto A`.
3. Dar clic en el mapa.
4. Seleccionar o dejar activo `Elegir punto B`.
5. Dar clic en otro punto del mapa.
6. Presionar `Trazar ruta`.
7. Ver la ruta dibujada, distancia y tiempo aproximado.

## Requisitos

El frontend necesita una key válida de Google Maps en:

```env
VITE_GOOGLE_MAPS_API_KEY=...
```

La API key debe tener habilitada al menos `Maps JavaScript API`. Para rutas peatonales también debe tener habilitada `Directions API`.
