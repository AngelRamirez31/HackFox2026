import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Home.css";

const fallbackReports = [
  { id: "fallback-1", typeLabel: "Banqueta rota", severity: 3, severityLabel: "Alta", createdAtDisplay: "Reciente" },
  { id: "fallback-2", typeLabel: "Rampa bloqueada", severity: 2, severityLabel: "Media", createdAtDisplay: "Reciente" },
  { id: "fallback-3", typeLabel: "Sin rampa", severity: 3, severityLabel: "Alta", createdAtDisplay: "Reciente" },
  { id: "fallback-4", typeLabel: "Obstáculo en paso", severity: 1, severityLabel: "Baja", createdAtDisplay: "Reciente" },
  { id: "fallback-5", typeLabel: "Cruce inseguro", severity: 2, severityLabel: "Media", createdAtDisplay: "Reciente" },
];

function getSeverityClass(report) {
  const severity = Number(report.severity);
  if (severity === 3 || report.severityLabel?.toLowerCase() === "alta") return "high";
  if (severity === 2 || report.severityLabel?.toLowerCase() === "media") return "medium";
  return "low";
}

function Home() {
  const [stats, setStats] = useState(null);
  const [latestReports, setLatestReports] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadHomeData = useCallback(async () => {
    setLoadingData(true);

    try {
      const [statsResponse, reportsResponse] = await Promise.all([
        api.get("/api/stats"),
        api.get("/api/reports", {
          params: {
            status: "active",
            limit: 5,
          },
        }),
      ]);

      setStats(statsResponse.data);
      setLatestReports(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
    } catch {
      setStats(null);
      setLatestReports([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const tickerReports = useMemo(() => {
    const reports = latestReports.length > 0 ? latestReports : fallbackReports;
    return [...reports, ...reports];
  }, [latestReports]);

  const totalReports = stats?.totalReports ?? latestReports.length;
  const highPriorityReports = stats?.highSeverityReports ?? latestReports.filter((report) => Number(report.severity) === 3).length;
  const activeReports = stats?.activeReports ?? latestReports.length;

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
              {loadingData ? "Cargando" : "En vivo"}
            </span>
          </div>

          <p className="tickerDescription">
            Reportes ciudadanos actualizados desde el backend para identificar
            barreras físicas y planear trayectos más seguros.
          </p>

          <div className="tickerWindow">
            <div className="tickerTrack">
              {tickerReports.map((report, index) => (
                <div className={`tickerItem ${getSeverityClass(report)}`} key={`${report.id}-${index}`}>
                  <span>{report.severityLabel || "Media"}</span>
                  <strong>{report.typeLabel || report.title || "Reporte"}</strong>
                  <p>{report.createdAtDisplay || "Reciente"}</p>
                </div>
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
              <strong>{activeReports}</strong>
              <span>reportes activos</span>
            </div>
          </div>
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
