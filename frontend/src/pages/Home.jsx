import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Home.css";

const fallbackReports = [
  { id: "fallback-1", severity: 3, severityLabel: "Alta", typeLabel: "Banqueta rota", createdAtDisplay: "Demo" },
  { id: "fallback-2", severity: 2, severityLabel: "Media", typeLabel: "Rampa bloqueada", createdAtDisplay: "Demo" },
  { id: "fallback-3", severity: 3, severityLabel: "Alta", typeLabel: "Falta de rampa", createdAtDisplay: "Demo" },
  { id: "fallback-4", severity: 1, severityLabel: "Baja", typeLabel: "Obstáculo en paso", createdAtDisplay: "Demo" },
  { id: "fallback-5", severity: 2, severityLabel: "Media", typeLabel: "Cruce inseguro", createdAtDisplay: "Demo" },
];

function getTickerSeverityClass(report) {
  if (Number(report.severity) >= 3) return "high";
  if (Number(report.severity) === 2) return "medium";
  return "low";
}

function Home() {
  const [summary, setSummary] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      setLoadingSummary(true);

      try {
        const [summaryResponse, hotspotsResponse] = await Promise.all([
          api.get("/api/dashboard/summary", { params: { recentLimit: 5, hotspotLimit: 3 } }),
          api.get("/api/reports/hotspots", { params: { limit: 3 } }),
        ]);

        if (!active) return;
        setSummary(summaryResponse.data);
        setHotspots(Array.isArray(hotspotsResponse.data) ? hotspotsResponse.data : []);
      } catch {
        if (!active) return;
        setSummary(null);
        setHotspots([]);
      } finally {
        if (active) setLoadingSummary(false);
      }
    }

    loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const recentReports = useMemo(() => {
    const reports = summary?.recentReports?.length ? summary.recentReports : fallbackReports;
    return [...reports, ...reports];
  }, [summary]);

  const totalReports = summary?.totalReports ?? "--";
  const highPriorityReports = summary?.highPriorityReports ?? "--";
  const hotspotCount = hotspots.length || summary?.topHotspots?.length || 0;

  return (
    <main className="home">
      <section className="hero">
        <div className="heroContent">
          <span className="badge">HackFox 2026 · Tijuana Sin Barreras</span>

          <h1>Planea tu camino, evita obstáculos</h1>

          <p className="heroText">
            Streets-H es una plataforma colaborativa que permite reportar
            barreras físicas como banquetas destruidas, rampas bloqueadas,
            obstáculos y zonas difíciles de transitar. Con estos reportes,
            ayudamos a construir un mapa vivo de accesibilidad urbana.
          </p>

          <div className="heroButtons">
            <Link to="/mapa" className="primaryButton">
              Ver mapa accesible
            </Link>

            <Link to="/crear-reporte" className="secondaryButton">
              Reportar una barrera
            </Link>
          </div>
        </div>

        <div className="heroCard reportsTickerCard">
          <div className="tickerHeader">
            <div>
              <span className="tickerLabel">Actividad reciente</span>
              <h2>Últimos reportes</h2>
            </div>

            <span className="liveBadge">
              <span className="livePulse"></span>
              {loadingSummary ? "Cargando" : "En vivo"}
            </span>
          </div>

          <p className="tickerDescription">
            Reportes ciudadanos actualizados desde el backend para identificar barreras físicas y
            planear trayectos más seguros.
          </p>

          <div className="tickerWindow">
            <div className="tickerTrack">
              {recentReports.map((report, index) => (
                <Link
                  to={report.id?.toString().startsWith("fallback") ? "/reportes" : `/mapa?reportId=${report.id}`}
                  className={`tickerItem ${getTickerSeverityClass(report)}`}
                  key={`${report.id}-${index}`}
                >
                  <span>{report.severityLabel || "Media"}</span>
                  <strong>{report.typeLabel || "Reporte"}</strong>
                  <p>{report.createdAtDisplay || "Reciente"}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="tickerSummary">
            <div>
              <strong>{totalReports}</strong>
              <span>reportes totales</span>
            </div>

            <div>
              <strong>{highPriorityReports}</strong>
              <span>prioridad alta</span>
            </div>

            <div>
              <strong>{hotspotCount}</strong>
              <span>zonas críticas</span>
            </div>
          </div>

          {summary && (
            <div className="homeLiveSummary">
              <span>{summary.activeReports} activos</span>
              <span>{summary.reportsWithImages} con foto</span>
              <span>{summary.mostCommonBarrierLabel || "Sin barrera dominante"}</span>
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <h2>¿Qué puedes hacer con Streets-H?</h2>

        <div className="featureGrid">
          <article className="featureCard">
            <div className="icon">📍</div>
            <h3>Planear trayectos</h3>
            <p>
              Consulta el mapa para identificar rutas con menos obstáculos y
              evitar zonas reportadas como peligrosas o inaccesibles.
            </p>
          </article>

          <article className="featureCard">
            <div className="icon">📷</div>
            <h3>Reportar barreras</h3>
            <p>
              Toma una fotografía, confirma la ubicación y registra el tipo de
              barrera física para que otros usuarios puedan verla.
            </p>
          </article>

          <article className="featureCard">
            <div className="icon">🌎</div>
            <h3>Ver reportes globales</h3>
            <p>
              Explora los reportes realizados por la comunidad y ayuda a
              mantener actualizado el mapa de accesibilidad de la ciudad.
            </p>
          </article>

          <article className="featureCard">
            <div className="icon">♿</div>
            <h3>Diseño accesible</h3>
            <p>
              La plataforma está pensada para adultos mayores, personas con
              discapacidad motriz y familias que necesitan trayectos más
              seguros.
            </p>
          </article>
        </div>
      </section>

      <section className="mission">
        <div>
          <h2>Una ciudad más accesible empieza con datos reales</h2>
          <p>
            Cada reporte ayuda a visibilizar problemas que muchas veces pasan
            desapercibidos. Streets-H convierte la participación ciudadana en
            información útil para mejorar la movilidad urbana.
          </p>
        </div>

        <Link to="/crear-reporte" className="missionButton">
          Crear primer reporte
        </Link>
      </section>
    </main>
  );
}

export default Home;
