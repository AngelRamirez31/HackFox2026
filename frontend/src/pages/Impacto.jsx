import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuActivity,
  LuClipboardCheck,
  LuMapPinned,
  LuRoute,
} from "react-icons/lu";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./Impacto.css";

function getMetricClass(level) {
  if (level === "critical") return "impactMetric critical";
  if (level === "high") return "impactMetric high";
  if (level === "medium") return "impactMetric medium";
  return "impactMetric low";
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

function getPriorityRank(report) {
  if (report.priorityLevel === "critical") return 5;
  if (report.priorityLevel === "high") return 4;
  if (report.priorityLevel === "medium") return 3;
  if (report.priorityLevel === "low") return 2;

  const priorityScore = Number(report.priorityScore);
  if (Number.isFinite(priorityScore)) {
    if (priorityScore >= 85) return 5;
    if (priorityScore >= 65) return 4;
    if (priorityScore >= 40) return 3;
  }

  const severity = Number(report.severity);
  if (Number.isFinite(severity)) {
    if (severity >= 4) return 5;
    if (severity >= 3) return 4;
    if (severity >= 2) return 3;
  }

  return 1;
}

function normalizeArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;

  return [];
}

function getReportFromResponse(payload) {
  if (!payload) return null;
  return payload.report || payload.updatedReport || payload;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildExecutiveSummary({
  reports,
  activeReports,
  verificationReports,
  criticalReports,
  hotspots,
}) {
  if (reports.length === 0) {
    return "Aún no hay suficientes reportes para generar un resumen ejecutivo de accesibilidad urbana.";
  }

  const parts = [
    `Actualmente hay ${activeReports.length} reportes activos`,
    `${verificationReports.length} requieren verificación comunitaria`,
    `${criticalReports.length} son críticos o de alta urgencia`,
  ];

  if (hotspots.length > 0) {
    parts.push(`${hotspots.length} zonas críticas fueron detectadas por concentración de reportes`);
  } else {
    parts.push("todavía no se detectan zonas críticas por concentración de reportes");
  }

  return `${parts.join(", ")}. La prioridad operativa debe enfocarse en validar reportes pendientes, atender zonas con mayor concentración y resolver primero los casos de mayor riesgo peatonal.`;
}

function Impacto() {
  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [validatingReportId, setValidatingReportId] = useState(null);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadImpact() {
      setLoading(true);
      setError("");

      try {
        const [reportsResponse, hotspotsResponse, statsResponse] =
          await Promise.allSettled([
            api.get("/api/reports", { params: { limit: 100 } }),
            api.get("/api/reports/hotspots", {
              params: {
                limit: 5,
                radiusMeters: 120,
              },
            }),
            api.get("/api/stats"),
          ]);

        if (!active) return;

        if (reportsResponse.status === "fulfilled") {
          setReports(
            normalizeArray(reportsResponse.value.data, [
              "reports",
              "items",
              "data",
            ])
          );
        } else {
          throw reportsResponse.reason;
        }

        if (hotspotsResponse.status === "fulfilled") {
          setHotspots(
            normalizeArray(hotspotsResponse.value.data, [
              "hotspots",
              "items",
              "data",
            ])
          );
        } else {
          setHotspots([]);
        }

        if (statsResponse.status === "fulfilled") {
          setStats(statsResponse.value.data);
        } else {
          setStats(null);
        }
      } catch (err) {
        if (active) setError(getApiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadImpact();

    return () => {
      active = false;
    };
  }, []);

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === "active"),
    [reports]
  );

  const verificationReports = useMemo(
    () => reports.filter((report) => report.requiresVerification === true),
    [reports]
  );

  const criticalReports = useMemo(
    () =>
      reports
        .filter((report) => getPriorityRank(report) >= 4)
        .sort((a, b) => {
          const rankDiff = getPriorityRank(b) - getPriorityRank(a);
          if (rankDiff !== 0) return rankDiff;

          return formatNumber(b.priorityScore) - formatNumber(a.priorityScore);
        }),
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

  const issueBreakdown = useMemo(() => {
    const groups = new Map();

    reports.forEach((report) => {
      const key =
        report.type ||
        report.typeLabel ||
        report.category ||
        report.issueType ||
        "sin-clasificar";
      const label =
        report.typeLabel ||
        report.categoryLabel ||
        report.issueLabel ||
        report.type ||
        "Sin Clasificar";

      const current = groups.get(key) || {
        key,
        label,
        total: 0,
        critical: 0,
        verification: 0,
        priorityScoreTotal: 0,
      };

      const priorityScore = Number(report.priorityScore);

      current.total += 1;
      current.critical += getPriorityRank(report) >= 4 ? 1 : 0;
      current.verification += report.requiresVerification ? 1 : 0;
      current.priorityScoreTotal += Number.isFinite(priorityScore)
        ? priorityScore
        : getPriorityRank(report) * 20;

      groups.set(key, current);
    });

    return [...groups.values()]
      .map((item) => ({
        ...item,
        averagePriority:
          item.total > 0 ? Math.round(item.priorityScoreTotal / item.total) : 0,
      }))
      .sort((a, b) => {
        const criticalDiff = b.critical - a.critical;
        if (criticalDiff !== 0) return criticalDiff;

        const totalDiff = b.total - a.total;
        if (totalDiff !== 0) return totalDiff;

        return b.averagePriority - a.averagePriority;
      })
      .slice(0, 6);
  }, [reports]);

  const sortedHotspots = useMemo(
    () =>
      [...hotspots].sort((a, b) => {
        const priorityDiff =
          formatNumber(b.priorityScore) - formatNumber(a.priorityScore);

        if (priorityDiff !== 0) return priorityDiff;

        return formatNumber(b.reportCount) - formatNumber(a.reportCount);
      }),
    [hotspots]
  );

  const topCriticalReports = criticalReports.slice(0, 4);
  const topHotspots = sortedHotspots.slice(0, 5);

  const executiveSummary = buildExecutiveSummary({
    reports,
    activeReports,
    verificationReports,
    criticalReports,
    hotspots: sortedHotspots,
  });

  const urbanUrgencyIndex = useMemo(() => {
    if (stats?.averageAccessibilityRisk != null) {
      return Math.round(formatNumber(stats.averageAccessibilityRisk));
    }

    if (reports.length === 0) return 0;

    const criticalWeight = criticalReports.length * 2.2;
    const verificationWeight = verificationReports.length * 1.2;
    const lowTrustWeight = lowTrustReports.length * 0.7;
    const hotspotWeight = sortedHotspots.length * 1.5;

    const score =
      ((criticalWeight + verificationWeight + lowTrustWeight + hotspotWeight) /
        Math.max(reports.length, 1)) *
      28;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [
    criticalReports.length,
    lowTrustReports.length,
    reports.length,
    sortedHotspots.length,
    stats,
    verificationReports.length,
  ]);

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

  async function handleCopyExecutiveSummary() {
    const lines = [
      "Resumen Ejecutivo de Accesibilidad Urbana",
      "",
      executiveSummary,
      "",
      `Reportes Totales: ${reports.length}`,
      `Reportes Activos: ${activeReports.length}`,
      `Requieren Verificación: ${verificationReports.length}`,
      `Reportes Críticos: ${criticalReports.length}`,
      `Zonas Críticas: ${sortedHotspots.length}`,
      `Baja Confianza: ${lowTrustReports.length}`,
    ];

    try {
      await copyTextToClipboard(lines.join("\n"));
      setCopyMessage("Resumen Ejecutivo copiado.");
    } catch {
      setCopyMessage("No se pudo copiar el resumen automáticamente.");
    }
  }

  function updateReportLocally(updatedReport) {
    if (!updatedReport?.id) return;

    setReports((currentReports) =>
      currentReports.map((report) =>
        String(report.id) === String(updatedReport.id)
          ? { ...report, ...updatedReport }
          : report
      )
    );
  }

  async function handleCommunityValidation(reportId, action) {
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
        updateReportLocally(updatedReport);
      }

      setValidationMessage(
        endpointAction === "confirm"
          ? "Validación registrada: el reporte Sigue Ahí."
          : "Validación registrada: el reporte Ya no Está."
      );
    } catch (err) {
      setValidationMessage(getApiErrorMessage(err));
    } finally {
      setValidatingReportId(null);
    }
  }

  const metrics = [
    {
      key: "verification",
      label: "Requieren Verificación",
      value: verificationReports.length,
      detail: "Reportes que necesitan confirmación comunitaria para sostener su confianza.",
      level: verificationReports.length > 0 ? "medium" : "low",
    },
    {
      key: "criticalReports",
      label: "Reportes Críticos",
      value: criticalReports.length,
      detail: "Casos con prioridad alta o crítica que deben revisarse antes que el resto.",
      level: criticalReports.length > 0 ? "critical" : "low",
    },
    {
      key: "hotspots",
      label: "Zonas Críticas",
      value: sortedHotspots.length,
      detail: "Agrupaciones de reportes cercanos que revelan puntos urbanos problemáticos.",
      level: sortedHotspots.length > 0 ? "high" : "low",
    },
    {
      key: "lowTrust",
      label: "Baja Confianza",
      value: lowTrustReports.length,
      detail: "Reportes que podrían requerir evidencia, imagen o validación adicional.",
      level: lowTrustReports.length > 0 ? "medium" : "low",
    },
  ];

  const recommendedActions = useMemo(() => {
    const actions = [];

    if (verificationReports.length > 0) {
      actions.push({
        key: "verification",
        title: "Validar Reportes Pendientes",
        description: `${verificationReports.length} reportes necesitan confirmación comunitaria. Empieza por los que tienen prioridad alta o baja confianza.`,
        owner: "Comunidad",
        urgency: verificationReports.length >= 5 ? "Urgente" : "Hoy",
        level: verificationReports.length >= 5 ? "critical" : "medium",
        to: "/reportes",
      });
    }

    if (criticalReports.length > 0) {
      actions.push({
        key: "critical",
        title: "Atender Reportes Críticos",
        description: `${criticalReports.length} reportes tienen prioridad alta o crítica. Deben revisarse antes que los casos de menor impacto.`,
        owner: "Municipio",
        urgency: criticalReports.length >= 3 ? "Urgente" : "Alta",
        level: criticalReports.length >= 3 ? "critical" : "high",
        to: criticalReports[0]?.id ? `/mapa?reportId=${criticalReports[0].id}` : "/mapa",
      });
    }

    if (sortedHotspots.length > 0) {
      const firstHotspot = sortedHotspots[0];

      actions.push({
        key: "hotspots",
        title: "Revisar Zona Crítica Principal",
        description: `${firstHotspot.mainIssueLabel || "Zona Crítica"} concentra ${
          firstHotspot.reportCount || 0
        } reportes relacionados. Conviene inspeccionar el entorno completo.`,
        owner: "Campo",
        urgency:
          firstHotspot.priorityLevel === "critical" ? "Urgente" : "Alta",
        level: firstHotspot.priorityLevel || "high",
        to: "/mapa",
      });
    }

    if (lowTrustReports.length > 0) {
      actions.push({
        key: "trust",
        title: "Reforzar Evidencia de Reportes",
        description: `${lowTrustReports.length} reportes tienen baja confianza. Pide imagen, confirmación o revisión antes de escalar a autoridad.`,
        owner: "Equipo",
        urgency: "Media",
        level: "medium",
        to: "/reportes",
      });
    }

    if (issueBreakdown.length > 0) {
      const topIssue = issueBreakdown[0];

      actions.push({
        key: "pattern",
        title: `Priorizar Patrón: ${topIssue.label}`,
        description: `${topIssue.total} reportes comparten este tipo de problema. Resolver el patrón puede mejorar varias rutas a la vez.`,
        owner: "Planeación",
        urgency: topIssue.critical > 0 ? "Alta" : "Media",
        level: topIssue.critical > 0 ? "high" : "medium",
        to: "/reportes",
      });
    }

    if (actions.length === 0) {
      actions.push({
        key: "baseline",
        title: "Mantener Monitoreo Urbano",
        description:
          "No hay señales críticas por ahora. Continúa recolectando reportes y revisando zonas nuevas.",
        owner: "Equipo",
        urgency: "Baja",
        level: "low",
        to: "/mapa",
      });
    }

    return actions.slice(0, 5);
  }, [
    criticalReports,
    issueBreakdown,
    lowTrustReports.length,
    sortedHotspots,
    verificationReports.length,
  ]);

  return (
    <main className="impactPage">
      <section className="impactHero">
        <div>
          <span className="impactBadge">Impacto Urbano</span>
          <h1>Centro de Impacto y Accesibilidad</h1>
          <p>
            Esta sección concentra lo que antes iba en Inicio: resumen ejecutivo,
            verificación, reportes críticos y zonas críticas principales.
          </p>

          <div className="impactHeroActions">
            <Link to="/mapa">Ver Mapa</Link>
            <Link to="/reportes">Revisar Reportes</Link>
          </div>
        </div>

        <div className="impactHeroCard">
          <LuActivity />
          <strong>{loading ? "..." : urbanUrgencyIndex}%</strong>
          <span>Índice de Urgencia Urbana</span>
        </div>
      </section>

      {error && <div className="impactMessage error">{error}</div>}

      {loading ? (
        <section className="impactLoading">Cargando Impacto Urbano...</section>
      ) : (
        <>
          <section className="impactNarrative">
            <div>
              <span>Resumen Ejecutivo</span>
              <h2>Estado Actual de Accesibilidad Urbana</h2>
              <p>{executiveSummary}</p>

              <div className="impactSummaryActions">
                <button type="button" onClick={handleCopyExecutiveSummary}>
                  Copiar Resumen Ejecutivo
                </button>

                {copyMessage && <span>{copyMessage}</span>}
              </div>
            </div>

            <div className="impactQuickStats">
              <article>
                <strong>{reports.length}</strong>
                <span>Reportes Totales</span>
              </article>
              <article>
                <strong>{verificationReports.length}</strong>
                <span>Requieren Verificación</span>
              </article>
              <article>
                <strong>{criticalReports.length}</strong>
                <span>Reportes Críticos</span>
              </article>
            </div>
          </section>

          <section className="impactMetricGrid">
            {metrics.map((metric) => (
              <article className={getMetricClass(metric.level)} key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="impactPanel impactBreakdownSection">
            <div className="impactPanelHeader">
              <LuActivity />
              <div>
                <span>Patrones Urbanos</span>
                <h2>Problemas Más Frecuentes</h2>
              </div>
            </div>

            {issueBreakdown.length === 0 ? (
              <p className="impactEmpty">
                Aún no hay reportes suficientes para detectar patrones.
              </p>
            ) : (
              <div className="impactBreakdownGrid">
                {issueBreakdown.map((item) => (
                  <article className="impactBreakdownCard" key={item.key}>
                    <div className="impactBreakdownTop">
                      <strong>{item.label}</strong>
                      <span>{item.total}</span>
                    </div>

                    <div className="impactBreakdownBar">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(8, (item.total / reports.length) * 100)
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="impactBreakdownMeta">
                      <span>{item.critical} críticos</span>
                      <span>{item.verification} por verificar</span>
                      <span>Prioridad Prom. {item.averagePriority}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="impactTwoColumns">
            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuMapPinned />
                <div>
                  <span>Prioridad Territorial</span>
                  <h2>Zonas Críticas Principales</h2>
                </div>
              </div>

              <div className="impactZoneList">
                {topHotspots.length === 0 ? (
                  <p className="impactEmpty">
                    Aún no hay zonas críticas suficientes.
                  </p>
                ) : (
                  topHotspots.map((zone, index) => (
                    <article
                      className="impactZone"
                      key={`${zone.centerLat}-${zone.centerLng}-${zone.mainIssue}-${index}`}
                    >
                      <div>
                        <strong>{zone.mainIssueLabel || "Zona Crítica"}</strong>
                        <p>
                          {zone.reportCount || 0} reportes relacionados
                          {zone.averageSeverity
                            ? ` · Severidad promedio ${Number(
                                zone.averageSeverity
                              ).toFixed(1)}`
                            : ""}
                        </p>
                      </div>

                      <div className="impactZoneActions">
                        <span className={getPriorityClass(zone.priorityLevel)}>
                          {zone.priorityLabel || "Prioridad"}
                        </span>

                        <Link to="/mapa">Ver en Mapa</Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuRoute />
                <div>
                  <span>Atención Inmediata</span>
                  <h2>Reportes Críticos</h2>
                </div>
              </div>

              <div className="impactReportList">
                {topCriticalReports.length === 0 ? (
                  <p className="impactEmpty">
                    No hay reportes críticos por ahora.
                  </p>
                ) : (
                  topCriticalReports.map((report) => (
                    <article className="impactReport" key={report.id}>
                      {report.imageUrl && (
                        <img
                          src={getImageUrl(report.imageUrl)}
                          alt="Reporte Crítico"
                        />
                      )}

                      <div className="impactReportContent">
                        <strong>
                          {report.title || report.typeLabel || "Reporte Crítico"}
                        </strong>

                        {report.description && <p>{report.description}</p>}

                        <div className="impactReportBadges">
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
                                "Requiere Verificación"}
                            </span>
                          )}
                        </div>

                        <div className="impactReportActions">
                          {report.id && (
                            <Link to={`/mapa?reportId=${report.id}`}>
                              Ver en mapa
                            </Link>
                          )}

                          <Link to="/reportes">Ver Detalles</Link>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="impactTwoColumns">
            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuClipboardCheck />
                <div>
                  <span>Validación Comunitaria</span>
                  <h2>Reportes por Verificar</h2>
                </div>
              </div>

              <div className="impactActionList">
                {verificationReports.slice(0, 4).length === 0 ? (
                  <p className="impactEmpty">
                    No hay reportes pendientes de verificación.
                  </p>
                ) : (
                  verificationReports.slice(0, 4).map((report) => (
                    <article className="impactAction verificationAction" key={report.id}>
                      <div>
                        <strong>
                          {report.title || report.typeLabel || "Reporte"}
                        </strong>
                        <p>
                          {report.validationSummary ||
                            "Este reporte necesita confirmación comunitaria."}
                        </p>

                        {validationMessage &&
                          String(validatingReportId) !== String(report.id) && (
                            <span className="impactValidationMessage">
                              {validationMessage}
                            </span>
                          )}
                      </div>

                      <div className="impactVerificationSide">
                        <small>
                          {report.confirmations ?? 0} confirma ·{" "}
                          {report.rejections ?? 0} rechaza
                        </small>

                        <div className="impactValidationButtons">
                          <button
                            type="button"
                            onClick={() =>
                              handleCommunityValidation(report.id, "confirm")
                            }
                            disabled={
                              !report.id ||
                              String(validatingReportId) === String(report.id)
                            }
                          >
                            {String(validatingReportId) === String(report.id)
                              ? "Guardando..."
                              : "Sigue Ahí"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCommunityValidation(report.id, "reject")
                            }
                            disabled={
                              !report.id ||
                              String(validatingReportId) === String(report.id)
                            }
                          >
                            {String(validatingReportId) === String(report.id)
                              ? "Guardando..."
                              : "Ya no Está"}
                          </button>
                        </div>

                        {report.id && (
                          <Link
                            to={`/mapa?reportId=${report.id}`}
                            className="impactMapSmallLink"
                          >
                            Ver en mapa
                          </Link>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuClipboardCheck />
                <div>
                  <span>Acciones Sugeridas</span>
                  <h2>Qué Hacer Primero</h2>
                </div>
              </div>

              <div className="impactActionList">
                {recommendedActions.map((action) => (
                  <article
                    className={`impactAction recommendedAction ${action.level}`}
                    key={action.key}
                  >
                    <div>
                      <strong>{action.title}</strong>
                      <p>{action.description}</p>
                    </div>

                    <div className="recommendedActionSide">
                      <small>
                        {action.owner} · {action.urgency}
                      </small>

                      <Link to={action.to}>Atender</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default Impacto;
