import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./CrearReporte.css";

function CrearReporte() {
  const [tipo, setTipo] = useState("");
  const [severidad, setSeveridad] = useState("media");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  function manejarFoto(e) {
    const archivo = e.target.files[0];

    if (!archivo) return;

    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
    setResultado(null);
  }

  function obtenerUbicacion() {
    setMensaje("Obteniendo ubicación...");

    if (!navigator.geolocation) {
      setMensaje("Tu navegador no permite obtener ubicación.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUbicacion({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        });

        setMensaje("Ubicación obtenida correctamente.");
      },
      () => {
        setMensaje("No se pudo obtener la ubicación. Permite el acceso a ubicación o intenta de nuevo.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  }

  function limpiarFormulario() {
    setTipo("");
    setSeveridad("media");
    setDescripcion("");
    setFoto(null);
    setPreview(null);
    setUbicacion(null);
  }

  async function enviarReporte(e) {
    e.preventDefault();
    setResultado(null);

    if (!ubicacion) {
      setMensaje("Primero obtén la ubicación del reporte.");
      return;
    }

    if (!foto && (!tipo || !descripcion)) {
      setMensaje("Sin foto debes completar el tipo de barrera y la descripción.");
      return;
    }

    const formData = new FormData();
    formData.append("latitude", ubicacion.latitud);
    formData.append("longitude", ubicacion.longitud);

    if (tipo) formData.append("type", tipo);
    if (descripcion) formData.append("description", descripcion);
    if (severidad) formData.append("severity", severidad);

    if (foto) {
      formData.append("image", foto);
      formData.append("useGemini", "true");
    }

    setEnviando(true);
    setMensaje(foto ? "Analizando imagen con Gemini y guardando reporte..." : "Guardando reporte...");

    try {
      const endpoint = foto ? "/api/reports/analyze-and-create" : "/api/reports";
      const response = await api.post(endpoint, formData);
      const payload = response.data;
      const report = payload.report || payload;

      setResultado({
        report,
        vision: payload.vision || null,
        geminiRequested: Boolean(payload.geminiRequested),
        geminiSucceeded: Boolean(payload.geminiSucceeded),
        message: payload.message || "Reporte creado correctamente.",
      });

      setMensaje(payload.message || "Reporte creado correctamente.");
      limpiarFormulario();
    } catch (err) {
      setMensaje(getApiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="reportPage">
      <section className="reportHero">
        <div>
          <span className="reportBadge">Reporte ciudadano</span>
          <h1>Reporta una barrera física</h1>
          <p>
            Ayuda a construir un mapa vivo de accesibilidad. Registra banquetas
            rotas, rampas bloqueadas, obstáculos o zonas difíciles para que otras
            personas puedan planear trayectos más seguros.
          </p>
        </div>
      </section>

      <section className="reportLayout">
        <form className="reportForm" onSubmit={enviarReporte}>
          <div className="formGroup">
            <label>Tipo de barrera</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Selecciona una opción o deja que Gemini sugiera</option>
              <option value="sidewalk_damage">Banqueta rota</option>
              <option value="blocked_ramp">Rampa bloqueada</option>
              <option value="missing_ramp">Falta de rampa</option>
              <option value="obstacle">Obstáculo en el camino</option>
              <option value="stairs">Escalón sin rampa</option>
              <option value="unsafe_crossing">Cruce inseguro</option>
              <option value="construction">Obra o reparación</option>
              <option value="transport_issue">Problema de transporte</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="formGroup">
            <label>Nivel de severidad</label>

            <div className="severityOptions">
              <button
                type="button"
                className={severidad === "baja" ? "severity active" : "severity"}
                onClick={() => setSeveridad("baja")}
              >
                Baja
              </button>

              <button
                type="button"
                className={severidad === "media" ? "severity active" : "severity"}
                onClick={() => setSeveridad("media")}
              >
                Media
              </button>

              <button
                type="button"
                className={severidad === "alta" ? "severity active" : "severity"}
                onClick={() => setSeveridad("alta")}
              >
                Alta
              </button>
            </div>
          </div>

          <div className="formGroup">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ejemplo: La banqueta está rota y una silla de ruedas no puede pasar. Si subes foto, Gemini puede sugerirla."
              rows="5"
            />
          </div>

          <div className="formGroup">
            <label>Fotografía del lugar</label>

            <label className="photoBox">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={manejarFoto}
              />

              {preview ? (
                <img src={preview} alt="Vista previa del reporte" />
              ) : (
                <div>
                  <strong>Subir o tomar foto</strong>
                  <span>Con foto se usará Gemini para sugerir tipo y severidad</span>
                </div>
              )}
            </label>
          </div>

          <div className="formGroup">
            <label>Ubicación</label>

            <button type="button" className="locationButton" onClick={obtenerUbicacion} disabled={enviando}>
              Obtener ubicación actual
            </button>

            {ubicacion && (
              <div className="locationInfo">
                <p>
                  <strong>Latitud:</strong> {ubicacion.latitud.toFixed(6)}
                </p>
                <p>
                  <strong>Longitud:</strong> {ubicacion.longitud.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {mensaje && <p className={mensaje.toLowerCase().includes("error") || mensaje.toLowerCase().includes("no se") ? "message errorMessage" : "message"}>{mensaje}</p>}

          <button type="submit" className="submitButton" disabled={enviando}>
            {enviando ? "Enviando..." : foto ? "Analizar y enviar reporte" : "Enviar reporte"}
          </button>

          {resultado && (
            <section className="createdReportCard">
              <h2>Reporte creado</h2>
              <p>{resultado.message}</p>
              <div className="createdReportMeta">
                <span>ID: {resultado.report.id}</span>
                <span>{resultado.report.typeLabel}</span>
                <span>Severidad: {resultado.report.severityLabel}</span>
              </div>

              {resultado.vision && (
                <div className="geminiBox">
                  <strong>Gemini detectó:</strong>
                  <p>{resultado.vision.summary}</p>
                  <small>{resultado.vision.accessibilityImpact}</small>
                </div>
              )}

              {resultado.report.imageUrl && (
                <img className="createdReportImage" src={getImageUrl(resultado.report.imageUrl)} alt="Imagen del reporte creado" />
              )}

              <div className="createdReportActions">
                <Link to="/mapa">Ver en mapa</Link>
                <Link to="/reportes">Ver reportes</Link>
              </div>
            </section>
          )}
        </form>

        <aside className="reportTips">
          <h2>Consejos para un buen reporte</h2>

          <div className="tipCard">
            <span>1</span>
            <p>Toma una foto clara donde se vea la barrera física.</p>
          </div>

          <div className="tipCard">
            <span>2</span>
            <p>Describe cómo afecta el paso de una persona con movilidad reducida.</p>
          </div>

          <div className="tipCard">
            <span>3</span>
            <p>Usa la ubicación actual para que el reporte aparezca en el mapa.</p>
          </div>

          <div className="tipCard">
            <span>4</span>
            <p>Marca la severidad según el nivel de riesgo o dificultad.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default CrearReporte;
