<<<<<<< HEAD
import { useRef, useState } from "react";
=======
>>>>>>> dea9cf967ec9136605aa4980794568b398c9304e
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./CrearReporte.css";

const fallbackReportTypes = [
  { value: "sidewalk_damage", label: "Banqueta rota" },
  { value: "blocked_ramp", label: "Rampa bloqueada" },
  { value: "missing_ramp", label: "Falta de rampa" },
  { value: "obstacle", label: "Obstáculo en el camino" },
  { value: "stairs", label: "Escalón sin rampa" },
  { value: "unsafe_crossing", label: "Cruce inseguro" },
  { value: "construction", label: "Obra o reparación" },
  { value: "transport_issue", label: "Problema de transporte" },
  { value: "other", label: "Otro" },
];

const fallbackSeverities = [
  { value: 1, label: "Baja" },
  { value: 2, label: "Media" },
  { value: 3, label: "Alta" },
];

function CrearReporte() {
  const [tipo, setTipo] = useState("");
  const [severidad, setSeveridad] = useState("2");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
<<<<<<< HEAD
  const fotoInputRef = useRef(null);

  const reportTips = [
    {
      id: 1,
      title: "Foto clara",
      text: "Toma una foto donde se vea la barrera física.",
    },
    {
      id: 2,
      title: "Impacto real",
      text: "Describe cómo afecta el paso de una persona con movilidad reducida.",
    },
    {
      id: 3,
      title: "Ubicación",
      text: "Usa la ubicación actual para que el reporte aparezca en el mapa.",
    },
    {
      id: 4,
      title: "Severidad",
      text: "Marca el nivel de riesgo o dificultad.",
    },
  ];
=======
>>>>>>> dea9cf967ec9136605aa4980794568b398c9304e
  const [config, setConfig] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);

  const reportTypes = useMemo(() => config?.reports?.types || fallbackReportTypes, [config]);
  const severities = useMemo(() => config?.reports?.severities || fallbackSeverities, [config]);
  const maxImageSize = config?.uploads?.maxImageSizeMb || 5;

  const cargarConfig = useCallback(async () => {
    setCargandoConfig(true);

    try {
      const response = await api.get("/api/app/config");
      setConfig(response.data);
    } catch {
      setConfig(null);
    } finally {
      setCargandoConfig(false);
    }
  }, []);

  useEffect(() => {
    cargarConfig();
  }, [cargarConfig]);

  function manejarFoto(e) {
    const archivo = e.target.files[0];

    if (!archivo) return;

<<<<<<< HEAD
    if (preview) URL.revokeObjectURL(preview);
=======
>>>>>>> dea9cf967ec9136605aa4980794568b398c9304e
    if (archivo.size > maxImageSize * 1024 * 1024) {
      setMensaje(`La imagen no puede pesar más de ${maxImageSize} MB.`);
      e.target.value = "";
      return;
    }

    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
    setResultado(null);
  }

  function limpiarFoto() {
    if (preview) URL.revokeObjectURL(preview);

    setFoto(null);
    setPreview(null);
    setResultado(null);

    if (fotoInputRef.current) {
      fotoInputRef.current.value = "";
    }
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
    if (preview) URL.revokeObjectURL(preview);

    setTipo("");
    setSeveridad("2");
    setDescripcion("");
    setFoto(null);
    setPreview(null);
    setUbicacion(null);

    if (fotoInputRef.current) {
      fotoInputRef.current.value = "";
    }
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
              {reportTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.markerIcon ? `${option.markerIcon} ` : ""}{option.label}
                </option>
              ))}
            </select>
            {cargandoConfig && <small className="fieldHint">Cargando opciones desde el backend...</small>}
          </div>

          <div className="formGroup">
            <label>Nivel de severidad</label>

            <div className="severityOptions">
              {severities.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={String(severidad) === String(option.value) ? "severity active" : "severity"}
                  onClick={() => setSeveridad(String(option.value))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formGroup">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ejemplo: La banqueta está rota y una silla de ruedas no puede pasar. Si subes foto, Gemini puede sugerirla."
              rows="5"
              maxLength={300}
            />
            <small className="fieldHint">{descripcion.length}/300 caracteres</small>
          </div>

          <div className="formGroup">
            <label>Fotografía del lugar</label>

            <div className="photoGuidedUpload">
              {reportTips.map((tip) => (
                <article className={`photoInlineTip tipPosition${tip.id}`} key={tip.id}>
                  <div className="photoInlineTipNumber" aria-hidden="true">
                    {tip.id}
                  </div>

                  <div>
                    <p>{tip.title}</p>
                    <span>{tip.text}</span>
                  </div>
                </article>
              ))}

              <div className="photoUploader">
              <label className={foto ? "photoUploadHeader hasFile" : "photoUploadHeader"} htmlFor="report-photo">
                {preview ? (
                  <img className="photoUploadPreview" src={preview} alt="Vista previa del reporte" />
                ) : (
                  <span className="material-symbols-outlined photoUploadIcon" aria-hidden="true">
                    cloud_upload
                  </span>
                )}

                <div className="photoUploadCopy">
                  <strong>Subir o tomar foto</strong>
                </div>

                <input
                  id="report-photo"
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={manejarFoto}
                />
              </label>

              <div className="photoUploadFooter">
                <span className="material-symbols-outlined fileStatusIcon" aria-hidden="true">
                  description
                </span>
                <p>{foto ? foto.name : "Ningún archivo seleccionado"}</p>
                <button
                  type="button"
                  className="clearPhotoButton"
                  onClick={limpiarFoto}
                  disabled={!foto}
                  aria-label="Quitar fotografía seleccionada"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    delete
                  </span>
                </button>
              </div>
            </div>
            </div>

            <label className="photoBox legacyPhotoBox">
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
                  <small>Máximo {maxImageSize} MB</small>
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
                <Link to={`/mapa?reportId=${resultado.report.id}`}>Ver en mapa</Link>
                <Link to="/reportes">Ver reportes</Link>
              </div>
            </section>
          )}
        </form>

        <aside className="reportTips oldReportTips">
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
