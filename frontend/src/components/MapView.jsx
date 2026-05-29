import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./MapView.css";

const containerStyle = {
  width: "100%",
  height: "calc(100vh - 74px)",
  minHeight: "620px",
};

const center = {
  lat: 32.5149,
  lng: -117.0382,
};

const defaultRoutePoints = [
  { lat: 32.514947, lng: -117.038247 },
  { lat: 32.51598, lng: -117.034608 },
  { lat: 32.519156, lng: -117.026355 },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMarkerPosition(report) {
  const position = report.position || {};
  const lat = Number(position.lat ?? report.latitude);
  const lng = Number(position.lng ?? report.longitude);

  return { lat, lng };
}

function getLevelClass(level) {
  if (level === "high") return "scoreHigh";
  if (level === "medium") return "scoreMedium";
  return "scoreLow";
}

function formatCoordinate(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(6);
}

function formatPoint(point) {
  if (!point) return "Sin seleccionar";
  return `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "Distancia no disponible";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "Tiempo no disponible";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function getRouteLineStyle(routeScore) {
  const style = routeScore?.routeStyle;

  return {
    color: style?.strokeColor || "#2563eb",
    opacity: style?.strokeOpacity ?? 0.9,
    weight: style?.strokeWeight ?? 6,
    lineCap: "round",
    lineJoin: "round",
  };
}

function getGeoapifyRoutePoints(featureCollection) {
  const geometry = featureCollection?.features?.[0]?.geometry;
  if (!geometry) return [];

  if (geometry.type === "LineString") {
    return geometry.coordinates
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates
      .flatMap((line) => line.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) })))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  }

  return [];
}

function getGeoapifyProperties(featureCollection) {
  return featureCollection?.features?.[0]?.properties || {};
}

function toLeafletLatLng(point) {
  return [point.lat, point.lng];
}

function getReportIcon(report) {
  const icon = escapeHtml(report.markerIcon || "⚠");
  const color = escapeHtml(report.markerColor || report.severityColor || "#ef4444");

  return L.divIcon({
    className: "accessibilityReportMarker",
    html: `<span style="background:${color}"><b>${icon}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -34],
  });
}

