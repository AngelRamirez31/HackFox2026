import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage, getImageUrl } from "../services/api";
import "./CrearReporte.css";

const fallbackReportTypes = [
  { value: "sidewalk_damage", label: "Banqueta Rota" },
  { value: "blocked_ramp", label: "Rampa Bloqueada" },
  { value: "missing_ramp", label: "Falta de Rampa" },
  { value: "obstacle", label: "Obstáculo en el Camino" },
  { value: "stairs", label: "Escalón sin Rampa" },
  { value: "unsafe_crossing", label: "Cruce Inseguro" },
  { value: "construction", label: "Obra o Reparación" },
  { value: "transport_issue", label: "Problema de Transporte" },
  { value: "other", label: "Otro" },
];

const fallbackSeverities = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const reportTips = [
  {
    id: 1,
    title: "Foto Clara",
    text: "Toma una foto donde se vea la barrera física.",
  },
  {
    id: 2,
    title: "Impacto Real",
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

function getOptionValue(option) {
  return option.value ?? option.id ?? option.type ?? "";
}

function getOptionLabel(option) {
  return option.label ?? option.name ?? option.title ?? getOptionValue(option);
}

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
  const [config, setConfig] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [modoReporte, setModoReporte] = useState("rapido");

  const fotoInputRef = useRef(null);

  const reportTypes = useMemo(() => {
    return config?.reports?.types?.length ? config.reports.types : fallbackReportTypes;
  }, [config]);

  const severities = useMemo(() => {
    return config?.reports?.severities?.length ? config.reports.severities : fallbackSeverities;
  }, [config]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarConfig();
  }, [cargarConfig]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function manejarFoto(e) {
    const archivo = e.target.files[0];

    if (!archivo) return;

    if (archivo.size > maxImageSize * 1024 * 1024) {
      setMensaje(`La imagen no puede pesar más de ${maxImageSize} MB.`);
      e.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
    setResultado(null);
    setMensaje("");
  }

  function limpiarFoto() {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

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

        setMensaje("Ubicación Obtenida Correctamente.");
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
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setTipo("");
    setSeveridad("media");
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

    if (modoReporte === "rapido" && !foto) {
      setMensaje("El reporte rápido necesita una foto para sugerir los datos automáticamente.");
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
    setMensaje(foto ? "Analizando imagen y guardando reporte..." : "Guardando reporte...");

    try {
      const endpoint = foto && modoReporte === "rapido" ? "/api/reports/quick" : foto ? "/api/reports/analyze-and-create" : "/api/reports";
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

  const mensajeEsError =
    mensaje.toLowerCase().includes("error") ||
    mensaje.toLowerCase().includes("no se") ||
    mensaje.toLowerCase().includes("no puede");

  return (
    <main className="reportPage">
      <section className="reportHero">
        <div>
          <span className="reportBadge">Reporte Ciudadano</span>
          <h1>Reporta una Barrera Física</h1>
          <p>
            Ayuda a construir un mapa vivo de accesibilidad. Registra banquetas
            rotas, rampas bloqueadas, obstáculos o zonas difíciles para que otras
            personas puedan planear trayectos más seguros.
          </p>
        </div>
      </section>

      <section className="reportLayout">
        <form className="reportForm" onSubmit={enviarReporte}>
          <div className="reportModeSwitch" aria-label="Modo de reporte">
            <button
              type="button"
              className={modoReporte === "rapido" ? "active" : ""}
              onClick={() => setModoReporte("rapido")}
              disabled={enviando}
            >
              Reporte rápido
              <span>Foto + ubicación + análisis inteligente</span>
            </button>
            <button
              type="button"
              className={modoReporte === "manual" ? "active" : ""}
              onClick={() => setModoReporte("manual")}
              disabled={enviando}
            >
              Reporte manual
              <span>Completar datos a mano</span>
            </button>
          </div>

          <div className="quickReportNotice">
            {modoReporte === "rapido"
              ? "Sube una foto y usa tu ubicación. El sistema propondrá tipo, severidad, descripción e impacto de accesibilidad."
              : "Puedes completar el reporte manualmente. Si también subes foto, el sistema puede complementar los datos sin reemplazar lo que escribas."}
          </div>

          <div className="formGroup">
            <label>Tipo de barrera</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={enviando}>
              <option value="">
                {cargandoConfig ? "Cargando opciones..." : modoReporte === "rapido" ? "Opcional: el sistema puede sugerirlo" : "Selecciona una opción"}
              </option>

              {reportTypes.map((option) => (
                <option value={getOptionValue(option)} key={getOptionValue(option)}>
                  {getOptionLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label>Nivel de Severidad</label>

            <div className="severityOptions">
              {severities.map((option) => {
                const value = getOptionValue(option);
                const label = getOptionLabel(option);

                return (
                  <button
                    type="button"
                    className={severidad === value ? "severity active" : "severity"}
                    onClick={() => setSeveridad(value)}
                    disabled={enviando}
                    key={value}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="formGroup">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={modoReporte === "rapido" ? "Opcional. El sistema puede sugerir la descripción desde la foto." : "La banqueta está rota y una silla de ruedas no puede pasar."}
              rows="5"
              disabled={enviando}
            />
          </div>

          <div className="formGroup">
            <label>Fotografía del Lugar</label>

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
                    <strong>{modoReporte === "rapido" ? "Tomar foto para reporte rápido" : "Subir o tomar foto"}</strong>
                    <span>Máximo {maxImageSize} MB. El análisis de imagen puede sugerir tipo, severidad, descripción e impacto.</span>
                  </div>

                  <input
                    id="report-photo"
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={manejarFoto}
                    disabled={enviando}
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
                    disabled={!foto || enviando}
                    aria-label="Quitar fotografía seleccionada"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="formGroup locationGroup">
            <label>Ubicación</label>

          <div className="locationActionRow">
            <button type="button" className="locationButton" onClick={obtenerUbicacion} disabled={enviando}>
              <span className="locationButtonLoader" aria-hidden="true"></span>
              <span className="locationButtonText">Obtener ubicación actual</span>
            </button>
          </div>

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

          {mensaje && <p className={mensajeEsError ? "message errorMessage" : "message"}>{mensaje}</p>}

          <button type="submit" className="submitButton" disabled={enviando}>
            {enviando ? "Enviando..." : modoReporte === "rapido" ? "Crear reporte rápido" : foto ? "Analizar y enviar reporte" : "Enviar reporte"}
          </button>

          {resultado && (
            <section className="createdReportCard">
              <h2>Reporte Creado</h2>
              <p>{resultado.message}</p>

              <div className="createdReportMeta">
                <span>ID: {resultado.report.id}</span>
                <span>{resultado.report.typeLabel}</span>
                <span>Severidad: {resultado.report.severityLabel}</span>
                <span>{resultado.report.trustLabel}</span>
                <span>Prioridad: {resultado.report.priorityLabel}</span>
              </div>

              {resultado.vision && (
                <div className="geminiBox">
                  <strong>Análisis detectado:</strong>
                  <p>{resultado.vision.summary}</p>
                  <small>{resultado.vision.accessibilityImpact}</small>
                  <small>Confianza del análisis: {Math.round((resultado.vision.confidence || 0) * 100)}%</small>
                </div>
              )}

              {resultado.report.imageUrl && (
                <img
                  className="createdReportImage"
                  src={getImageUrl(resultado.report.imageUrl)}
                  alt="Imagen del Reporte Creado"
                />
              )}

              <div className="createdReportActions">
                <Link to={`/mapa?reportId=${resultado.report.id}`}>Ver en mapa</Link>
                <Link to="/reportes">Ver Reportes</Link>
              </div>
            </section>
          )}
        </form>

        <aside className="reportTips oldReportTips">
          <h2>Consejos para un buen reporte</h2>

          {reportTips.map((tip) => (
            <div className="tipCard" key={tip.id}>
              <span>{tip.id}</span>
              <p>{tip.text}</p>
            </div>
          ))}
        </aside>
      </section>
    </main>
  );
}

export default CrearReporte;