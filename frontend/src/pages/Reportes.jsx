import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./Reportes.css";

function getSeverityFilterValue(value) {
  if (value === "alta") return 3;
  if (value === "media") return 2;
  if (value === "baja") return 1;
  return undefined;
}

function getSeverityClass(severity) {
  if (Number(severity) === 3 || severity === "alta") return "severityBadge high";
  if (Number(severity) === 2 || severity === "media") return "severityBadge medium";
  return "severityBadge low";
}

function getStatusClass(status) {
  if (status === "active") return "statusBadge confirmed";
  if (status === "resolved") return "statusBadge review";
  return "statusBadge new";
}

function formatCoordinates(report) {
  const lat = Number(report.latitude);
  const lng = Number(report.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Sin coordenadas";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function Reportes() {
  const [reportes, setReportes] = useState([]);
  const [stats, setStats] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState(null);
  const [mensaje, setMensaje] = useState("");

  const severidadParametro = useMemo(() => getSeverityFilterValue(filtroSeveridad), [filtroSeveridad]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensaje("");

    try {
      const [reportsResponse, statsResponse] = await Promise.all([
        api.get("/api/reports", {
          params: {
            search: busqueda || undefined,
            minSeverity: severidadParametro,
            maxSeverity: severidadParametro,
            limit: 200,
          },
        }),
        api.get("/api/stats"),
      ]);

      setReportes(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
      setStats(statsResponse.data);
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [busqueda, severidadParametro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 250);

    return () => clearTimeout(timer);
  }, [cargarDatos]);

  async function confirmarReporte(id) {
    setAccionandoId(id);
    setMensaje("");

    try {
      await api.post(`/api/reports/${id}/confirm`);
      setMensaje("Reporte confirmado correctamente.");
      await cargarDatos();
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setAccionandoId(null);
    }
  }

  async function rechazarReporte(id) {
    setAccionandoId(id);
    setMensaje("");

    try {
      await api.post(`/api/reports/${id}/reject`);
      setMensaje("Se registró que la barrera ya no sigue ahí.");
      await cargarDatos();
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setAccionandoId(null);
    }
  }

  async function marcarResuelto(id) {
    setAccionandoId(id);
    setMensaje("");

    try {
      await api.put(`/api/reports/${id}/status`, { status: "resolved" });
      setMensaje("Reporte marcado como resuelto.");
      await cargarDatos();
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setAccionandoId(null);
    }
  }

  const totalReportes = stats?.totalReports ?? reportes.length;
  const reportesAltos = stats?.highSeverityReports ?? reportes.filter((reporte) => Number(reporte.severity) === 3).length;
  const reportesActivos = stats?.activeReports ?? reportes.filter((reporte) => reporte.status === "active").length;

  return (
    <main className="reportsPage">
      <section className="reportsHero">
        <div>
          <span className="reportsBadge">Mapa Actual</span>
          <h1>Reportes Globales</h1>
          <p>
            Consulta las barreras físicas reportadas por la comunidad, estas ayudan a identificar zonas de riesgo.
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
          <span>Prioridad Alta</span>
          <strong>{reportesAltos}</strong>
          <p>barreras críticas activas</p>
        </article>

        <article className="statCard">
          <span>Activos</span>
          <strong>{reportesActivos}</strong>
          <p>reportes pendientes</p>
        </article>
      </section>

      <section className="reportsControls">
        <div className="searchBox">
          <label>Buscar Reporte</label>
          <input
            type="text"
            placeholder="Buscar por tipo o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filterBox">
          <label>Filtrar por Severidad</label>
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

      {mensaje && <div className={mensaje.toLowerCase().includes("error") || mensaje.toLowerCase().includes("no se") ? "reportsMessage reportsMessageError" : "reportsMessage"}>{mensaje}</div>}

      <section className="reportsList">
        {cargando ? (
          <div className="emptyState">
            <h2>Cargando reportes</h2>
            <p>Consultando información del backend...</p>
          </div>
        ) : reportes.length === 0 ? (
          <div className="emptyState">
            <h2>No se encontraron reportes</h2>
            <p>Intenta cambiar la búsqueda o el filtro seleccionado.</p>
          </div>
        ) : (
          reportes.map((reporte) => (
            <article className="reportCard" key={reporte.id}>
              <div className={reporte.imageUrl ? "reportImage withPhoto" : "reportImage"}>
                {reporte.imageUrl ? (
                  <img src={getImageUrl(reporte.imageUrl)} alt={reporte.typeLabel} />
                ) : (
                  <span>{reporte.markerIcon || reporte.typeLabel?.charAt(0) || "R"}</span>
                )}
              </div>

              <div className="reportContent">
                <div className="reportHeader">
                  <div>
                    <h2>{reporte.typeLabel}</h2>
                    <p className="reportLocation">Coordenadas: {formatCoordinates(reporte)}</p>
                  </div>

                  <div className="badgeGroup">
                    <span className={getSeverityClass(reporte.severity)}>
                      {reporte.severityLabel}
                    </span>

                    <span className={getStatusClass(reporte.status)}>
                      {reporte.statusLabel}
                    </span>
                  </div>
                </div>

                <p className="reportDescription">{reporte.description || "Sin descripción."}</p>

                <div className="reportMeta">
                  <span>{reporte.createdAtDisplay || new Date(reporte.createdAt).toLocaleDateString()}</span>
                  <span>Confirmaciones: {reporte.confirmations}</span>
                  <span>Rechazos: {reporte.rejections}</span>
                  <span>ID: {reporte.id}</span>
                </div>

                <div className="reportActions">
                  <button type="button" onClick={() => confirmarReporte(reporte.id)} disabled={accionandoId === reporte.id}>
                    Sigue ahí
                  </button>
                  <button type="button" onClick={() => rechazarReporte(reporte.id)} disabled={accionandoId === reporte.id}>
                    Ya no está
                  </button>
                  <button type="button" onClick={() => marcarResuelto(reporte.id)} disabled={accionandoId === reporte.id || reporte.status === "resolved"}>
                    Marcar como resuelto
                  </button>
                  <Link to={`/mapa?reportId=${reporte.id}`}>Ver en mapa</Link>
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
