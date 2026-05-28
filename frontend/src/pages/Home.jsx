import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  const latidosItems = [
    {
      badge: "Bache",
      badgeClass: "badge-warning",
      icon: "warning",
      time: "Hace 5m",
      title: "Hoyo profundo en Av. Revolución",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC4QOXCGTQIn8o__R055pqNwJK0dgBym_krvF-p3L27blrB-Cqbw0YxGJtIQb1XhJUz3AMJ4-M7jRA6d_0KI0saI-aDoSD7q3rrClwdX5sj33rXpW8VDCyAQYdmDfzWHkcRYe5vqCxwIsBZkqYWwVivIBc9tNKqCTJYK1j66iuU-MDxXLDitt530zJvBefvszZlzEj7iOvhOGcCo5JoDMyfbrooSSsqFJgqJMcAFyVm7m3-51XZgXvi9wMe9aD9Z6-69ku2MDHWVAE",
      user: "@carlos_tj",
    },
    {
      badge: "Mejora",
      badgeClass: "badge-primary",
      icon: "park",
      time: "Hace 12m",
      title: "Plantando árboles en el parque",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA6FHm2-B2U1R7G5fI2qvXYBNv1qN7aiPV7o_dgUza2pVujsxMMIai5K3hQn1bV8a1TOyLxnoqDLgOSBFm_jLZ7nEmv2hY1LQ3JNvO9CbL-N_JgyTniNKDfZNFINN5Mvrm4aqJVCMyrw5Dhu1ksgmIqGT1PRCgsPTNhy8vxc-c2K27vAPeiR50oMkPw0O1i9V05PUXjqBrORA8FN7-dubWCoBqdYItxZN07AZBrqdiptnh1BLfOXdBxW4uMv-qRGmLURR4ciKKeRzk",
      user: "@ana_verde",
    },
    {
      badge: "Alumbrado",
      badgeClass: "badge-error",
      icon: "lightbulb",
      time: "Hace 1h",
      title: "Lámpara fundida en calle 4ta",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCTb7190a0xSgGF3Q0koXhy3mtQK9cayZPj99yGsr9T0XjQpU6qiAxhzTld_yps8u_BpYwAN1LVWYKetNxYxQ36_aVJ-xeNUsZv4krPTCtxQFzjmbNdOaU1rQH4OaxaH0aQgYfPklUFxQcablSOnuNZUGKSgIHdf0wTbSw3JOMkNemZzhAw_ppxBLsirlQbe_v_ZMiLXcfNFP1F5wanMVGALkiwEQMnrIAcD03rv-spZ4kErGrCTJnlx8fXl_ijCjxMrmRLr8esdA8",
      user: "@luis_m",
    },
    {
      badge: "Evento",
      badgeClass: "badge-secondary",
      icon: "celebration",
      time: "Hace 2h",
      title: "Mercado sobre ruedas cultural",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD_cEXbGsgp5V2f8YFIee4poyODLdFt-25w9mhjo_qNq6Gf9E5PXmxe0yjzLPw9t3QaE9zh6dzska0Z9yRTHSWiWBKHWGXkdi8UO3lP-Lgoruy4UK2-4Oj_S1nkStyxwgEFs4jly0DyST6Kzy85nX9RJcKSGmGxRdfShvospX733rkXTzb4rd94meSmRrpQPziWafbT_uUOsSTDl5wxzwg6RmbXLAgWxfIuTnC8sqmT0UMaeEae2jeVYMgQpgigDtkBZ6NDQrAShtQ",
      user: "@colectivo_sur",
    },
  ];

  const latidosLoop = [...latidosItems, ...latidosItems];

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
              En vivo
            </span>
          </div>

          <p className="tickerDescription">
            Reportes ciudadanos actualizados para identificar barreras físicas y
            planear trayectos más seguros.
          </p>

          <div className="tickerWindow">
            <div className="tickerTrack">
              <div className="tickerItem high">
                <span>Alta</span>
                <strong>Banqueta rota</strong>
                <p>Zona Río · hace 4 min</p>
              </div>

              <div className="tickerItem medium">
                <span>Media</span>
                <strong>Rampa bloqueada</strong>
                <p>Centro · hace 12 min</p>
              </div>

              <div className="tickerItem high">
                <span>Alta</span>
                <strong>Sin banqueta</strong>
                <p>Otay · hace 20 min</p>
              </div>

              <div className="tickerItem low">
                <span>Baja</span>
                <strong>Obstáculo en paso</strong>
                <p>Playas · hace 31 min</p>
              </div>

              <div className="tickerItem medium">
                <span>Media</span>
                <strong>Cruce inseguro</strong>
                <p>La Mesa · hace 44 min</p>
              </div>

              <div className="tickerItem high">
                <span>Alta</span>
                <strong>Banqueta rota</strong>
                <p>Zona Río · hace 4 min</p>
              </div>

              <div className="tickerItem medium">
                <span>Media</span>
                <strong>Rampa bloqueada</strong>
                <p>Centro · hace 12 min</p>
              </div>

              <div className="tickerItem high">
                <span>Alta</span>
                <strong>Sin banqueta</strong>
                <p>Otay · hace 20 min</p>
              </div>

              <div className="tickerItem low">
                <span>Baja</span>
                <strong>Obstáculo en paso</strong>
                <p>Playas · hace 31 min</p>
              </div>

              <div className="tickerItem medium">
                <span>Media</span>
                <strong>Cruce inseguro</strong>
                <p>La Mesa · hace 44 min</p>
              </div>
            </div>
          </div>

          <div className="tickerSummary">
            <div>
              <strong>24</strong>
              <span>reportes hoy</span>
            </div>

            <div>
              <strong>7</strong>
              <span>prioridad alta</span>
            </div>

            <div>
              <strong>3</strong>
              <span>zonas críticas</span>
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
        <section className="latidos-section" aria-labelledby="latidos-title">
          <div className="latidos-header">
            <h2 id="latidos-title">Latidos de la Calle</h2>
            <Link to="/mapa">Ver Mapa</Link>
          </div>

          <div className="latidos-carousel-wrapper">
            <div className="latidos-carousel-track">
              {latidosLoop.map((item, index) => (
                <article
                  className="latidos-card"
                  key={`${item.badge}-${index}`}
                  aria-hidden={index >= latidosItems.length}
                >
                  <div className="latidos-card-top">
                    <span className={`latidos-badge ${item.badgeClass}`}>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.badge}
                    </span>
                    <span className="latidos-time">{item.time}</span>
                  </div>

                  <h4>{item.title}</h4>

                  <div className="latidos-user">
                    <img
                      className="latidos-avatar"
                      src={item.avatar}
                      alt={`Avatar de ${item.user}`}
                    />
                    <span>Por {item.user}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
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
