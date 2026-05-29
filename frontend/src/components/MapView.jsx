import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./MapView.css";

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "440px",
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

const mobilityProfiles = [
  { value: "default", label: "General" },
  { value: "wheelchair", label: "Silla de ruedas" },
  { value: "walker", label: "Bastón o andadera" },
  { value: "elderly", label: "Adulto mayor" },
  { value: "stroller", label: "Carriola" },
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

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
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
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
      );
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates
      .flatMap((line) =>
        line.map(([lng, lat]) => ({
          lat: Number(lat),
          lng: Number(lng),
        }))
      )
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
      );
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
  const color = escapeHtml(
    report.markerColor || report.severityColor || "#ef4444"
  );

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
      onMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
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

    map.flyTo(toLeafletLatLng(focusPoint), Math.max(map.getZoom(), 17), {
      duration: 0.6,
    });
  }, [focusPoint, map]);

  useEffect(() => {
    if (!routePath || routePath.length < 2) return;

    map.fitBounds(routePath.map(toLeafletLatLng), {
      padding: [42, 42],
    });
  }, [map, routePath]);

  return null;
}

function MapView() {
  const [searchParams] = useSearchParams();
  const mapRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [essentialDestinations, setEssentialDestinations] = useState([]);
  const [selectedDestinationKey, setSelectedDestinationKey] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeScore, setRouteScore] = useState(null);
  const [routeMode, setRouteMode] = useState("origin");
  const [routePoints, setRoutePoints] = useState({
    origin: null,
    destination: null,
  });
  const [routePath, setRoutePath] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [mobilityProfile, setMobilityProfile] = useState("default");

  const reportIdParam = searchParams.get("reportId");
  const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "";
  const geoapifyTileStyle =
    import.meta.env.VITE_GEOAPIFY_TILE_STYLE || "osm-bright";
  const geoapifyRouteMode = import.meta.env.VITE_GEOAPIFY_ROUTE_MODE || "walk";

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");

    try {
      const [reportsResponse, hotspotsResponse] = await Promise.all([
        api.get("/api/reports/map", {
          params: {
            status: "active",
            limit: 100,
          },
        }),
        api.get("/api/reports/hotspots", {
          params: {
            limit: 3,
            radiusMeters: 120,
          },
        }),
      ]);

      const data = Array.isArray(reportsResponse.data) ? reportsResponse.data : [];
      const hotspotData = Array.isArray(hotspotsResponse.data) ? hotspotsResponse.data : [];
      setReports(data);
      setHotspots(hotspotData);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReports]);

  useEffect(() => {
    let active = true;

    async function loadEssentialDestinations() {
      try {
        const response = await api.get("/api/essential-destinations");
        if (!active) return;

        const destinations = Array.isArray(response.data) ? response.data : [];
        setEssentialDestinations(destinations);

        if (destinations.length > 0) {
          setSelectedDestinationKey(destinations[0].key);
        }
      } catch {
        if (active) {
          setEssentialDestinations([]);
        }
      }
    }

    loadEssentialDestinations();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!reportIdParam || reports.length === 0) return;

    const target = reports.find(
      (report) => String(report.id) === String(reportIdParam)
    );

    if (!target) return;

    const position = getMarkerPosition(target);

    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
      return;
    }

    const timer = setTimeout(() => {
      setSelectedReport(target);
      setFocusPoint(position);
    }, 0);

    return () => clearTimeout(timer);
  }, [reportIdParam, reports]);

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === "active"),
    [reports]
  );

  const urgentReports = useMemo(
    () => reports.filter((report) => Number(report.severity) >= 3),
    [reports]
  );

  const selectedEssentialDestination = useMemo(
    () =>
      essentialDestinations.find(
        (destination) => destination.key === selectedDestinationKey
      ) || null,
    [essentialDestinations, selectedDestinationKey]
  );

  const routeReady = Boolean(routePoints.origin && routePoints.destination);

  const routePolylineOptions = useMemo(
    () => getRouteLineStyle(routeScore),
    [routeScore]
  );

  const tileUrl = `https://maps.geoapify.com/v1/tile/${geoapifyTileStyle}/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`;

  const routeAccessibilityPercent = useMemo(() => {
    const value = Number(
      routeScore?.accessibilityPercent ?? routeScore?.score ?? 0
    );

    if (!Number.isFinite(value)) return 0;

    return Math.max(0, Math.min(100, Math.round(value)));
  }, [routeScore]);

  const routeImpactCount = useMemo(() => {
    const value = Number(
      routeScore?.nearbyReports ?? routeScore?.impactReports?.length ?? 0
    );

    if (!Number.isFinite(value)) return 0;

    return Math.max(0, Math.round(value));
  }, [routeScore]);

  const routeImpactLabel =
    routeImpactCount === 1
      ? "1 reporte encontrado"
      : `${routeImpactCount} reportes encontrados`;

  const routeScoreMessage = useMemo(() => {
    const message =
      routeScore?.summary ||
      routeScore?.message ||
      routeScore?.routeStyle?.description ||
      "Ruta calculada correctamente.";

    return String(message).replace(
      /\b\d{1,3}\/100\b/g,
      `${routeAccessibilityPercent}%`
    );
  }, [routeScore, routeAccessibilityPercent]);

  const routeIssueText = useMemo(() => {
    const issues = routeScore?.issueBreakdown || [];
    if (!issues.length) return "Sin barreras cercanas";
    return issues
      .slice(0, 3)
      .map((issue) => `${issue.count} ${issue.pluralLabel || issue.typeLabel}`)
      .join(", ");
  }, [routeScore]);

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
        distanceMeters: Number.isFinite(routeProperties?.distance)
          ? routeProperties.distance
          : undefined,
        durationSeconds: Number.isFinite(routeProperties?.time)
          ? Math.round(routeProperties.time)
          : undefined,
        travelMode: geoapifyRouteMode,
        mobilityProfile,
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
        .filter(
          (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
        );

      const points =
        routePath.length > 0
          ? routePath
          : pointsFromReports.length >= 2
          ? pointsFromReports
          : defaultRoutePoints;

      const response = await api.post("/api/routes/accessibility", {
        points,
        mobilityProfile,
        source: "map-accessibility-review",
        includeReports: true,
      });

      setRouteScore(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingScore(false);
    }
  }

  function applyEssentialDestination(destination = selectedEssentialDestination) {
    if (!destination) return;

    const point = {
      lat: Number(destination.lat),
      lng: Number(destination.lng),
    };

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;

    setRoutePoint("destination", point);
    setFocusPoint(point);
    setMobilityProfile(destination.recommendedMobilityProfile || "default");
    setRouteMode("origin");
  }

  async function calculateRoute() {
    if (!routeReady) {
      setRouteError(
        "Selecciona el punto A y el punto B antes de calcular la ruta."
      );
      return;
    }

    if (!geoapifyApiKey) {
      setRouteError(
        "El mapa no está disponible en este momento."
      );
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

      const response = await fetch(
        `https://api.geoapify.com/v1/routing?${query.toString()}`
      );

      if (!response.ok) {
        throw new Error("El servicio de rutas no respondió correctamente.");
      }

      const data = await response.json();
      const points = getGeoapifyRoutePoints(data);
      const properties = getGeoapifyProperties(data);

      if (points.length < 2) {
        throw new Error("No se encontró una ruta válida entre los puntos seleccionados.");
      }

      setRoutePath(points);

      const accessibility = await analyzeRouteAccessibility(points, properties);

      setRouteSummary({
        distance:
          accessibility?.googleDistanceLabel ||
          accessibility?.routeLengthLabel ||
          formatDistance(properties.distance),
        duration: accessibility?.durationLabel || formatDuration(properties.time),
        startAddress: "Punto A",
        endAddress: "Punto B",
      });
    } catch (err) {
      setRoutePath([]);
      setRouteSummary(null);
      setRouteError(
        err.message ||
          "No se pudo calcular la ruta. Revisa que ambos puntos estén en una zona caminable."
      );
    } finally {
      setLoadingRoute(false);
    }
  }

  function clearRoute() {
    setRoutePoints({
      origin: null,
      destination: null,
    });

    setRoutePath([]);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
    setRouteMode("origin");
  }

  if (!geoapifyApiKey) {
    return (
      <main className="mapPageShell">
        <div className="mapMessage errorBox">
          El mapa no está disponible en este momento.
        </div>
      </main>
    );
  }

  return (
    <main className="mapPageShell">
      <aside className="mapPanel">
        <span className="mapBadge">Mapa Vivo</span>

        <h1>Reportes de Accesibilidad</h1>

        <p>
          Consulta barreras reportadas por la comunidad. Selecciona un punto A
          y un punto B en el mapa para trazar una ruta peatonal y calcular su
          nivel de accesibilidad.
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
            <strong>{urgentReports.length}</strong>
          </article>
        </div>

        {hotspots.length > 0 && (
          <section className="hotspotsCard">
            <div className="hotspotsHeader">
              <span>Zonas críticas</span>
              <strong>{hotspots.length}</strong>
            </div>

            {hotspots.map((hotspot) => (
              <article className="hotspotItem" key={`${hotspot.centerLat}-${hotspot.centerLng}`}>
                <strong>{hotspot.label}</strong>
                <span>{hotspot.reportCount} reportes · {hotspot.mainIssueLabel}</span>
                <small>Prioridad {hotspot.priorityLabel}</small>
              </article>
            ))}
          </section>
        )}

        <section className="routePlannerCard">
          <div className="routePlannerHeader">
            <span>Ruta peatonal</span>
            <strong>A → B</strong>
          </div>

          {essentialDestinations.length > 0 && (
            <div className="essentialDestinationBox">
              <div className="essentialDestinationTop">
                <span>Destino esencial</span>
                <strong>{selectedEssentialDestination?.icon || "📍"}</strong>
              </div>

              <select
                value={selectedDestinationKey}
                onChange={(event) => setSelectedDestinationKey(event.target.value)}
              >
                {essentialDestinations.map((destination) => (
                  <option value={destination.key} key={destination.key}>
                    {destination.name}
                  </option>
                ))}
              </select>

              {selectedEssentialDestination && (
                <p>
                  {selectedEssentialDestination.categoryLabel} · {selectedEssentialDestination.estimatedDemandLabel}. Perfil sugerido: {selectedEssentialDestination.recommendedMobilityProfileLabel}.
                </p>
              )}

              <button
                type="button"
                className="mapMiniButton"
                onClick={() => applyEssentialDestination()}
              >
                Usar como destino B
              </button>
            </div>
          )}

          <div
            className="routeModeToggle"
            aria-label="Seleccionar punto de ruta"
          >
            <button
              type="button"
              className={routeMode === "origin" ? "active" : ""}
              onClick={() => setRouteMode("origin")}
            >
              Elegir punto A
            </button>

            <button
              type="button"
              className={routeMode === "destination" ? "active" : ""}
              onClick={() => setRouteMode("destination")}
            >
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

          <label className="routeProfileField">
            <span>Perfil de movilidad</span>
            <select
              value={mobilityProfile}
              onChange={(event) => {
                setMobilityProfile(event.target.value);
                setRouteScore(null);
              }}
            >
              {mobilityProfiles.map((profile) => (
                <option value={profile.value} key={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <p className="routeHint">
            Da clic en el mapa para colocar el punto activo. También puedes
            arrastrar los marcadores A y B.
          </p>

          <div className="routeButtonGrid">
            <button
              type="button"
              className="mapPrimaryButton"
              onClick={calculateRoute}
              disabled={!routeReady || loadingRoute || loadingScore}
            >
              {loadingRoute
                ? "Calculando..."
                : loadingScore
                ? "Analizando..."
                : "Trazar ruta"}
            </button>

            <button
              type="button"
              className="mapOutlineButton"
              onClick={clearRoute}
              disabled={!routePoints.origin && !routePoints.destination}
            >
              Limpiar
            </button>
          </div>

          {routeSummary && (
            <div className="routeSummaryCard">
              <strong>{routeSummary.distance}</strong>
              <span>{routeSummary.duration}</span>
              <p>{routeScoreMessage}</p>
            </div>
          )}

          {routeError && <div className="routeError">{routeError}</div>}
        </section>

        <button
          type="button"
          className="mapSecondaryButton"
          onClick={loadReports}
          disabled={loadingReports}
        >
          {loadingReports ? "Actualizando..." : "Actualizar reportes"}
        </button>

        <button
          type="button"
          className="mapSecondaryButton"
          onClick={calculateDemoScore}
          disabled={loadingScore || reports.length === 0}
        >
          {loadingScore
            ? "Calculando..."
            : routePath.length > 0
            ? "Recalcular accesibilidad"
            : "Evaluar accesibilidad"}
        </button>

        {error && <div className="mapError">{error}</div>}
      </aside>

      <section className="mapCanvasWrap">
        <MapContainer
          center={toLeafletLatLng(center)}
          zoom={14}
          style={containerStyle}
          scrollWheelZoom
        >
          <MapController
            mapRef={mapRef}
            focusPoint={focusPoint}
            routePath={routePath}
          />

          <MapClickHandler onMapClick={handleMapClick} />

          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.geoapify.com/">Geoapify</a>'
          />

          {routePath.length > 1 && (
            <Polyline
              positions={routePath.map(toLeafletLatLng)}
              pathOptions={routePolylineOptions}
            />
          )}

          {routePoints.origin && (
            <Marker
              position={toLeafletLatLng(routePoints.origin)}
              icon={getRoutePointIcon("A")}
              draggable
              eventHandlers={{
                dragend: (event) => handleRouteMarkerDragEnd("origin", event),
              }}
            />
          )}

          {routePoints.destination && (
            <Marker
              position={toLeafletLatLng(routePoints.destination)}
              icon={getRoutePointIcon("B")}
              draggable
              eventHandlers={{
                dragend: (event) =>
                  handleRouteMarkerDragEnd("destination", event),
              }}
            />
          )}

          {hotspots.map((hotspot) => {
            const position = {
              lat: Number(hotspot.centerLat),
              lng: Number(hotspot.centerLng),
            };

            if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
              return null;
            }

            return (
              <CircleMarker
                key={`hotspot-${hotspot.centerLat}-${hotspot.centerLng}`}
                center={toLeafletLatLng(position)}
                radius={Math.min(24, 10 + Number(hotspot.reportCount || 0) * 3)}
                pathOptions={{
                  color: hotspot.severityColor || "#f97316",
                  fillColor: hotspot.severityColor || "#f97316",
                  fillOpacity: 0.18,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setFocusPoint(position),
                }}
              >
                <Popup>
                  <article className="mapInfoCard">
                    <h2>{hotspot.label}</h2>
                    <p>{hotspot.reportCount} reportes cercanos. Problema principal: {hotspot.mainIssueLabel}.</p>
                    <div className="mapInfoMeta">
                      <span>Prioridad {hotspot.priorityLabel}</span>
                      <span>Severidad prom. {hotspot.averageSeverity}</span>
                    </div>
                  </article>
                </Popup>
              </CircleMarker>
            );
          })}

          {essentialDestinations.map((destination) => {
            const position = {
              lat: Number(destination.lat),
              lng: Number(destination.lng),
            };

            if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
              return null;
            }

            return (
              <Marker
                key={`destination-${destination.key}`}
                position={toLeafletLatLng(position)}
                icon={getRoutePointIcon(destination.icon || "★")}
                eventHandlers={{
                  click: () => {
                    setSelectedDestinationKey(destination.key);
                    setFocusPoint(position);
                  },
                }}
              >
                <Popup>
                  <article className="mapInfoCard">
                    <h2>{destination.name}</h2>
                    <p>{destination.whyImportant}</p>
                    <div className="mapInfoMeta">
                      <span>{destination.categoryLabel}</span>
                      <span>{destination.estimatedDemandLabel}</span>
                      <span>{destination.recommendedMobilityProfileLabel}</span>
                    </div>
                  </article>
                </Popup>
              </Marker>
            );
          })}

          {reports.map((report) => {
            const position = getMarkerPosition(report);

            if (
              !Number.isFinite(position.lat) ||
              !Number.isFinite(position.lng)
            ) {
              return null;
            }

            return (
              <Marker
                key={report.id}
                position={toLeafletLatLng(position)}
                icon={getReportIcon(report)}
                eventHandlers={{
                  click: () => {
                    setSelectedReport(report);
                    setFocusPoint(position);
                  },
                }}
              />
            );
          })}

          {selectedReport && (
            <Popup
              position={toLeafletLatLng(getMarkerPosition(selectedReport))}
              eventHandlers={{
                remove: () => setSelectedReport(null),
              }}
            >
              <article className="mapInfoCard">
                <h2>{selectedReport.title || selectedReport.typeLabel}</h2>

                <p>{selectedReport.description}</p>

                {selectedReport.imageUrl && (
                  <img
                    src={getImageUrl(selectedReport.imageUrl)}
                    alt="Reporte de accesibilidad"
                  />
                )}

                <div className="mapInfoMeta">
                  {selectedReport.demoAreaLabel && <span>Área de interés: {selectedReport.demoAreaLabel}</span>}
                  <span>Severidad: {selectedReport.severityLabel}</span>
                  <span>{selectedReport.statusLabel}</span>
                  <span>{selectedReport.trustLabel}</span>
                  <span>Prioridad {selectedReport.priorityLabel}</span>
                  {selectedReport.requiresVerification && <span>Requiere verificación</span>}
                  <span>{selectedReport.createdAtDisplay}</span>
                </div>
              </article>
            </Popup>
          )}

          {routePoints.origin && (
            <CircleMarker
              center={toLeafletLatLng(routePoints.origin)}
              radius={8}
              pathOptions={{ color: "#2563eb" }}
            />
          )}

          {routePoints.destination && (
            <CircleMarker
              center={toLeafletLatLng(routePoints.destination)}
              radius={8}
              pathOptions={{ color: "#dc2626" }}
            />
          )}
        </MapContainer>

        {routeScore && (
          <section
            className={`scoreCard mapScorePanel ${getLevelClass(
              routeScore.level
            )}`}
          >
            <div className="scoreOverview">
              <div className="scorePercentBlock">
                <strong>{routeAccessibilityPercent}%</strong>
                <span>accesible</span>
              </div>

              <ul className="scoreBulletList">
                <li>{routeImpactLabel}</li>
                <li>{routeScore.mobilityProfileLabel || "Perfil general"}</li>
                <li>{routeIssueText}</li>
              </ul>

              <div className="routeExplanationBox">
                <strong>Por qué recibió este score</strong>
                <p>{routeScore.explanation || routeScoreMessage}</p>
              </div>

              <div className="routeRecommendationBox">
                <strong>Antes de salir</strong>
                <p>{routeScore.beforeLeavingRecommendation}</p>
              </div>

              {routeScore.impactReports?.length > 0 && (
                <div className="routeImpactMiniList">
                  {routeScore.impactReports.slice(0, 4).map((impact) => (
                    <button
                      type="button"
                      key={impact.id}
                      onClick={() => {
                        const report = reports.find((item) => item.id === impact.id);
                        if (report) {
                          setSelectedReport(report);
                          setFocusPoint(getMarkerPosition(report));
                        }
                      }}
                    >
                      <span>{impact.markerIcon}</span>
                      <strong>{impact.typeLabel}</strong>
                      <small>{impact.distanceLabel} · {impact.trustLabel}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default MapView;