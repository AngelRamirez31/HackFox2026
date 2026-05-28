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
  {
    id: 4,
    tipo: "Obstáculo en el camino",
    severidad: "baja",
    estado: "Confirmado",
    descripcion:
      "Hay objetos sobre el paso peatonal que dificultan el tránsito, pero se puede pasar con precaución.",
    ubicacion: "Playas de Tijuana",
    latitud: 32.5267,
    longitud: -117.1206,
    fecha: "2026-05-25",
    confirmaciones: 2,
  },
];

function Reportes() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas");

  const reportesFiltrados = useMemo(() => {
    return reportesIniciales.filter((reporte) => {
      const coincideBusqueda =
        reporte.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        reporte.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        reporte.ubicacion.toLowerCase().includes(busqueda.toLowerCase());

      const coincideSeveridad =
        filtroSeveridad === "todas" || reporte.severidad === filtroSeveridad;

      return coincideBusqueda && coincideSeveridad;
    });
  }, [busqueda, filtroSeveridad]);

  const totalReportes = reportesIniciales.length;
  const reportesAltos = reportesIniciales.filter(
    (reporte) => reporte.severidad === "alta"
  ).length;
  const reportesConfirmados = reportesIniciales.filter(
    (reporte) => reporte.estado === "Confirmado"
  ).length;

  function obtenerClaseSeveridad(severidad) {
    if (severidad === "alta") return "severityBadge high";
    if (severidad === "media") return "severityBadge medium";
    return "severityBadge low";
  }

  function obtenerClaseEstado(estado) {
    if (estado === "Confirmado") return "statusBadge confirmed";
    if (estado === "En revisión") return "statusBadge review";
    return "statusBadge new";
  }

  return (
    <main className="reportsPage">
      <section className="reportsHero">
        <div>
          <span className="reportsBadge">Mapa Actual</span>
          <h1>Reportes globales</h1>
          <p>
            Consulta las barreras físicas reportadas por la comunidad. Estos
            datos ayudan a identificar zonas de riesgo y planear trayectos más
            seguros para personas con movilidad reducida.
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
          <strong>{reportesAltos}</strong>
          <p>barreras críticas</p>
        </article>

        <article className="statCard">
          <span>Validados</span>
          <strong>{reportesConfirmados}</strong>
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
        {reportesFiltrados.length === 0 ? (
          <div className="emptyState">
            <h2>No se encontraron reportes</h2>
            <p>Intenta cambiar la búsqueda o el filtro seleccionado.</p>
          </div>
        ) : (
          reportesFiltrados.map((reporte) => (
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
                    <span className={obtenerClaseSeveridad(reporte.severidad)}>
                      {reporte.severidad}
                    </span>

                    <span className={obtenerClaseEstado(reporte.estado)}>
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
          ))
        )}
      </section>
    </main>
  );
}

export default Reportes;