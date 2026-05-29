import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Home.css";

function Home() {
  const [summary, setSummary] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const reviewItems = [
    {
      badge: "Acceso",
      badgeClass: "badge-primary",
      icon: "♿",
      time: "Hace 5 min",
      title: "Rampa libre cerca de Zona Río",
      user: "@carlos_tj",
    },
    {
      badge: "Alerta",
      badgeClass: "badge-warning",
      icon: "⚠️",
      time: "Hace 12 min",
      title: "Banqueta dañada en cruce principal",
      user: "@ana_verde",
    },
    {
      badge: "Ruta",
      badgeClass: "badge-success",
      icon: "📍",
      time: "Hace 25 min",
      title: "Trayecto recomendado hacia el parque",
      user: "@luis_m",
    },
    {
      badge: "Reporte",
      badgeClass: "badge-error",
      icon: "🚧",
      time: "Hace 1 h",
      title: "Obstáculo bloqueando paso peatonal",
      user: "@colectivo_sur",
    },
  ];

  const reviewLoop = [...reviewItems, ...reviewItems];

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      setLoadingSummary(true);

      try {
        const [summaryResponse, hotspotsResponse] = await Promise.all([
          api.get("/api/dashboard/summary", {
            params: { recentLimit: 5, hotspotLimit: 3 },
          }),
          api.get("/api/reports/hotspots", {
            params: { limit: 3 },
          }),
        ]);

        if (!active) return;

        setSummary(summaryResponse.data);
        setHotspots(
          Array.isArray(hotspotsResponse.data) ? hotspotsResponse.data : []
        );
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

  const totalReports = loadingSummary ? "..." : summary?.totalReports ?? 24;
  const highPriorityReports = loadingSummary
    ? "..."
    : summary?.highPriorityReports ?? 7;
  const hotspotCount = loadingSummary
    ? "..."
    : hotspots.length || summary?.topHotspots?.length || 3;

  return (
    <main className="home">
      <section className="hero">
        <div className="heroContent">
          <span className="badge">Tijuana Sin Barreras</span>

          <h1>Planea tu camino, evita obstáculos</h1>

          <p className="heroText">
            Streets-H es una plataforma colaborativa que permite reportar
            barreras físicas como banquetas destruidas, rampas bloqueadas,
            obstáculos y zonas difíciles de transitar.
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
          <div className="tickerTop">
            <span className="tickerLabel">
              <span className="livePulse"></span>
              Actividad reciente
            </span>
          </div>

          <div className="tickerHeader">
            <h2>Últimos reportes</h2>
          </div>

          <p className="tickerDescription">
            Reportes ciudadanos para identificar barreras físicas y planear
            trayectos más seguros.
          </p>

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
              <span>{summary.activeReports ?? 0} activos</span>
              <span>{summary.reportsWithImages ?? 0} con foto</span>
              <span>
                {summary.mostCommonBarrierLabel || "Sin barrera dominante"}
              </span>
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
              Pensado para adultos mayores, personas con discapacidad motriz y
              familias que necesitan trayectos más seguros.
            </p>
          </article>
        </div>
      </section>

      <section className="reviewsSection" aria-labelledby="reviews-title">
        <div className="reviewsHeader">
          <div>
            <span>Comunidad activa</span>
            <h2 id="reviews-title">Reviews más relevantes</h2>
          </div>

          <Link to="/mapa">Ver mapa</Link>
        </div>

        <div className="reviewsCarouselWrapper">
          <div className="reviewsCarouselTrack">
            {reviewLoop.map((item, index) => (
              <article
                className="reviewCard"
                key={`${item.badge}-${index}`}
                aria-hidden={index >= reviewItems.length}
              >
                <div className="reviewTop">
                  <span className={`reviewBadge ${item.badgeClass}`}>
                    <span>{item.icon}</span>
                    {item.badge}
                  </span>

                  <span className="reviewTime">{item.time}</span>
                </div>

                <h4>{item.title}</h4>

                <div className="reviewUser">
                  <div className="reviewAvatar">
                    {item.user.charAt(1).toUpperCase()}
                  </div>
                  <span>Por {item.user}</span>
                </div>
              </article>
            ))}
          </div>
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