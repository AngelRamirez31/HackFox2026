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

const reportMapFilters = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "verificacion", label: "Requieren verificación" },
  { value: "prioridad", label: "Alta prioridad" },
  { value: "baja-confianza", label: "Baja confianza" },
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

function getHotspotColor(priorityLevel) {
  if (priorityLevel === "critical") return "#dc2626";
  if (priorityLevel === "high") return "#f97316";
  if (priorityLevel === "medium") return "#facc15";
  return "#2563eb";
}

function getHotspotRadius(reportCount) {
  const count = Number(reportCount) || 1;
  return Math.min(38, Math.max(16, 12 + count * 4));
}

function getPriorityClass(priorityLevel) {
  if (priorityLevel === "critical") return "priorityBadge critical";
  if (priorityLevel === "high") return "priorityBadge high";
  if (priorityLevel === "medium") return "priorityBadge medium";
  return "priorityBadge low";
}

function getTrustClass(trustLevel) {
  if (trustLevel === "high") return "trustBadge high";
  if (trustLevel === "medium") return "trustBadge medium";
  if (trustLevel === "low") return "trustBadge low";
  return "trustBadge unknown";
}

function formatBooleanLabel(value) {
  return value ? "Sí" : "No";
}


function matchesReportFilter(report, filter) {
  if (filter === "activos") {
    return report.status === "active";
  }

  if (filter === "verificacion") {
    return report.requiresVerification === true;
  }

  if (filter === "prioridad") {
    if (report.priorityLevel) {
      return (
        report.priorityLevel === "high" ||
        report.priorityLevel === "critical"
      );
    }

    return Number(report.severity) >= 3;
  }

  if (filter === "baja-confianza") {
    const trustScore = Number(report.trustScore);

    return (
      report.trustLevel === "low" ||
      (report.trustScore != null && Number.isFinite(trustScore) && trustScore < 40)
    );
  }

  return true;
}


function getReportFromResponse(payload) {
  if (!payload) return null;
  return payload.report || payload.updatedReport || payload;
}

function normalizeIssueBreakdown(issueBreakdown) {
  if (!issueBreakdown) return [];

  if (Array.isArray(issueBreakdown)) {
    return issueBreakdown
      .map((item) => ({
        label: item.label || item.typeLabel || item.type || item.name || "Problema",
        count: Number(item.count ?? item.total ?? item.value ?? 0),
      }))
      .filter((item) => item.count > 0 || item.label);
  }

  if (typeof issueBreakdown === "object") {
    return Object.entries(issueBreakdown).map(([label, count]) => ({
      label,
      count: Number(count) || 0,
    }));
  }

  return [];
}

