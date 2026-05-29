import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
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