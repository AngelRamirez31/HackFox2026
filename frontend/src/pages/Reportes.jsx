// frontend/src/pages/Reportes.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./Reportes.css";

function getSeverityFilterValue(value) {
  if (value === "alta") return 3;
  if (value === "media") return 2;
  if (value === "baja") return 1;

  return undefined;
}

function getSeverityClass(severity) {
  if (Number(severity) === 3 || severity === "alta") {
    return "severityBadge high";
  }

  if (Number(severity) === 2 || severity === "media") {
    return "severityBadge medium";
  }

  return "severityBadge low";
}

function getStatusClass(status) {
  if (status === "active") return "statusBadge active";
  if (status === "resolved") return "statusBadge resolved";

  return "statusBadge review";
}

function getPriorityClass(priorityLevel) {
  if (priorityLevel === "critical") return "priorityBadge critical";
  if (priorityLevel === "high") return "priorityBadge high";
  if (priorityLevel === "medium") return "priorityBadge medium";

  return "priorityBadge low";
}

function getTrustClass(trustLevel, trustLabel) {
  const value = String(trustLevel || trustLabel || "").toLowerCase();

  if (value.includes("alta") || value.includes("high")) {
    return "trustBadge high";
  }

  if (value.includes("media") || value.includes("medium")) {
    return "trustBadge medium";
  }

  return "trustBadge low";
}

function getPriorityWeight(priorityLevel) {
  if (priorityLevel === "critical") return 4;
  if (priorityLevel === "high") return 3;
  if (priorityLevel === "medium") return 2;

  return 1;
}

function getSeverityWeight(severity) {
  if (Number(severity) === 3 || severity === "alta") return 3;
  if (Number(severity) === 2 || severity === "media") return 2;

  return 1;
}

function getTrustWeight(report) {
  const score = Number(report.trustScore);

  if (Number.isFinite(score)) {
    return score > 1 ? score : score * 100;
  }

  const value = String(report.trustLevel || report.trustLabel || "").toLowerCase();

  if (value.includes("alta") || value.includes("high")) return 90;
  if (value.includes("media") || value.includes("medium")) return 60;

  return 25;
}