function getRouteExplanation(routeScore, routeAccessibilityPercent) {
  return (
    routeScore?.explanation ||
    routeScore?.message ||
    routeScore?.summary ||
    `Ruta calculada con ${routeAccessibilityPercent}% de accesibilidad.`
  );
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
  const [reportFilter, setReportFilter] = useState("todos");
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [validatingReportId, setValidatingReportId] = useState(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [routeCopyMessage, setRouteCopyMessage] = useState("");
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState("");
  const [hotspotsError, setHotspotsError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeScore, setRouteScore] = useState(null);
  const [routeMode, setRouteMode] = useState("origin");
  const [routePoints, setRoutePoints] = useState({
    origin: null,
    destination: null,
  });
  const [routePath, setRoutePath] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [mobilityProfile, setMobilityProfile] = useState("default");
  const [focusPoint, setFocusPoint] = useState(null);

  const reportIdParam = searchParams.get("reportId");
  const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "";
  const geoapifyTileStyle =
    import.meta.env.VITE_GEOAPIFY_TILE_STYLE || "osm-bright";
  const geoapifyRouteMode = import.meta.env.VITE_GEOAPIFY_ROUTE_MODE || "walk";

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");

    try {
      const response = await api.get("/api/reports/map", {
        params: {
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

  const loadHotspots = useCallback(async () => {
    setLoadingHotspots(true);
    setHotspotsError("");

    try {
      const response = await api.get("/api/reports/hotspots", {
        params: {
          limit: 5,
          radiusMeters: 120,
        },
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setHotspots(data);
    } catch (err) {
      setHotspotsError(getApiErrorMessage(err));
    } finally {
      setLoadingHotspots(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReports]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHotspots();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadHotspots]);

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
      setValidationMessage("");
      setFocusPoint(position);
    }, 0);

    return () => clearTimeout(timer);
  }, [reportIdParam, reports]);

  const updateReportReferences = useCallback((updatedReport) => {
    if (!updatedReport?.id) return;

    setReports((currentReports) =>
      currentReports.map((report) =>
        String(report.id) === String(updatedReport.id)
          ? { ...report, ...updatedReport }
          : report
      )
    );

    setSelectedReport((currentReport) =>
      currentReport && String(currentReport.id) === String(updatedReport.id)
        ? { ...currentReport, ...updatedReport }
        : currentReport
    );

    setSelectedHotspot((currentHotspot) => {
      if (!currentHotspot || !Array.isArray(currentHotspot.reports)) {
        return currentHotspot;
      }

      return {
        ...currentHotspot,
        reports: currentHotspot.reports.map((report) =>
          String(report.id) === String(updatedReport.id)
            ? { ...report, ...updatedReport }
            : report
        ),
      };
    });

    setRouteScore((currentScore) => {
      if (!currentScore || !Array.isArray(currentScore.impactReports)) {
        return currentScore;
      }

      return {
        ...currentScore,
        impactReports: currentScore.impactReports.map((report) =>
          String(report.id) === String(updatedReport.id)
            ? { ...report, ...updatedReport }
            : report
        ),
      };
    });
  }, []);

  const handleCommunityValidation = useCallback(
    async (reportId, action) => {
      if (!reportId) return;

      const endpointAction = action === "reject" ? "reject" : "confirm";

      setValidatingReportId(reportId);
      setValidationMessage("");

      try {
        const response = await api.post(
          `/api/reports/${reportId}/${endpointAction}`
        );
        const updatedReport = getReportFromResponse(response.data);

        if (updatedReport) {
          updateReportReferences(updatedReport);
        }

        setValidationMessage(
          endpointAction === "confirm"
            ? "Validación registrada: el reporte sigue ahí."
            : "Validación registrada: el reporte ya no está."
        );
      } catch (err) {
        setValidationMessage(getApiErrorMessage(err));
      } finally {
        setValidatingReportId(null);
      }
    },
    [updateReportReferences]
  );

  const handleFocusReportOnMap = useCallback((report) => {
    const position = getMarkerPosition(report);

    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
      return;
    }

    setSelectedReport(report);
    setValidationMessage("");
    setFocusPoint(position);
  }, []);

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === "active"),
    [reports]
  );

  const highPriorityReports = useMemo(
    () =>
      reports.filter((report) => {
        if (report.priorityLevel) {
          return (
            report.priorityLevel === "high" ||
            report.priorityLevel === "critical"
          );
        }

        return Number(report.severity) >= 3;
      }),
    [reports]
  );

  const criticalReports = useMemo(
    () =>
      reports.filter((report) => {
        if (report.priorityLevel) {
          return report.priorityLevel === "critical";
        }

        return Number(report.severity) >= 3;
      }),
    [reports]
  );

  const verificationReports = useMemo(
    () => reports.filter((report) => report.requiresVerification === true),
    [reports]
  );

  const lowTrustReports = useMemo(
    () =>
      reports.filter((report) => {
        const trustScore = Number(report.trustScore);

        return (
          report.trustLevel === "low" ||
          (report.trustScore != null &&
            Number.isFinite(trustScore) &&
            trustScore < 40)
        );
      }),
    [reports]
  );

  const visibleReports = useMemo(
    () => reports.filter((report) => matchesReportFilter(report, reportFilter)),
    [reports, reportFilter]
  );

  const hasReports = reports.length > 0;
  const visibleReportCount = visibleReports.length;
  const hotspotCount = Array.isArray(hotspots) ? hotspots.length : 0;

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

  const issueItems = useMemo(
    () => normalizeIssueBreakdown(routeScore?.issueBreakdown),
    [routeScore]
  );

  const selectedReportPosition = useMemo(
    () => (selectedReport ? getMarkerPosition(selectedReport) : null),
    [selectedReport]
  );

  const selectedReportHasPosition = Boolean(
    selectedReportPosition &&
      Number.isFinite(selectedReportPosition.lat) &&
      Number.isFinite(selectedReportPosition.lng)
  );

  const setRoutePoint = useCallback((pointType, point) => {
    setRoutePoints((current) => ({
      ...current,
      [pointType]: point,
    }));

    setRoutePath([]);
    setRouteSummary(null);
    setRouteScore(null);
    setRouteError("");
    setRouteCopyMessage("");
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
        source: "demo-or-existing-route",
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
    if (!routeReady) {
      setRouteError(
        "Selecciona el punto A y el punto B antes de calcular la ruta."
      );
      return;
    }

    if (!geoapifyApiKey) {
      setRouteError(
        "Falta configurar VITE_GEOAPIFY_API_KEY en frontend/.env.local."
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
        distance:
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
          "No se pudo calcular la ruta con Geoapify. Revisa la API key y que ambos puntos estén en una zona caminable."
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
    setRouteCopyMessage("");
    setRouteMode("origin");
  }

  async function refreshMapData() {
    await Promise.all([loadReports(), loadHotspots()]);
  }

  function clearMapSelection() {
    setSelectedReport(null);
    setSelectedHotspot(null);
    setValidationMessage("");
  }

  function resetMapView() {
    clearRoute();
    clearMapSelection();
    setReportFilter("todos");
    setError("");
    setHotspotsError("");
    setRouteError("");
  }

  function buildRouteSummaryText() {
    if (!routeScore) {
      return "";
    }

    const lines = [
      "Resumen de ruta accesible",
      "",
      `Accesibilidad: ${routeAccessibilityPercent}%`,
    ];

    if (routeScore.levelLabel) {
      lines.push(`Nivel: ${routeScore.levelLabel}`);
    }

    if (routeScore.mobilityProfileLabel) {
      lines.push(`Perfil evaluado: ${routeScore.mobilityProfileLabel}`);
    }

    if (routeSummary?.distance || routeSummary?.duration) {
      lines.push(
        `Distancia y tiempo: ${routeSummary?.distance || "No disponible"} · ${
          routeSummary?.duration || "No disponible"
        }`
      );
    }

    lines.push(`Punto A: ${formatPoint(routePoints.origin)}`);
    lines.push(`Punto B: ${formatPoint(routePoints.destination)}`);
    lines.push("");

    lines.push(
      getRouteExplanation(routeScore, routeAccessibilityPercent)
    );

    if (routeScore.beforeLeavingRecommendation) {
      lines.push("");
      lines.push("Antes de salir:");
      lines.push(routeScore.beforeLeavingRecommendation);
    }

    if (issueItems.length > 0) {
      lines.push("");
      lines.push("Problemas detectados:");
      issueItems.forEach((item) => {
        lines.push(`- ${item.label}: ${item.count}`);
      });
    }

    if (Array.isArray(routeScore.impactReports) && routeScore.impactReports.length > 0) {
      lines.push("");
      lines.push("Reportes que afectan la ruta:");
      routeScore.impactReports.forEach((report, index) => {
        const title = report.title || report.typeLabel || `Reporte ${index + 1}`;
        const details = [
          report.severityLabel,
          report.priorityLabel,
          report.trustLabel,
          report.requiresVerification
            ? report.verificationLabel || "Requiere verificación"
            : null,
        ].filter(Boolean);

        lines.push(`- ${title}${details.length > 0 ? ` (${details.join(" · ")})` : ""}`);
      });
    }

    return lines.join("\n");
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function handleCopyRouteSummary() {
    const summaryText = buildRouteSummaryText();

    if (!summaryText) {
      setRouteCopyMessage("Calcula una ruta antes de copiar el resumen.");
      return;
    }

    try {
      await copyTextToClipboard(summaryText);
      setRouteCopyMessage("Resumen de ruta copiado.");
    } catch {
      setRouteCopyMessage("No se pudo copiar el resumen automáticamente.");
    }
  }

  if (!geoapifyApiKey) {
    return (
      <main className="mapPageShell">
        <div className="mapMessage errorBox">
          Falta configurar VITE_GEOAPIFY_API_KEY en frontend/.env.local.
        </div>
      </main>
    );
  }

  return (
    <main className="mapPageShell">
      <section className="mapPanel mapOverviewPanel">
        <div className="mapOverviewContent">
          <span className="mapBadge">Mapa en Vivo</span>

          <h1>Reportes de Accesibilidad</h1>

          <p>
            Selecciona un punto A y un punto B en el mapa para trazar una ruta
            peatonal con Geoapify y calcular su accesibilidad.
          </p>

          <div className="mapOverviewBottomCards">
            <div className="mapExecutiveSummary">
              <strong>Resumen urbano</strong>

              {hasReports ? (
                <p>
                  Actualmente hay {activeReports.length} reportes activos,{" "}
                  {highPriorityReports.length} de alta prioridad
                  {criticalReports.length > 0
                    ? `, ${criticalReports.length} críticos`
                    : ""}{" "}
                  y {verificationReports.length} que requieren verificación
                  comunitaria.
                  {hotspotCount > 0
                    ? ` También se detectaron ${hotspotCount} zonas críticas.`
                    : " No se detectaron zonas críticas por ahora."}
                </p>
              ) : (
                <p>
                  Aún no hay suficientes reportes para generar un resumen urbano.
                </p>
              )}
            </div>

            <section
              className="mapFilterPanel"
              aria-label="Filtros de reportes en mapa"
            >
              <div>
                <strong>Filtrar marcadores</strong>
                <p>
                  Mostrando {visibleReportCount} de {reports.length} reportes
                  en el mapa.
                </p>
              </div>

              <div className="mapFilterButtons">
                {reportMapFilters.map((filter) => (
                  <button
                    type="button"
                    className={
                      reportFilter === filter.value
                        ? "mapFilterButton active"
                        : "mapFilterButton"
                    }
                    onClick={() => setReportFilter(filter.value)}
                    key={filter.value}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mapOverviewAside">
          <div className="mapStatsGrid enhancedMapStatsGrid">
            <article>
              <span>Total</span>
              <strong>{reports.length}</strong>
            </article>

            <article className="statVisible">
              <span>Visibles</span>
              <strong>{visibleReportCount}</strong>
            </article>

            <article>
              <span>Activos</span>
              <strong>{activeReports.length}</strong>
            </article>

            <article className="statWarning">
              <span>Alta prioridad</span>
              <strong>{highPriorityReports.length}</strong>
            </article>

            <article className="statVerification">
              <span>Requieren verificación</span>
              <strong>{verificationReports.length}</strong>
            </article>

            <article className="statTrust">
              <span>Baja confianza</span>
              <strong>{lowTrustReports.length}</strong>
            </article>

            <article className="statHotspots">
              <span>Zonas críticas</span>
              <strong>{hotspotCount}</strong>
            </article>
          </div>
        </div>
      </section>

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

          {visibleReports.map((report) => {
            const position = getMarkerPosition(report);

            if (
              !Number.isFinite(position.lat) ||
              !Number.isFinite(position.lng)
            ) {
              return null;
            }

            return (
              <Marker
                key={report.id || `${position.lat}-${position.lng}`}
                position={toLeafletLatLng(position)}
                icon={getReportIcon(report)}
                eventHandlers={{
                  click: () => {
                    setSelectedReport(report);
                    setValidationMessage("");
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
                remove: () => {
                  setSelectedReport(null);
                  setValidationMessage("");
                },
              }}
          >
            <article className="mapInfoCard">
                <h2>{selectedReport.title || selectedReport.typeLabel || "Reporte"}</h2>

                {selectedReport.description && (
                  <p>{selectedReport.description}</p>
                )}

                {(selectedReport.priorityLabel ||
                  selectedReport.trustLabel ||
                  selectedReport.requiresVerification) && (
                  <div className="mapInfoBadges">
                    {selectedReport.priorityLabel && (
                      <span
                        className={getPriorityClass(
                          selectedReport.priorityLevel
                        )}
                      >
                        Prioridad: {selectedReport.priorityLabel}
                      </span>
                    )}

                    {selectedReport.trustLabel && (
                      <span
                        className={getTrustClass(selectedReport.trustLevel)}
                      >
                        {selectedReport.trustLabel}
                      </span>
                    )}

                    {selectedReport.requiresVerification && (
                      <span className="verificationBadge">
                        {selectedReport.verificationLabel ||
                          "Requiere verificación"}
                      </span>
                    )}
                  </div>
                )}

                {selectedReport.imageUrl && (
                  <img
                    src={getImageUrl(selectedReport.imageUrl)}
                    alt="Reporte de accesibilidad"
                  />
                )}

                <div className="mapInfoMeta">
                  {selectedReport.severityLabel && (
                    <span>Severidad: {selectedReport.severityLabel}</span>
                  )}
                  {selectedReport.statusLabel && (
                    <span>{selectedReport.statusLabel}</span>
                  )}
                  {selectedReport.createdAtDisplay && (
                    <span>{selectedReport.createdAtDisplay}</span>
                  )}
                </div>

                <div className="mapInfoValidation">
                  <strong>Validación comunitaria</strong>

                  {selectedReport.validationSummary ? (
                    <p>{selectedReport.validationSummary}</p>
                  ) : (
                    <p>
                      Confirmaciones: {selectedReport.confirmations ?? 0} ·
                      Rechazos: {selectedReport.rejections ?? 0}
                    </p>
                  )}

                  {selectedReport.id && (
                    <div className="mapInfoActions">
                      <button
                        type="button"
                        onClick={() =>
                          handleCommunityValidation(selectedReport.id, "confirm")
                        }
                        disabled={validatingReportId === selectedReport.id}
                      >
                        Sigue ahí
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCommunityValidation(selectedReport.id, "reject")
                        }
                        disabled={validatingReportId === selectedReport.id}
                      >
                        Ya no está
                      </button>
                    </div>
                  )}

                  {validationMessage && (
                    <p className="mapInfoValidationMessage">
                      {validationMessage}
                    </p>
                  )}
                </div>

                <div className="mapInfoMetaGrid">
                  <span>
                    Imagen:{" "}
                    {formatBooleanLabel(
                      selectedReport.hasImage ||
                        Boolean(selectedReport.imageUrl)
                    )}
                  </span>
                  <span>
                    Gemini: {formatBooleanLabel(selectedReport.geminiAnalyzed)}
                  </span>

                  {selectedReport.geminiConfidence !== undefined &&
                    selectedReport.geminiConfidence !== null && (
                      <span>
                        Confianza Gemini: {selectedReport.geminiConfidence}
                      </span>
                    )}
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

          {hotspots.map((hotspot) => {
            const lat = Number(hotspot.centerLat);
            const lng = Number(hotspot.centerLng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const color = getHotspotColor(hotspot.priorityLevel);

            return (
              <CircleMarker
                key={`${lat}-${lng}-${hotspot.mainIssue || "hotspot"}`}
                center={[lat, lng]}
                radius={getHotspotRadius(hotspot.reportCount)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.28,
                  opacity: 0.9,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedHotspot(hotspot);
                    setFocusPoint({ lat, lng });
                  },
                }}
              >
                <Popup>
                  <article className="hotspotPopup">
                    <h3>{hotspot.mainIssueLabel || "Zona crítica"}</h3>

                    <span className={getPriorityClass(hotspot.priorityLevel)}>
                      {hotspot.priorityLabel || "Prioridad no disponible"}
                    </span>

                    <p>{hotspot.reportCount || 0} reportes relacionados</p>

                    {Number.isFinite(Number(hotspot.averageSeverity)) && (
                      <p>
                        Severidad promedio:{" "}
                        {Number(hotspot.averageSeverity).toFixed(1)}
                      </p>
                    )}
                  </article>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </section>

      <section className="mapBottomPanel">

        {selectedReport && (
          <section className="selectedReportPanel">
            <div className="selectedReportHeader">
              <div>
                <span>Reporte seleccionado</span>
                <h2>{selectedReport.title || selectedReport.typeLabel || "Reporte"}</h2>
              </div>

              <button
                type="button"
                className="selectedReportCloseButton"
                onClick={() => {
                  setSelectedReport(null);
                  setValidationMessage("");
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="selectedReportBody">
              {selectedReport.imageUrl && (
                <img
                  className="selectedReportImage"
                  src={getImageUrl(selectedReport.imageUrl)}
                  alt="Reporte seleccionado"
                />
              )}

              <div className="selectedReportContent">
                {selectedReport.description && (
                  <p className="selectedReportDescription">
                    {selectedReport.description}
                  </p>
                )}

                <div className="selectedReportBadges">
                  {selectedReport.severityLabel && (
                    <span className="severityBadge">
                      Severidad: {selectedReport.severityLabel}
                    </span>
                  )}

                  {selectedReport.priorityLabel && (
                    <span
                      className={getPriorityClass(selectedReport.priorityLevel)}
                    >
                      Prioridad: {selectedReport.priorityLabel}
                    </span>
                  )}

                  {selectedReport.trustLabel && (
                    <span className={getTrustClass(selectedReport.trustLevel)}>
                      {selectedReport.trustLabel}
                    </span>
                  )}

                  {selectedReport.requiresVerification && (
                    <span className="verificationBadge">
                      {selectedReport.verificationLabel ||
                        "Requiere verificación"}
                    </span>
                  )}

                  {selectedReport.statusLabel && (
                    <span className="severityBadge">
                      {selectedReport.statusLabel}
                    </span>
                  )}
                </div>

                <div className="selectedReportMetaGrid">
                  {selectedReport.createdAtDisplay && (
                    <article>
                      <span>Fecha</span>
                      <strong>{selectedReport.createdAtDisplay}</strong>
                    </article>
                  )}

                  <article>
                    <span>Confirmaciones</span>
                    <strong>{selectedReport.confirmations ?? 0}</strong>
                  </article>

                  <article>
                    <span>Rechazos</span>
                    <strong>{selectedReport.rejections ?? 0}</strong>
                  </article>

                  <article>
                    <span>Imagen</span>
                    <strong>
                      {formatBooleanLabel(
                        selectedReport.hasImage ||
                          Boolean(selectedReport.imageUrl)
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>Gemini</span>
                    <strong>
                      {formatBooleanLabel(selectedReport.geminiAnalyzed)}
                    </strong>
                  </article>

                  {selectedReport.geminiConfidence !== undefined &&
                    selectedReport.geminiConfidence !== null && (
                      <article>
                        <span>Confianza Gemini</span>
                        <strong>{selectedReport.geminiConfidence}</strong>
                      </article>
                    )}

                  {selectedReportHasPosition && (
                    <article>
                      <span>Coordenadas</span>
                      <strong>
                        {formatCoordinate(selectedReportPosition.lat)},{" "}
                        {formatCoordinate(selectedReportPosition.lng)}
                      </strong>
                    </article>
                  )}
                </div>

                <div className="selectedReportValidation">
                  <strong>Validación comunitaria</strong>
                  <p>
                    {selectedReport.validationSummary ||
                      `Confirmaciones: ${
                        selectedReport.confirmations ?? 0
                      } · Rechazos: ${selectedReport.rejections ?? 0}`}
                  </p>
                </div>

                {validationMessage && (
                  <p className="mapInfoValidationMessage">{validationMessage}</p>
                )}

                <div className="selectedReportActions">
                  {selectedReportHasPosition && (
                    <button
                      type="button"
                      className="reportFocusButton"
                      onClick={() => handleFocusReportOnMap(selectedReport)}
                    >
                      Centrar en mapa
                    </button>
                  )}

                  <button
                    type="button"
                    className="communityConfirmButton"
                    onClick={() =>
                      handleCommunityValidation(selectedReport.id, "confirm")
                    }
                    disabled={
                      !selectedReport.id ||
                      String(validatingReportId) === String(selectedReport.id)
                    }
                  >
                    {String(validatingReportId) === String(selectedReport.id)
                      ? "Guardando..."
                      : "Sigue ahí"}
                  </button>

                  <button
                    type="button"
                    className="communityRejectButton"
                    onClick={() =>
                      handleCommunityValidation(selectedReport.id, "reject")
                    }
                    disabled={
                      !selectedReport.id ||
                      String(validatingReportId) === String(selectedReport.id)
                    }
                  >
                    {String(validatingReportId) === String(selectedReport.id)
                      ? "Guardando..."
                      : "Ya no está"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}


        <section className="mapQuickActionsPanel">
          <div className="mapQuickActionsHeader">
            <div>
              <span>Acciones rápidas</span>
              <h2>Control del mapa</h2>
            </div>

            <p>
              Actualiza datos, limpia selección o restablece la vista sin salir
              del mapa.
            </p>
          </div>

          <div className="mapQuickActionsGrid">
            <button
              type="button"
              className="quickActionButton primary"
              onClick={refreshMapData}
              disabled={loadingReports || loadingHotspots}
            >
              {loadingReports || loadingHotspots
                ? "Actualizando..."
                : "Actualizar mapa"}
            </button>

            <button
              type="button"
              className="quickActionButton"
              onClick={resetMapView}
            >
              Restablecer vista
            </button>

            <button
              type="button"
              className="quickActionButton"
              onClick={clearRoute}
              disabled={!routePoints.origin && !routePoints.destination && routePath.length === 0}
            >
              Limpiar ruta
            </button>

            <button
              type="button"
              className="quickActionButton"
              onClick={clearMapSelection}
              disabled={!selectedReport && !selectedHotspot}
            >
              Quitar selección
            </button>
          </div>
        </section>

        <section className="routePlannerCard">
          <div className="routePlannerHeader">
            <span>Ruta peatonal</span>
            <strong>A → B</strong>
          </div>

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

          <p className="routeHint">
            Da clic en el mapa para colocar el punto activo. También puedes
            arrastrar los marcadores A y B.
          </p>

          <div className="mobilityProfileField">
            <label htmlFor="mobility-profile">Perfil de movilidad</label>

            <select
              id="mobility-profile"
              value={mobilityProfile}
              onChange={(e) => setMobilityProfile(e.target.value)}
              disabled={loadingRoute || loadingScore}
            >
              {mobilityProfiles.map((profile) => (
                <option value={profile.value} key={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>

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
            </div>
          )}

          {routeError && <div className="routeError">{routeError}</div>}
        </section>


        <section className="mapLegendPanel" aria-labelledby="map-legend-title">
          <div className="mapLegendHeader">
            <div>
              <span>Guía visual</span>
              <h2 id="map-legend-title">Leyenda del mapa</h2>
            </div>

            <p>
              Usa esta guía para interpretar marcadores, rutas y zonas críticas
              sin depender solo del color.
            </p>
          </div>

          <div className="mapLegendGrid">
            <article className="mapLegendItem">
              <span className="legendMarker reportMarkerIcon" aria-hidden="true">
                ⚠
              </span>
              <div>
                <strong>Reporte ciudadano</strong>
                <p>Marcador individual de una barrera o problema reportado.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="legendMarker routePointA" aria-hidden="true">
                A
              </span>
              <div>
                <strong>Punto A</strong>
                <p>Inicio de la ruta peatonal seleccionada.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="legendMarker routePointB" aria-hidden="true">
                B
              </span>
              <div>
                <strong>Punto B</strong>
                <p>Destino de la ruta peatonal seleccionada.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="legendLine" aria-hidden="true"></span>
              <div>
                <strong>Ruta calculada</strong>
                <p>Trayecto generado con Geoapify y evaluado por accesibilidad.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="legendHotspot" aria-hidden="true"></span>
              <div>
                <strong>Zona crítica</strong>
                <p>Concentración de reportes cercanos detectada por backend.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="priorityBadge critical">Crítica</span>
              <div>
                <strong>Prioridad</strong>
                <p>Indica urgencia de atención. Puede ser baja, media, alta o crítica.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="trustBadge high">Alta confianza</span>
              <div>
                <strong>Confianza</strong>
                <p>Resume señales como imagen, Gemini y validación comunitaria.</p>
              </div>
            </article>

            <article className="mapLegendItem">
              <span className="verificationBadge">Requiere verificación</span>
              <div>
                <strong>Verificación</strong>
                <p>El reporte necesita confirmación de la comunidad.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="hotspotsPanel">
          <div className="hotspotsHeader">
            <div>
              <span>Zonas críticas</span>
              <h2>Problemas detectados por concentración</h2>
            </div>

            <button
              type="button"
              onClick={loadHotspots}
              disabled={loadingHotspots}
            >
              {loadingHotspots ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {hotspotsError && <p className="hotspotsError">{hotspotsError}</p>}

          {!loadingHotspots && hotspots.length === 0 && !hotspotsError && (
            <p className="hotspotsEmpty">
              No se detectaron zonas críticas por ahora.
            </p>
          )}

          <div className="hotspotList">
            {hotspots.map((hotspot) => {
              const lat = Number(hotspot.centerLat);
              const lng = Number(hotspot.centerLng);

              return (
                <button
                  type="button"
                  className="hotspotItem"
                  key={`${lat}-${lng}-${
                    hotspot.mainIssue || "hotspot-item"
                  }`}
                  onClick={() => {
                    setSelectedHotspot(hotspot);

                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                      setFocusPoint({ lat, lng });
                    }
                  }}
                >
                  <div>
                    <strong>{hotspot.mainIssueLabel || "Zona crítica"}</strong>
                    <span>
                      {hotspot.reportCount || 0} reportes relacionados
                    </span>
                  </div>

                  <span className={getPriorityClass(hotspot.priorityLevel)}>
                    {hotspot.priorityLabel || "Sin prioridad"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedHotspot && (
          <section className="selectedHotspotCard">
            <div className="selectedHotspotHeader">
              <div>
                <span>Zona seleccionada</span>
                <h3>{selectedHotspot.mainIssueLabel || "Zona crítica"}</h3>
              </div>

              <span className={getPriorityClass(selectedHotspot.priorityLevel)}>
                {selectedHotspot.priorityLabel || "Sin prioridad"}
              </span>
            </div>

            <div className="hotspotMeta">
              <span>{selectedHotspot.reportCount || 0} reportes</span>

              {Number.isFinite(Number(selectedHotspot.averageSeverity)) && (
                <span>
                  Severidad promedio:{" "}
                  {Number(selectedHotspot.averageSeverity).toFixed(1)}
                </span>
              )}
            </div>

            {Array.isArray(selectedHotspot.reports) &&
              selectedHotspot.reports.length > 0 && (
                <div className="hotspotRelatedReports">
                  {selectedHotspot.reports.map((report, index) => {
                    const reportPosition = getMarkerPosition(report);
                    const canFocusReport =
                      Number.isFinite(reportPosition.lat) &&
                      Number.isFinite(reportPosition.lng);

                    return (
                      <article
                        className="hotspotRelatedReport"
                        key={report.id || `${report.typeLabel || "report"}-${index}`}
                      >
                        <strong>{report.title || report.typeLabel || "Reporte"}</strong>

                        {report.description && <p>{report.description}</p>}

                        <div className="hotspotReportBadges">
                          {report.priorityLabel && (
                            <span
                              className={getPriorityClass(report.priorityLevel)}
                            >
                              {report.priorityLabel}
                            </span>
                          )}

                          {report.trustLabel && (
                            <span className={getTrustClass(report.trustLevel)}>
                              {report.trustLabel}
                            </span>
                          )}

                          {report.requiresVerification && (
                            <span className="verificationBadge">
                              {report.verificationLabel ||
                                "Requiere verificación"}
                            </span>
                          )}
                        </div>

                        {canFocusReport && (
                          <div className="hotspotReportActions">
                            <button
                              type="button"
                              className="reportFocusButton"
                              onClick={() => handleFocusReportOnMap(report)}
                            >
                              Ver en mapa
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
          </section>
        )}

        <div className="mapBottomActions">
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
              : "Score demo"}
          </button>
        </div>

        {routeScore && (
          <>
            <section
              className={`routeExplanationCard ${getLevelClass(
                routeScore.level
              )}`}
            >
              <div className="routeExplanationHeader">
                <div>
                  <span className="routeExplanationLabel">
                    Accesibilidad de la ruta
                  </span>
                  <strong>{routeAccessibilityPercent}%</strong>
                </div>

                {routeScore.levelLabel && (
                  <span className="routeLevelBadge">
                    {routeScore.levelLabel}
                  </span>
                )}
              </div>

              {routeScore.mobilityProfileLabel && (
                <p className="routeProfileLabel">
                  Perfil evaluado:{" "}
                  <strong>{routeScore.mobilityProfileLabel}</strong>
                </p>
              )}

              <p className="routeExplanationText">
                {getRouteExplanation(routeScore, routeAccessibilityPercent)}
              </p>

              <div className="routeExplanationMeta">
                {routeScore.nearbyReports != null &&
                  Number.isFinite(Number(routeScore.nearbyReports)) && (
                    <span>{routeScore.nearbyReports} reportes cercanos</span>
                  )}

                {routeScore.penalizedReports != null &&
                  Number.isFinite(Number(routeScore.penalizedReports)) && (
                    <span>
                      {routeScore.penalizedReports} reportes penalizan la ruta
                    </span>
                  )}

                <span>{routeImpactLabel}</span>
              </div>
            </section>

            {routeScore.beforeLeavingRecommendation && (
              <section className="beforeLeavingCard">
                <strong>Antes de salir</strong>
                <p>{routeScore.beforeLeavingRecommendation}</p>
              </section>
            )}

            <section className="routeShareCard">
              <div>
                <strong>Resumen de ruta</strong>
                <p>
                  Copia un resumen con accesibilidad, perfil evaluado,
                  recomendación, problemas detectados y reportes que impactan la
                  ruta.
                </p>
              </div>

              <button type="button" onClick={handleCopyRouteSummary}>
                Copiar resumen
              </button>

              {routeCopyMessage && (
                <span className="routeCopyMessage">{routeCopyMessage}</span>
              )}
            </section>

            {issueItems.length > 0 && (
              <section className="issueBreakdownCard">
                <h3>Problemas detectados</h3>

                <ul className="issueBreakdownList">
                  {issueItems.map((item, index) => (
                    <li
                      className="issueBreakdownItem"
                      key={`${item.label}-${index}`}
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Array.isArray(routeScore?.impactReports) &&
              routeScore.impactReports.length > 0 && (
                <section className="impactReportsSection">
                  <div className="impactReportsHeader">
                    <h3>Reportes que afectan esta ruta</h3>
                    <span>{routeScore.impactReports.length} detectados</span>
                  </div>

                  <div className="impactReportsGrid">
                    {routeScore.impactReports.map((report, index) => {
                      const reportPosition = getMarkerPosition(report);
                      const canFocusReport =
                        Number.isFinite(reportPosition.lat) &&
                        Number.isFinite(reportPosition.lng);

                      return (
                        <article
                          className="impactReportCard"
                          key={report.id || `${report.typeLabel || "report"}-${index}`}
                        >
                          {report.imageUrl && (
                            <img
                              src={getImageUrl(report.imageUrl)}
                              alt="Reporte que afecta la ruta"
                            />
                          )}

                          <div className="impactReportContent">
                            <strong>
                              {report.title || report.typeLabel || "Reporte"}
                            </strong>

                            {report.description && <p>{report.description}</p>}

                            <div className="impactReportBadges">
                              {report.severityLabel && (
                                <span className="severityBadge">
                                  {report.severityLabel}
                                </span>
                              )}

                              {report.priorityLabel && (
                                <span
                                  className={getPriorityClass(
                                    report.priorityLevel
                                  )}
                                >
                                  {report.priorityLabel}
                                </span>
                              )}

                              {report.trustLabel && (
                                <span className={getTrustClass(report.trustLevel)}>
                                  {report.trustLabel}
                                </span>
                              )}

                              {report.requiresVerification && (
                                <span className="verificationBadge">
                                  {report.verificationLabel ||
                                    "Requiere verificación"}
                                </span>
                              )}
                            </div>

                            <div className="impactReportMeta">
                              <span>
                                Confirmaciones: {report.confirmations ?? 0}
                              </span>
                              <span>Rechazos: {report.rejections ?? 0}</span>
                            </div>

                            {canFocusReport && (
                              <div className="impactReportActions">
                                <button
                                  type="button"
                                  className="reportFocusButton"
                                  onClick={() => handleFocusReportOnMap(report)}
                                >
                                  Ver en mapa
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
          </>
        )}

        {error && <div className="mapError">{error}</div>}
      </section>
    </main>
  );
}

export default MapView;
