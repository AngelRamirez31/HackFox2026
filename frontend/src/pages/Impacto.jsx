import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuActivity, LuClipboardCheck, LuMapPinned, LuRoute } from "react-icons/lu";
import api, { getApiErrorMessage } from "../services/api";
import "./Impacto.css";

function getMetricClass(level) {
  if (level === "critical") return "impactMetric critical";
  if (level === "high") return "impactMetric high";
  if (level === "medium") return "impactMetric medium";
  return "impactMetric low";
}

function Impacto() {
  const [summary, setSummary] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadImpact() {
      setLoading(true);
      setError("");

      try {
        const [impactResponse, destinationsResponse] = await Promise.all([
          api.get("/api/impact/summary", { params: { hotspotLimit: 5 } }),
          api.get("/api/essential-destinations"),
        ]);

        if (!active) return;

        setSummary(impactResponse.data);
        setDestinations(Array.isArray(destinationsResponse.data) ? destinationsResponse.data : []);
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

  const metrics = summary?.metrics || [];
  const priorityZones = summary?.priorityZones || [];
  const actions = summary?.recommendedActions || [];

  return (
    <main className="impactPage">
      <section className="impactHero">
        <div>
          <span className="impactBadge">Impacto Social Medible</span>
          <h1>Dashboard de impacto urbano</h1>
          <p>
            Convierte reportes ciudadanos en métricas claras para autoridades,
            comunidad y decisiones de accesibilidad en servicios públicos.
          </p>
        </div>

        <div className="impactHeroCard">
          <LuActivity />
          <strong>{loading ? "..." : summary?.averageAccessibilityRisk?.toFixed?.(0) ?? "0"}%</strong>
          <span>índice de urgencia urbana</span>
        </div>
      </section>

      {error && <div className="impactMessage error">{error}</div>}

      {loading ? (
        <section className="impactLoading">Cargando métricas...</section>
      ) : summary ? (
        <>
          <section className="impactNarrative">
            <div>
              <span>Resumen ejecutivo</span>
              <h2>{summary.headline}</h2>
              <p>{summary.narrative}</p>
            </div>

            <div className="impactQuickStats">
              <article>
                <strong>{summary.authorityReadyReports}</strong>
                <span>casos listos para municipio</span>
              </article>
              <article>
                <strong>{summary.criticalZonesDetected}</strong>
                <span>zonas críticas</span>
              </article>
              <article>
                <strong>{summary.essentialDestinationCount}</strong>
                <span>destinos esenciales</span>
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

          <section className="impactTwoColumns">
            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuMapPinned />
                <div>
                  <span>Prioridad territorial</span>
                  <h2>Zonas críticas principales</h2>
                </div>
              </div>

              <div className="impactZoneList">
                {priorityZones.length === 0 ? (
                  <p className="impactEmpty">Aún no hay zonas críticas suficientes.</p>
                ) : (
                  priorityZones.map((zone) => (
                    <article className="impactZone" key={`${zone.lat}-${zone.lng}`}>
                      <div>
                        <strong>{zone.title}</strong>
                        <p>{zone.description}</p>
                      </div>
                      <span>{zone.priorityScore}/100</span>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="impactPanel">
              <div className="impactPanelHeader">
                <LuClipboardCheck />
                <div>
                  <span>Acciones sugeridas</span>
                  <h2>Qué hacer primero</h2>
                </div>
              </div>

              <div className="impactActionList">
                {actions.map((action) => (
                  <article className="impactAction" key={action.title}>
                    <div>
                      <strong>{action.title}</strong>
                      <p>{action.description}</p>
                    </div>
                    <small>{action.owner} · {action.urgency}</small>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="essentialDestinationsSection">
            <div className="impactPanelHeader">
              <LuRoute />
              <div>
                <span>Modo destino esencial</span>
                <h2>Servicios públicos priorizados</h2>
              </div>
            </div>

            <div className="destinationGrid">
              {destinations.map((destination) => (
                <article className="destinationCard" key={destination.key}>
                  <span className="destinationIcon">{destination.icon}</span>
                  <h3>{destination.name}</h3>
                  <p>{destination.whyImportant}</p>
                  <div>
                    <span>{destination.categoryLabel}</span>
                    <span>{destination.estimatedDemandLabel}</span>
                    <span>{destination.recommendedMobilityProfileLabel}</span>
                  </div>
                </article>
              ))}
            </div>

            <Link to="/mapa" className="impactCta">
              Probar una ruta a destino esencial
            </Link>
          </section>
        </>
      ) : (
        <section className="impactLoading">No se pudieron cargar métricas.</section>
      )}
    </main>
  );
}

export default Impacto;