function getReportDateValue(report) {
  const rawDate =
    report.createdAt ||
    report.createdAtUtc ||
    report.lastCommunityActivityAt ||
    report.updatedAt;

  const timestamp = new Date(rawDate).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function formatCoordinates(report) {
  const lat = Number(report.latitude);
  const lng = Number(report.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Sin coordenadas";
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function getReportTitle(report) {
  return (
    report.title ||
    report.typeLabel ||
    report.type ||
    "Reporte de accesibilidad"
  );
}

function getReportDescription(report) {
  return report.description || "Sin descripción registrada.";
}

function getVerificationText(report) {
  if (report.requiresVerification) {
    return report.verificationLabel || "Requiere verificación";
  }

  return "Verificación vigente";
}

function getAuthorityFallback(report) {
  const type = report.typeLabel || "barrera física";
  const priority = report.priorityLabel || "Sin prioridad";
  const trust = report.trustLabel || "Sin confianza";
  const verification = getVerificationText(report).toLowerCase();

  return `El reporte sobre ${type.toLowerCase()} requiere atención urbana. Prioridad: ${priority}. Confianza: ${trust}. Estado: ${verification}.`;
}

function getAuthorityText(report, authoritySummaries) {
  return (
    authoritySummaries[report.id] ||
    report.authoritySummary ||
    getAuthorityFallback(report)
  );
}

function extractUpdatedReport(responseData, originalReport) {
  const possibleReport = responseData?.report || responseData;

  if (possibleReport && possibleReport.id) {
    return possibleReport;
  }

  return originalReport;
}

function Reportes() {
  const [reportes, setReportes] = useState([]);
  const [stats, setStats] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [filtroConfianza, setFiltroConfianza] = useState("todas");
  const [ordenamiento, setOrdenamiento] = useState("recientes");
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState(null);
  const [consultandoResumenId, setConsultandoResumenId] = useState(null);
  const [copiandoId, setCopiandoId] = useState(null);
  const [authoritySummaries, setAuthoritySummaries] = useState({});
  const [mensaje, setMensaje] = useState("");

  const severidadParametro = useMemo(() => {
    return getSeverityFilterValue(filtroSeveridad);
  }, [filtroSeveridad]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensaje("");

    try {
      const [reportsResponse, statsResponse] = await Promise.all([
        api.get("/api/reports", {
          params: {
            search: busqueda || undefined,
            minSeverity: severidadParametro,
            maxSeverity: severidadParametro,
            limit: 200,
          },
        }),
        api.get("/api/stats"),
      ]);

      setReportes(
        Array.isArray(reportsResponse.data) ? reportsResponse.data : []
      );

      setStats(statsResponse.data);
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [busqueda, severidadParametro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 250);

    return () => clearTimeout(timer);
  }, [cargarDatos]);

  function actualizarReporteLocal(id, updater) {
    setReportes((currentReports) =>
      currentReports.map((report) => {
        if (String(report.id) !== String(id)) return report;

        return typeof updater === "function" ? updater(report) : updater;
      })
    );
  }

  async function confirmarReporte(id) {
    setAccionandoId(id);
    setMensaje("");

    try {
      const response = await api.post(`/api/reports/${id}/confirm`);

      actualizarReporteLocal(id, (currentReport) => {
        const updatedReport = extractUpdatedReport(response.data, currentReport);

        if (updatedReport !== currentReport) {
          return updatedReport;
        }

        return {
          ...currentReport,
          confirmations: Number(currentReport.confirmations || 0) + 1,
          validationSummary: `${
            Number(currentReport.confirmations || 0) + 1
          } usuarios confirmaron que sigue ahí.`,
          lastCommunityActivityAt: new Date().toISOString(),
        };
      });

      setMensaje("Gracias. Se registró que la barrera sigue ahí.");
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setAccionandoId(null);
    }
  }

  async function rechazarReporte(id) {
    setAccionandoId(id);
    setMensaje("");

    try {
      const response = await api.post(`/api/reports/${id}/reject`);

      actualizarReporteLocal(id, (currentReport) => {
        const updatedReport = extractUpdatedReport(response.data, currentReport);

        if (updatedReport !== currentReport) {
          return updatedReport;
        }

        return {
          ...currentReport,
          rejections: Number(currentReport.rejections || 0) + 1,
          validationSummary: `${
            Number(currentReport.rejections || 0) + 1
          } usuarios indicaron que ya no está.`,
          lastCommunityActivityAt: new Date().toISOString(),
        };
      });

      setMensaje("Gracias. Se registró que la barrera ya no está.");
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setAccionandoId(null);
    }
  }

  async function obtenerResumenAutoridad(report) {
    const cachedSummary = authoritySummaries[report.id];

    if (cachedSummary) {
      setMensaje("El resumen para autoridad ya está cargado.");
      return;
    }

    setConsultandoResumenId(report.id);
    setMensaje("");

    try {
      const response = await api.get(
        `/api/reports/${report.id}/authority-summary`
      );

      const summary =
        response.data?.authoritySummary ||
        response.data?.summary ||
        response.data?.text ||
        response.data;

      setAuthoritySummaries((currentSummaries) => ({
        ...currentSummaries,
        [report.id]: String(summary || getAuthorityFallback(report)),
      }));

      setMensaje("Resumen para autoridad cargado correctamente.");
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setConsultandoResumenId(null);
    }
  }

  async function copiarResumenAutoridad(report) {
    const summary = getAuthorityText(report, authoritySummaries);

    setCopiandoId(report.id);
    setMensaje("");

    try {
      await navigator.clipboard.writeText(summary);
      setMensaje("Resumen copiado al portapapeles.");
    } catch {
      setMensaje(
        "No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente."
      );
    } finally {
      setCopiandoId(null);
    }
  }

  const reportesFiltrados = useMemo(() => {
    const query = normalizeText(busqueda);

    return reportes
      .filter((report) => {
        const matchesSearch =
          !query ||
          normalizeText(report.typeLabel).includes(query) ||
          normalizeText(report.description).includes(query) ||
          normalizeText(report.authoritySummary).includes(query) ||
          normalizeText(report.validationSummary).includes(query);

        const matchesEstado =
          filtroEstado === "todos" ||
          (filtroEstado === "activos" && report.status === "active") ||
          (filtroEstado === "verificacion" && report.requiresVerification) ||
          (filtroEstado === "altaPrioridad" &&
            ["high", "critical"].includes(report.priorityLevel));

        const matchesPrioridad =
          filtroPrioridad === "todas" ||
          report.priorityLevel === filtroPrioridad;

        const trustValue = normalizeText(report.trustLevel || report.trustLabel);

        const matchesConfianza =
          filtroConfianza === "todas" ||
          trustValue.includes(filtroConfianza) ||
          (filtroConfianza === "alta" && trustValue.includes("high")) ||
          (filtroConfianza === "media" && trustValue.includes("medium")) ||
          (filtroConfianza === "baja" && trustValue.includes("low"));

        return (
          matchesSearch &&
          matchesEstado &&
          matchesPrioridad &&
          matchesConfianza
        );
      })
      .sort((a, b) => {
        if (ordenamiento === "prioridad") {
          return (
            getPriorityWeight(b.priorityLevel) -
            getPriorityWeight(a.priorityLevel)
          );
        }

        if (ordenamiento === "severidad") {
          return getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
        }

        if (ordenamiento === "confianzaBaja") {
          return getTrustWeight(a) - getTrustWeight(b);
        }

        if (ordenamiento === "verificacion") {
          return (
            Number(Boolean(b.requiresVerification)) -
            Number(Boolean(a.requiresVerification))
          );
        }

        return getReportDateValue(b) - getReportDateValue(a);
      });
  }, [
    reportes,
    busqueda,
    filtroEstado,
    filtroPrioridad,
    filtroConfianza,
    ordenamiento,
  ]);

  const totalReportes = stats?.totalReports ?? reportes.length;

  const reportesAltaPrioridad =
    stats?.criticalPriorityReports ??
    reportes.filter((reporte) =>
      ["critical", "high"].includes(reporte.priorityLevel)
    ).length;

  const reportesActivos =
    stats?.activeReports ??
    reportes.filter((reporte) => reporte.status === "active").length;

  const requierenVerificacion =
    stats?.requiresVerificationReports ??
    reportes.filter((reporte) => reporte.requiresVerification).length;

  const mensajeEsError =
    mensaje.toLowerCase().includes("error") ||
    mensaje.toLowerCase().includes("no se") ||
    mensaje.toLowerCase().includes("no pudo");

  return (
    <main className="reportsPage">
      <section className="reportsHero">
        <div>
          <span className="reportsBadge">Mapa actual</span>

          <h1>Reportes globales</h1>

          <p>
            Consulta las barreras físicas reportadas por la comunidad. Estos
            datos ayudan a identificar zonas de riesgo, priorizar atención y
            planear trayectos más seguros.
          </p>
        </div>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <span>Total</span>
          <strong>{totalReportes}</strong>
          <p>reportes registrados</p>
        </article>

        <article className="statCard">
          <span>Prioridad alta</span>
          <strong>{reportesAltaPrioridad}</strong>
          <p>barreras críticas</p>
        </article>

        <article className="statCard">
          <span>Activos</span>
          <strong>{reportesActivos}</strong>
          <p>reportes pendientes</p>
        </article>

        <article className="statCard">
          <span>Por verificar</span>
          <strong>{requierenVerificacion}</strong>
          <p>requieren validación</p>
        </article>
      </section>

      <section className="reportsControls">
        <div className="searchBox">
          <label>Buscar reporte</label>

          <input
            type="text"
            placeholder="Buscar por tipo, descripción o resumen..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filterBox">
          <label>Estado</label>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="verificacion">Requieren verificación</option>
            <option value="altaPrioridad">Alta prioridad</option>
          </select>
        </div>

        <div className="filterBox">
          <label>Severidad</label>

          <select
            value={filtroSeveridad}
            onChange={(e) => setFiltroSeveridad(e.target.value)}
          >
            <option value="todas">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="filterBox">
          <label>Prioridad</label>

          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
          >
            <option value="todas">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <div className="filterBox">
          <label>Confianza</label>

          <select
            value={filtroConfianza}
            onChange={(e) => setFiltroConfianza(e.target.value)}
          >
            <option value="todas">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="filterBox">
          <label>Ordenar por</label>

          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
          >
            <option value="recientes">Más recientes</option>
            <option value="prioridad">Mayor prioridad</option>
            <option value="severidad">Mayor severidad</option>
            <option value="confianzaBaja">Menor confianza</option>
            <option value="verificacion">Requiere verificación</option>
          </select>
        </div>
      </section>

      {mensaje && (
        <div
          className={
            mensajeEsError
              ? "reportsMessage reportsMessageError"
              : "reportsMessage"
          }
        >
          {mensaje}
        </div>
      )}

      <section className="reportsList">
        {cargando ? (
          <div className="emptyState">
            <h2>Cargando reportes</h2>
            <p>Consultando información actualizada...</p>
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="emptyState">
            <h2>No se encontraron reportes</h2>
            <p>Intenta cambiar la búsqueda, los filtros o el ordenamiento.</p>
          </div>
        ) : (
          reportesFiltrados.map((reporte) => {
            const authoritySummary = getAuthorityText(
              reporte,
              authoritySummaries
            );

            return (
              <article className="reportCard" key={reporte.id}>
                <div
                  className={
                    reporte.imageUrl ? "reportImage withPhoto" : "reportImage"
                  }
                >
                  {reporte.imageUrl ? (
                    <img
                      src={getImageUrl(reporte.imageUrl)}
                      alt={getReportTitle(reporte)}
                    />
                  ) : (
                    <span>
                      {reporte.markerIcon ||
                        getReportTitle(reporte).charAt(0) ||
                        "R"}
                    </span>
                  )}
                </div>

                <div className="reportContent">
                  <div className="reportHeader">
                    <div>
                      <h2>{getReportTitle(reporte)}</h2>

                      <p className="reportLocation">
                        Coordenadas: {formatCoordinates(reporte)}
                      </p>
                    </div>

                    <div className="badgeGroup">
                      <span className={getSeverityClass(reporte.severity)}>
                        Severidad {reporte.severityLabel || reporte.severity}
                      </span>

                      <span className={getStatusClass(reporte.status)}>
                        {reporte.statusLabel || reporte.status || "Estado"}
                      </span>

                      <span className={getPriorityClass(reporte.priorityLevel)}>
                        Prioridad {reporte.priorityLabel || "Baja"}
                      </span>

                      <span
                        className={getTrustClass(
                          reporte.trustLevel,
                          reporte.trustLabel
                        )}
                      >
                        {reporte.trustLabel || "Confianza inicial"}
                      </span>

                      {reporte.requiresVerification && (
                        <span className="verifyBadge">
                          {reporte.verificationLabel ||
                            "Requiere verificación"}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="reportDescription">
                    {getReportDescription(reporte)}
                  </p>

                  <div className="reportMeta">
                    {reporte.demoAreaLabel && (
                      <span>Área: {reporte.demoAreaLabel}</span>
                    )}

                    <span>
                      Fecha:{" "}
                      {reporte.createdAtDisplay ||
                        new Date(reporte.createdAt).toLocaleDateString()}
                    </span>

                    <span>
                      {reporte.validationSummary ||
                        "Sin validación comunitaria"}
                    </span>

                    <span>Confirmaciones: {reporte.confirmations ?? 0}</span>
                    <span>Rechazos: {reporte.rejections ?? 0}</span>
                    <span>
                      Imagen: {reporte.hasImage || reporte.imageUrl ? "Sí" : "No"}
                    </span>

                    {reporte.geminiAnalyzed && (
                      <span>
                        Gemini:{" "}
                        {Math.round((reporte.geminiConfidence || 0) * 100)}%
                      </span>
                    )}

                    <span>ID: {reporte.id}</span>
                  </div>

                  <div className="authoritySummaryBox">
                    <div className="authoritySummaryHeader">
                      <div>
                        <strong>Resumen para autoridad</strong>

                        <span>
                          Prioridad: {reporte.priorityLabel || "Baja"} ·
                          Confianza: {reporte.trustLabel || "Inicial"} ·{" "}
                          {getVerificationText(reporte)}
                        </span>
                      </div>
                    </div>

                    <p>{authoritySummary}</p>

                    <div className="authoritySummaryActions">
                      <button
                        type="button"
                        onClick={() => copiarResumenAutoridad(reporte)}
                        disabled={copiandoId === reporte.id}
                      >
                        {copiandoId === reporte.id
                          ? "Copiando..."
                          : "Copiar resumen"}
                      </button>

                      <button
                        type="button"
                        onClick={() => obtenerResumenAutoridad(reporte)}
                        disabled={consultandoResumenId === reporte.id}
                      >
                        {consultandoResumenId === reporte.id
                          ? "Cargando..."
                          : "Ver detalles"}
                      </button>
                    </div>
                  </div>

                  <div className="communityValidationBox">
                    <strong>Validación comunitaria</strong>

                    <p>
                      {reporte.confirmations ?? 0} usuarios confirmaron que
                      sigue ahí. {reporte.rejections ?? 0} usuarios indicaron
                      que ya no está.
                    </p>

                    <div className="communityValidationActions">
                      <button
                        type="button"
                        onClick={() => confirmarReporte(reporte.id)}
                        disabled={accionandoId === reporte.id}
                      >
                        Sigue ahí
                      </button>

                      <button
                        type="button"
                        onClick={() => rechazarReporte(reporte.id)}
                        disabled={accionandoId === reporte.id}
                      >
                        Ya no está
                      </button>

                      <Link to={`/mapa?reportId=${reporte.id}`}>
                        Ver en mapa
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

export default Reportes;