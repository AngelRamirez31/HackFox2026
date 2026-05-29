import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DirectionsRenderer, GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
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

function getRoutePathPoints(directions) {
  const route = directions?.routes?.[0];
  if (!route) return [];

  return route.legs.flatMap((leg) =>
    leg.steps.flatMap((step) =>
      step.path.map((point) => ({
        lat: point.lat(),
        lng: point.lng(),
      }))
    )
  );
}

function getRouteLineStyle(routeScore) {
  const style = routeScore?.routeStyle;

  return {
    strokeColor: style?.strokeColor || "#2563eb",
    strokeOpacity: style?.strokeOpacity ?? 0.9,
    strokeWeight: style?.strokeWeight ?? 6,
  };
}

function getLegDistanceMeters(leg) {
  const value = leg?.distance?.value;
  return Number.isFinite(value) ? value : undefined;
}

function getLegDurationSeconds(leg) {
  const value = leg?.duration?.value;
  return Number.isFinite(value) ? value : undefined;
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
  const [directions, setDirections] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);

  const reportIdParam = searchParams.get("reportId");

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

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
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!reportIdParam || reports.length === 0) return;

    const target = reports.find((report) => String(report.id) === String(reportIdParam));
    if (!target) return;

    const position = getMarkerPosition(target);
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

    setSelectedReport(target);
    setMapCenter(position);

    if (mapRef.current) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 14, 17));
    }
  }, [reportIdParam, reports]);

  const activeReports = useMemo(() => reports.filter((report) => report.status === "active"), [reports]);
  const highPriorityReports = useMemo(() => reports.filter((report) => Number(report.severity) >= 3), [reports]);
  const routeReady = Boolean(routePoints.origin && routePoints.destination);
  const routePolylineOptions = useMemo(() => getRouteLineStyle(routeScore), [routeScore]);

  const setRoutePoint = useCallback((pointType, point) => {
    setRoutePoints((current) => ({
      ...current,
      [pointType]: point,
    }));
    setDirections(null);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
  }, []);

  const handleMapClick = useCallback(
    (event) => {
      if (!event.latLng) return;

      const point = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };

      setRoutePoint(routeMode, point);

      if (routeMode === "origin") {
        setRouteMode("destination");
      }
    },
    [routeMode, setRoutePoint]
  );

  const handleRouteMarkerDragEnd = useCallback(
    (pointType, event) => {
      if (!event.latLng) return;

      setRoutePoint(pointType, {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    },
    [setRoutePoint]
  );

  async function analyzeRouteAccessibility(points, leg) {
    if (points.length < 2) {
      return null;
    }

    setLoadingScore(true);
    setError("");

    try {
      const response = await api.post("/api/routes/accessibility", {
        points,
        radiusMeters: 50,
        distanceMeters: getLegDistanceMeters(leg),
        durationSeconds: getLegDurationSeconds(leg),
        travelMode: "walking",
        source: "google-directions",
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
      const routePathPoints = getRoutePathPoints(directions);
      const pointsFromReports = activeReports
        .slice(0, 3)
        .map((report) => getMarkerPosition(report))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      const points = routePathPoints.length > 0 ? routePathPoints : pointsFromReports.length >= 2 ? pointsFromReports : defaultRoutePoints;
      const response = await api.post("/api/routes/accessibility", { points, source: "demo-or-existing-route", includeReports: true });
      setRouteScore(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingScore(false);
    }
  }

  async function calculateRoute() {
    if (!routeReady || !window.google?.maps) {
      setRouteError("Selecciona el punto A y el punto B antes de calcular la ruta.");
      return;
    }

    setLoadingRoute(true);
    setRouteError("");
    setRouteScore(null);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const result = await directionsService.route({
        origin: routePoints.origin,
        destination: routePoints.destination,
        travelMode: window.google.maps.TravelMode.WALKING,
        provideRouteAlternatives: false,
      });

      const leg = result.routes?.[0]?.legs?.[0];
      const routePathPoints = getRoutePathPoints(result);
      setDirections(result);

      const accessibility = await analyzeRouteAccessibility(routePathPoints, leg);

      setRouteSummary({
        distance: leg?.distance?.text || accessibility?.googleDistanceLabel || accessibility?.routeLengthLabel || "Distancia no disponible",
        duration: leg?.duration?.text || accessibility?.durationLabel || "Tiempo no disponible",
        startAddress: leg?.start_address || "Punto A",
        endAddress: leg?.end_address || "Punto B",
      });
    } catch {
      setDirections(null);
      setRouteSummary(null);
      setRouteError("No se pudo calcular la ruta. Verifica que la API key tenga Directions habilitado y que ambos puntos estén en zona caminable.");
    } finally {
      setLoadingRoute(false);
    }
  }

  function clearRoute() {
    setRoutePoints({ origin: null, destination: null });
    setDirections(null);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
    setRouteMode("origin");
  }

  if (loadError) {
    return (
      <main className="mapPageShell">
        <div className="mapMessage errorBox">No se pudo cargar Google Maps. Revisa VITE_GOOGLE_MAPS_API_KEY.</div>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="mapPageShell">
        <div className="mapMessage">Cargando mapa...</div>
      </main>
    );
  }

  return (
    <main className="mapPageShell">
      <aside className="mapPanel">
        <span className="mapBadge">Mapa vivo</span>
        <h1>Reportes de accesibilidad</h1>
        <p>
          Los marcadores vienen directamente del backend y Firestore. Selecciona un punto A y un punto B en el mapa para trazar una ruta peatonal y calcular su accesibilidad.
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
            <span>Alta prioridad</span>
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
              <p>{routeScore?.summary || routeScore?.message || "Ruta calculada con Google Maps."}</p>
            </div>
          )}

          {routeError && <div className="routeError">{routeError}</div>}
        </section>

        <button type="button" className="mapSecondaryButton" onClick={loadReports} disabled={loadingReports}>
          {loadingReports ? "Actualizando..." : "Actualizar reportes"}
        </button>

        <button type="button" className="mapSecondaryButton" onClick={calculateDemoScore} disabled={loadingScore || reports.length === 0}>
          {loadingScore ? "Calculando..." : directions ? "Recalcular accesibilidad" : "Score demo"}
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
                  <button type="button" key={impact.id} onClick={() => setSelectedReport(reports.find((report) => report.id === impact.id) || null)}>
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
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={14}
          options={{ streetViewControl: false, mapTypeControl: false }}
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map;
          }}
          onUnmount={() => {
            mapRef.current = null;
          }}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                preserveViewport: false,
                polylineOptions: routePolylineOptions,
              }}
            />
          )}

          {routePoints.origin && (
            <Marker
              position={routePoints.origin}
              draggable
              label={{ text: "A", color: "white", fontWeight: "900" }}
              title="Punto A"
              onDragEnd={(event) => handleRouteMarkerDragEnd("origin", event)}
            />
          )}

          {routePoints.destination && (
            <Marker
              position={routePoints.destination}
              draggable
              label={{ text: "B", color: "white", fontWeight: "900" }}
              title="Punto B"
              onDragEnd={(event) => handleRouteMarkerDragEnd("destination", event)}
            />
          )}

          {reports.map((report) => {
            const position = getMarkerPosition(report);
            if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return null;

            return (
              <Marker
                key={report.id}
                position={position}
                label={{ text: report.markerIcon || "⚠", fontSize: "20px" }}
                title={report.title || report.typeLabel}
                onClick={() => setSelectedReport(report)}
              />
            );
          })}

          {selectedReport && (
            <InfoWindow position={getMarkerPosition(selectedReport)} onCloseClick={() => setSelectedReport(null)}>
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
            </InfoWindow>
          )}
        </GoogleMap>
      </section>
    </main>
  );
}

export default MapView;