function getRoutePointIcon(label) {
  return L.divIcon({
    className: "routePointMarker",
    html: `<span><b>${escapeHtml(label)}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -34],
  });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

function MapController({ mapRef, focusPoint, routePath }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;

    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef]);

  useEffect(() => {
    if (!focusPoint) return;
    map.flyTo(toLeafletLatLng(focusPoint), Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [focusPoint, map]);

  useEffect(() => {
    if (!routePath || routePath.length < 2) return;
    map.fitBounds(routePath.map(toLeafletLatLng), { padding: [42, 42] });
  }, [map, routePath]);

  return null;
}

function MapView() {
  const [searchParams] = useSearchParams();
  const mapRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeScore, setRouteScore] = useState(null);
  const [routeMode, setRouteMode] = useState("origin");
  const [routePoints, setRoutePoints] = useState({ origin: null, destination: null });
  const [routePath, setRoutePath] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);

  const reportIdParam = searchParams.get("reportId");
  const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "";
  const geoapifyTileStyle = import.meta.env.VITE_GEOAPIFY_TILE_STYLE || "osm-bright";
  const geoapifyRouteMode = import.meta.env.VITE_GEOAPIFY_ROUTE_MODE || "walk";

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");

    try {
      const response = await api.get("/api/reports/map", {
        params: {
          status: "active",
          limit: 100,
        },
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setReports(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!reportIdParam || reports.length === 0) return;

    const target = reports.find((report) => String(report.id) === String(reportIdParam));
    if (!target) return;

    const position = getMarkerPosition(target);
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedReport(target);
    setFocusPoint(position);
  }, [reportIdParam, reports]);

  const activeReports = useMemo(() => reports.filter((report) => report.status === "active"), [reports]);
  const highPriorityReports = useMemo(() => reports.filter((report) => Number(report.severity) >= 3), [reports]);
  const routeReady = Boolean(routePoints.origin && routePoints.destination);
  const routePolylineOptions = useMemo(() => getRouteLineStyle(routeScore), [routeScore]);
  const tileUrl = `https://maps.geoapify.com/v1/tile/${geoapifyTileStyle}/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`;

  const setRoutePoint = useCallback((pointType, point) => {
    setRoutePoints((current) => ({
      ...current,
      [pointType]: point,
    }));
    setRoutePath([]);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
  }, []);

  const handleMapClick = useCallback(
    (point) => {
      setRoutePoint(routeMode, point);

      if (routeMode === "origin") {
        setRouteMode("destination");
      }
    },
    [routeMode, setRoutePoint]
  );

  const handleRouteMarkerDragEnd = useCallback(
    (pointType, event) => {
      setRoutePoint(pointType, {
        lat: event.target.getLatLng().lat,
        lng: event.target.getLatLng().lng,
      });
    },
    [setRoutePoint]
  );

  async function analyzeRouteAccessibility(points, routeProperties) {
    if (points.length < 2) {
      return null;
    }

    setLoadingScore(true);
    setError("");

    try {
      const response = await api.post("/api/routes/accessibility", {
        points,
        radiusMeters: 50,
        distanceMeters: Number.isFinite(routeProperties?.distance) ? routeProperties.distance : undefined,
        durationSeconds: Number.isFinite(routeProperties?.time) ? Math.round(routeProperties.time) : undefined,
        travelMode: geoapifyRouteMode,
        source: "geoapify-routing",
        includeReports: true,
      });

      setRouteScore(response.data);
      return response.data;
    } catch (err) {
      setError(getApiErrorMessage(err));
      return null;
    } finally {
      setLoadingScore(false);
    }
  }

  async function calculateDemoScore() {
    setLoadingScore(true);
    setError("");

    try {
      const pointsFromReports = activeReports
        .slice(0, 3)
        .map((report) => getMarkerPosition(report))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      const points = routePath.length > 0 ? routePath : pointsFromReports.length >= 2 ? pointsFromReports : defaultRoutePoints;
      const response = await api.post("/api/routes/accessibility", { points, source: "demo-or-existing-route", includeReports: true });
      setRouteScore(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingScore(false);
    }
  }

  async function calculateRoute() {
    if (!routeReady) {
      setRouteError("Selecciona el punto A y el punto B antes de calcular la ruta.");
      return;
    }

    if (!geoapifyApiKey) {
      setRouteError("Falta configurar VITE_GEOAPIFY_API_KEY en frontend/.env.local.");
      return;
    }

    setLoadingRoute(true);
    setRouteError("");
    setRouteScore(null);

    try {
      const query = new URLSearchParams({
        waypoints: `${routePoints.origin.lat},${routePoints.origin.lng}|${routePoints.destination.lat},${routePoints.destination.lng}`,
        mode: geoapifyRouteMode,
        apiKey: geoapifyApiKey,
      });

      const response = await fetch(`https://api.geoapify.com/v1/routing?${query.toString()}`);

      if (!response.ok) {
        throw new Error(`Geoapify respondió ${response.status}`);
      }

      const data = await response.json();
      const points = getGeoapifyRoutePoints(data);
      const properties = getGeoapifyProperties(data);

      if (points.length < 2) {
        throw new Error("Geoapify no devolvió una ruta válida.");
      }

      setRoutePath(points);

      const accessibility = await analyzeRouteAccessibility(points, properties);

      setRouteSummary({
        distance: accessibility?.googleDistanceLabel || accessibility?.routeLengthLabel || formatDistance(properties.distance),
        duration: accessibility?.durationLabel || formatDuration(properties.time),
        startAddress: "Punto A",
        endAddress: "Punto B",
      });
    } catch (err) {
      setRoutePath([]);
      setRouteSummary(null);
      setRouteError(err.message || "No se pudo calcular la ruta con Geoapify. Revisa la API key y que ambos puntos estén en una zona caminable.");
    } finally {
      setLoadingRoute(false);
    }
  }

  function clearRoute() {
    setRoutePoints({ origin: null, destination: null });
    setRoutePath([]);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
    setRouteMode("origin");
  }

  if (!geoapifyApiKey) {
    return (
      <main className="mapPageShell">
        <div className="mapMessage errorBox">Falta configurar VITE_GEOAPIFY_API_KEY en frontend/.env.local.</div>
      </main>
    );
  }

  return (
    <main className="mapPageShell">
      <aside className="mapPanel">
        <span className="mapBadge">Mapa Vivo</span>
        <h1>Reportes de Accesibilidad</h1>
        <p>
          Los marcadores vienen directamente del backend y Firestore. Selecciona un punto A y un punto B en el mapa para trazar una ruta peatonal con Geoapify y calcular su accesibilidad.
        </p>

        <div className="mapStatsGrid">
          <article>
            <span>Total</span>
            <strong>{reports.length}</strong>
          </article>
          <article>
            <span>Activos</span>
            <strong>{activeReports.length}</strong>
          </article>
          <article>
            <span>Urgente</span>
            <strong>{highPriorityReports.length}</strong>
          </article>
        </div>

        <section className="routePlannerCard">
          <div className="routePlannerHeader">
            <span>Ruta peatonal</span>
            <strong>A → B</strong>
          </div>

          <div className="routeModeToggle" aria-label="Seleccionar punto de ruta">
            <button type="button" className={routeMode === "origin" ? "active" : ""} onClick={() => setRouteMode("origin")}>
              Elegir punto A
            </button>
            <button type="button" className={routeMode === "destination" ? "active" : ""} onClick={() => setRouteMode("destination")}>
              Elegir punto B
            </button>
          </div>

          <div className="routePointList">
            <div>
              <span>Punto A</span>
              <strong>{formatPoint(routePoints.origin)}</strong>
            </div>
            <div>
              <span>Punto B</span>
              <strong>{formatPoint(routePoints.destination)}</strong>
            </div>
          </div>

          <p className="routeHint">Da clic en el mapa para colocar el punto activo. También puedes arrastrar los marcadores A y B.</p>

          <div className="routeButtonGrid">
            <button type="button" className="mapPrimaryButton" onClick={calculateRoute} disabled={!routeReady || loadingRoute || loadingScore}>
              {loadingRoute ? "Calculando..." : loadingScore ? "Analizando..." : "Trazar ruta"}
            </button>
            <button type="button" className="mapOutlineButton" onClick={clearRoute} disabled={!routePoints.origin && !routePoints.destination}>
              Limpiar
            </button>
          </div>

          {routeSummary && (
            <div className="routeSummaryCard">
              <strong>{routeSummary.distance}</strong>
              <span>{routeSummary.duration}</span>
              <p>{routeScore?.summary || routeScore?.message || "Ruta calculada con Geoapify."}</p>
            </div>
          )}

          {routeError && <div className="routeError">{routeError}</div>}
        </section>

        <button type="button" className="mapSecondaryButton" onClick={loadReports} disabled={loadingReports}>
          {loadingReports ? "Actualizando..." : "Actualizar reportes"}
        </button>

        <button type="button" className="mapSecondaryButton" onClick={calculateDemoScore} disabled={loadingScore || reports.length === 0}>
          {loadingScore ? "Calculando..." : routePath.length > 0 ? "Recalcular accesibilidad" : "Score demo"}
        </button>

        {routeScore && (
          <section className={`scoreCard ${getLevelClass(routeScore.level)}`}>
            <span>{routeScore.routeStyle?.badgeLabel || routeScore.levelLabel || "Score"}</span>
            <strong>{routeScore.accessibilityPercent ?? routeScore.score}/100</strong>
            <p>{routeScore.message || routeScore.routeStyle?.description}</p>
            {routeScore.warnings?.length > 0 && (
              <ul>
                {routeScore.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {routeScore.impactReports?.length > 0 && (
              <div className="routeImpactList">
                <h3>Reportes que afectan la ruta</h3>
                {routeScore.impactReports.slice(0, 4).map((impact) => (
                  <button type="button" key={impact.id} onClick={() => {
                      const report = reports.find((item) => item.id === impact.id) || null;
                      setSelectedReport(report);
                      if (report) setFocusPoint(getMarkerPosition(report));
                    }}>
                    <span>{impact.markerIcon || "⚠"}</span>
                    <strong>{impact.typeLabel}</strong>
                    <small>{impact.distanceLabel}</small>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {error && <div className="mapError">{error}</div>}
      </aside>

      <section className="mapCanvasWrap">
        <MapContainer center={toLeafletLatLng(center)} zoom={14} style={containerStyle} scrollWheelZoom>
          <MapController mapRef={mapRef} focusPoint={focusPoint} routePath={routePath} />
          <MapClickHandler onMapClick={handleMapClick} />
          <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.geoapify.com/">Geoapify</a>' />

          {routePath.length > 1 && <Polyline positions={routePath.map(toLeafletLatLng)} pathOptions={routePolylineOptions} />}

          {routePoints.origin && (
            <Marker
              position={toLeafletLatLng(routePoints.origin)}
              icon={getRoutePointIcon("A")}
              draggable
              eventHandlers={{ dragend: (event) => handleRouteMarkerDragEnd("origin", event) }}
            />
          )}

          {routePoints.destination && (
            <Marker
              position={toLeafletLatLng(routePoints.destination)}
              icon={getRoutePointIcon("B")}
              draggable
              eventHandlers={{ dragend: (event) => handleRouteMarkerDragEnd("destination", event) }}
            />
          )}

          {reports.map((report) => {
            const position = getMarkerPosition(report);
            if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return null;

            return (
              <Marker key={report.id} position={toLeafletLatLng(position)} icon={getReportIcon(report)} eventHandlers={{ click: () => { setSelectedReport(report); setFocusPoint(position); } }} />
            );
          })}

          {selectedReport && (
            <Popup position={toLeafletLatLng(getMarkerPosition(selectedReport))} eventHandlers={{ remove: () => setSelectedReport(null) }}>
              <article className="mapInfoCard">
                <h2>{selectedReport.title || selectedReport.typeLabel}</h2>
                <p>{selectedReport.description}</p>
                {selectedReport.imageUrl && <img src={getImageUrl(selectedReport.imageUrl)} alt="Reporte de accesibilidad" />}
                <div className="mapInfoMeta">
                  <span>Severidad: {selectedReport.severityLabel}</span>
                  <span>{selectedReport.statusLabel}</span>
                  <span>{selectedReport.createdAtDisplay}</span>
                </div>
              </article>
            </Popup>
          )}

          {routePoints.origin && <CircleMarker center={toLeafletLatLng(routePoints.origin)} radius={8} pathOptions={{ color: "#2563eb" }} />}
          {routePoints.destination && <CircleMarker center={toLeafletLatLng(routePoints.destination)} radius={8} pathOptions={{ color: "#dc2626" }} />}
        </MapContainer>
      </section>
    </main>
  );
}

export default MapView;
