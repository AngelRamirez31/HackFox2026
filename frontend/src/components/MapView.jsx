import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
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
  if (report.position?.lat && report.position?.lng) return report.position;
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

function MapView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState("");
  const [routeScore, setRouteScore] = useState(null);

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

  const activeReports = useMemo(() => reports.filter((report) => report.status === "active"), [reports]);
  const highPriorityReports = useMemo(() => reports.filter((report) => Number(report.severity) >= 3), [reports]);

  async function calculateDemoScore() {
    setLoadingScore(true);
    setError("");

    try {
      const pointsFromReports = activeReports
        .slice(0, 3)
        .map((report) => getMarkerPosition(report))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      const points = pointsFromReports.length >= 2 ? pointsFromReports : defaultRoutePoints;
      const response = await api.post("/api/routes/score", { points });
      setRouteScore(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingScore(false);
    }
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
          Los marcadores vienen directamente del backend y Firestore. Úsalos para detectar barreras físicas y estimar el nivel de accesibilidad de una ruta.
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

        <button type="button" className="mapPrimaryButton" onClick={loadReports} disabled={loadingReports}>
          {loadingReports ? "Actualizando..." : "Actualizar reportes"}
        </button>

        <button type="button" className="mapSecondaryButton" onClick={calculateDemoScore} disabled={loadingScore || reports.length === 0}>
          {loadingScore ? "Calculando..." : "Calcular score demo"}
        </button>

        {routeScore && (
          <section className={`scoreCard ${getLevelClass(routeScore.level)}`}>
            <span>{routeScore.routeStyle?.badgeLabel || routeScore.levelLabel || "Score"}</span>
            <strong>{routeScore.score}/100</strong>
            <p>{routeScore.message || routeScore.routeStyle?.description}</p>
            {routeScore.warnings?.length > 0 && (
              <ul>
                {routeScore.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && <div className="mapError">{error}</div>}
      </aside>

      <section className="mapCanvasWrap">
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14} options={{ streetViewControl: false, mapTypeControl: false }}>
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
