import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="heroContent">
          <span className="badge">HackFox 2026 · Tijuana Sin Barreras</span>

          <h1>Rutas accesibles para moverse con más seguridad en Tijuana</h1>

          <p className="heroText">
            HackFox es una plataforma colaborativa que permite reportar barreras
            físicas como banquetas destruidas, rampas bloqueadas, obstáculos y
            zonas difíciles de transitar. Con estos reportes, ayudamos a construir
            un mapa vivo de accesibilidad urbana.
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

        <div className="heroCard">
          <h2>Mapa vivo</h2>
          <p>
            Los reportes ciudadanos ayudan a identificar zonas problemáticas en
            tiempo real para planear trayectos más seguros.
          </p>

          <div className="statusList">
            <div>
              <strong>+170,000</strong>
              <span>personas afectadas</span>
            </div>

            <div>
              <strong>Tiempo real</strong>
              <span>reportes actualizados</span>
            </div>

            <div>
              <strong>Accesible</strong>
              <span>interfaz simple</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>¿Qué puedes hacer con HackFox?</h2>

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
              Explora los reportes realizados por la comunidad y ayuda a mantener
              actualizado el mapa de accesibilidad de la ciudad.
            </p>
          </article>

          <article className="featureCard">
            <div className="icon">♿</div>
            <h3>Diseño accesible</h3>
            <p>
              La plataforma está pensada para adultos mayores, personas con
              discapacidad motriz y familias que necesitan trayectos más seguros.
            </p>
          </article>
        </div>
      </section>

      <section className="mission">
        <div>
          <h2>Una ciudad más accesible empieza con datos reales</h2>
          <p>
            Cada reporte ayuda a visibilizar problemas que muchas veces pasan
            desapercibidos. HackFox convierte la participación ciudadana en
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