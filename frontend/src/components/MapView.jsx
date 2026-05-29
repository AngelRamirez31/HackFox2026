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
  if (Number.isFinite(report.position?.lat) && Number.isFinite(report.position?.lng)) return report.position;
  return {
    lat: Number(report.latitude),
    lng: Number(report.longitude),
  };
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

function getRouteDistanceMeters(directions) {
  const route = directions?.routes?.[0];
  if (!route) return undefined;

  const total = route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
  return total > 0 ? total : undefined;
}

function getRouteDurationSeconds(directions) {
  const route = directions?.routes?.[0];
  if (!route) return undefined;

  const total = route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
  return total > 0 ? total : undefined;
}

function getDirectionsErrorMessage(error) {
  const text = String(error?.message || error || "");

  if (text.includes("REQUEST_DENIED")) {
    return "No se pudo calcular la ruta. Revisa que la API key tenga Directions API habilitada y permisos correctos.";
  }

  if (text.includes("ZERO_RESULTS")) {
    return "Google Maps no encontró una ruta peatonal entre esos puntos. Intenta mover A o B a otra calle cercana.";
  }

  if (text.includes("NOT_FOUND")) {
    return "No se encontró alguno de los puntos seleccionados. Intenta elegir puntos más cercanos a una calle.";
  }

  return "No se pudo calcular la ruta. Revisa que ambos puntos estén en una zona caminable.";
}

function MapView() {
  const [searchParams] = useSearchParams();
  const selectedReportId = searchParams.get("reportId");
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
    if (!selectedReportId || reports.length === 0) return;

    const report = reports.find((item) => String(item.id) === String(selectedReportId));
    if (!report) return;

    const position = getMarkerPosition(report);
    setSelectedReport(report);

    if (mapRef.current && Number.isFinite(position.lat) && Number.isFinite(position.lng)) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(17);
    }
  }, [reports, selectedReportId]);

  const activeReports = useMemo(() => reports.filter((report) => report.status === "active"), [reports]);
  const highPriorityReports = useMemo(() => reports.filter((report) => Number(report.severity) >= 3), [reports]);
  const routeReady = Boolean(routePoints.origin && routePoints.destination);
  const routePolylineOptions = useMemo(() => {
    const style = routeScore?.routeStyle;

    return {
      strokeColor: style?.strokeColor || "#2563eb",
      strokeOpacity: style?.strokeOpacity || 0.9,
      strokeWeight: style?.strokeWeight || 6,
    };
  }, [routeScore]);

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

  async function analyzeRouteAccessibility(result) {
    const points = getRoutePathPoints(result);

    if (points.length < 2) {
      setRouteScore(null);
      setRouteError("La ruta se calculó, pero no se pudieron extraer puntos suficientes para analizar accesibilidad.");
      return null;
    }

    setLoadingScore(true);

    try {
      const response = await api.post("/api/routes/accessibility", {
        points,
        radiusMeters: 50,
        distanceMeters: getRouteDistanceMeters(result),
        durationSeconds: getRouteDurationSeconds(result),
        travelMode: "walking",
        source: "google-directions",
        includeReports: true,
      });

      setRouteScore(response.data);
      return response.data;
    } catch (err) {
      setRouteScore(null);
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
      const response = await api.post("/api/routes/accessibility", {
        points,
        travelMode: routePathPoints.length > 0 ? "walking" : "demo",
        source: routePathPoints.length > 0 ? "google-directions" : "demo",
        includeReports: true,
      });
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
    setError("");
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
      setDirections(result);
      setRouteSummary({
        distance: leg?.distance?.text || "Distancia no disponible",
        duration: leg?.duration?.text || "Tiempo no disponible",
        startAddress: leg?.start_address || "Punto A",
        endAddress: leg?.end_address || "Punto B",
      });

      await analyzeRouteAccessibility(result);
    } catch (err) {
      setDirections(null);
      setRouteSummary(null);
      setRouteError(getDirectionsErrorMessage(err));
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
          Los marcadores vienen directamente del backend y Firestore. Selecciona un punto A y un punto B para trazar una ruta y analizar su accesibilidad.
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
              <p>{routeScore?.summary || "Ruta calculada con Google Maps. Analizando accesibilidad con reportes cercanos."}</p>
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
            <div className="scoreMetaGrid">
              <div>
                <small>Reportes cercanos</small>
                <b>{routeScore.nearbyReports}</b>
              </div>
              <div>
                <small>Longitud analizada</small>
                <b>{routeScore.routeLengthLabel || routeScore.googleDistanceLabel || "--"}</b>
              </div>
            </div>
            {routeScore.warnings?.length > 0 && (
              <ul>
                {routeScore.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {routeScore.impactReports?.length > 0 && (
              <div className="impactReportList">
                {routeScore.impactReports.slice(0, 3).map((report) => (
                  <button key={report.id} type="button" onClick={() => setSelectedReport(reports.find((item) => item.id === report.id) || null)}>
                    <span>{report.markerIcon}</span>
                    <div>
                      <strong>{report.typeLabel}</strong>
                      <small>{report.distanceLabel} · {report.impactLabel}</small>
                    </div>
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
          center={center}
          zoom={14}
          options={{ streetViewControl: false, mapTypeControl: false }}
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map;
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
