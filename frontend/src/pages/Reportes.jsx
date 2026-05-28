import { useMemo, useState } from "react";
import "./Reportes.css";

const reportesIniciales = [
  {
    id: 1,
    tipo: "Banqueta rota",
    severidad: "alta",
    estado: "Confirmado",
    descripcion:
      "La banqueta está destruida y obliga a las personas a bajar a la calle para poder pasar.",
    ubicacion: "Zona Río, Tijuana",
    latitud: 32.5149,
    longitud: -117.0382,
    fecha: "2026-05-28",
    confirmaciones: 8,
  },
  {
    id: 2,
    tipo: "Rampa bloqueada",
    severidad: "media",
    estado: "Nuevo",
    descripcion:
      "La rampa de acceso está bloqueada por un vehículo estacionado frente al cruce peatonal.",
    ubicacion: "Centro, Tijuana",
    latitud: 32.5331,
    longitud: -117.0431,
    fecha: "2026-05-27",
    confirmaciones: 3,
  },
  {
    id: 3,
    tipo: "Sin banqueta",
    severidad: "alta",
    estado: "En revisión",
    descripcion:
      "La calle no cuenta con banqueta segura para personas con silla de ruedas o adultos mayores.",
    ubicacion: "Otay, Tijuana",
    latitud: 32.5327,
    longitud: -116.9646,
    fecha: "2026-05-26",
    confirmaciones: 5,
  },
];

function Reportes() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas");

  const reportesFiltrados = useMemo(() => {
    return reportesIniciales.filter((reporte) => {
      const texto = `${reporte.tipo} ${reporte.descripcion} ${reporte.ubicacion}`.toLowerCase();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase());

      const coincideSeveridad =
        filtroSeveridad === "todas" || reporte.severidad === filtroSeveridad;

      return coincideBusqueda && coincideSeveridad;
    });
  }, [busqueda, filtroSeveridad]);

  function claseSeveridad(severidad) {
    if (severidad === "alta") return "severityBadge high";
    if (severidad === "media") return "severityBadge medium";
    return "severityBadge low";
  }

  function claseEstado(estado) {
    if (estado === "Confirmado") return "statusBadge confirmed";
    if (estado === "En revisión") return "statusBadge review";
    return "statusBadge new";
  }

  return (
    <main className="reportsPage">
      <section className="reportsHero">
        <span className="reportsBadge">Mapa vivo de accesibilidad</span>
        <h1>Reportes globales</h1>
        <p>
          Consulta las barreras físicas reportadas por la comunidad. Estos datos
          ayudan a identificar zonas de riesgo y planear trayectos más seguros.
        </p>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <span>Total</span>
          <strong>{reportesIniciales.length}</strong>
          <p>reportes registrados</p>
        </article>

        <article className="statCard">
          <span>Prioridad alta</span>
          <strong>
            {reportesIniciales.filter((r) => r.severidad === "alta").length}
          </strong>
          <p>barreras críticas</p>
        </article>

        <article className="statCard">
          <span>Validados</span>
          <strong>
            {reportesIniciales.filter((r) => r.estado === "Confirmado").length}
          </strong>
          <p>reportes confirmados</p>
        </article>
      </section>

      <section className="reportsControls">
        <div className="searchBox">
          <label>Buscar reporte</label>
          <input
            type="text"
            placeholder="Buscar por tipo, descripción o zona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filterBox">
          <label>Filtrar por severidad</label>
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
      </section>

      <section className="reportsList">
        {reportesFiltrados.map((reporte) => (
          <article className="reportCard" key={reporte.id}>
            <div className="reportImage">
              <span>{reporte.tipo.charAt(0)}</span>
            </div>

            <div className="reportContent">
              <div className="reportHeader">
                <div>
                  <h2>{reporte.tipo}</h2>
                  <p className="reportLocation">{reporte.ubicacion}</p>
                </div>

                <div className="badgeGroup">
                  <span className={claseSeveridad(reporte.severidad)}>
                    {reporte.severidad}
                  </span>

                  <span className={claseEstado(reporte.estado)}>
                    {reporte.estado}
                  </span>
                </div>
              </div>

              <p className="reportDescription">{reporte.descripcion}</p>

              <div className="reportMeta">
                <span>Fecha: {reporte.fecha}</span>
                <span>Confirmaciones: {reporte.confirmaciones}</span>
                <span>
                  Coordenadas: {reporte.latitud.toFixed(4)},{" "}
                  {reporte.longitud.toFixed(4)}
                </span>
              </div>

              <div className="reportActions">
                <button type="button">Sigue ahí</button>
                <button type="button">Marcar como resuelto</button>
                <button type="button">Ver en mapa</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Reportes;