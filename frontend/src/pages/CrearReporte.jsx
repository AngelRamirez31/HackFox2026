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

function getOptionValue(option) {
  return option.value ?? option.id ?? option.type ?? "";
}

function getOptionLabel(option) {
  return option.label ?? option.name ?? option.title ?? getOptionValue(option);
}

function getGeminiValue(vision, report, keys, fallback = "No disponible") {
  for (const key of keys) {
    if (vision?.[key]) return vision[key];
    if (report?.[key]) return report[key];
  }

  return fallback;
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
    return config?.reports?.types?.length
      ? config.reports.types
      : fallbackReportTypes;
  }, [config]);

  const severities = useMemo(() => {
    return config?.reports?.severities?.length
      ? config.reports.severities
      : fallbackSeverities;
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
    cargarConfig();
  }, [cargarConfig]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function cambiarModo(nuevoModo) {
    setModoReporte(nuevoModo);
    setMensaje("");
    setResultado(null);
  }

  function manejarFoto(e) {
    const archivo = e.target.files[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setMensaje("El archivo seleccionado debe ser una imagen.");
      e.target.value = "";
      return;
    }

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

        setMensaje("Ubicación obtenida correctamente.");
      },
      () => {
        setMensaje(
          "No se pudo obtener la ubicación. Permite el acceso a ubicación o intenta de nuevo."
        );
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

  function validarFormulario() {
    if (!ubicacion) {
      return "Primero obtén la ubicación del reporte.";
    }

    if (modoReporte === "rapido") {
      if (!foto) {
        return "El reporte rápido necesita una foto para generar sugerencias con Gemini.";
      }

      return "";
    }

    if (!tipo) {
      return "Selecciona el tipo de barrera para el reporte manual.";
    }

    if (!descripcion.trim()) {
      return "Escribe una descripción breve del problema.";
    }

    return "";
  }

  function construirFormData() {
    const formData = new FormData();

    formData.append("latitude", ubicacion.latitud);
    formData.append("longitude", ubicacion.longitud);

    if (modoReporte === "rapido") {
      formData.append("image", foto);
      return formData;
    }

    formData.append("type", tipo);
    formData.append("severity", severidad);
    formData.append("description", descripcion.trim());

    if (foto) {
      formData.append("image", foto);
      formData.append("useGemini", "true");
    }

    return formData;
  }

  async function enviarReporte(e) {
    e.preventDefault();
    setResultado(null);

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setMensaje(errorValidacion);
      return;
    }

    const endpoint =
      modoReporte === "rapido"
        ? "/api/reports/quick"
        : foto
        ? "/api/reports/analyze-and-create"
        : "/api/reports";

    const formData = construirFormData();

    setEnviando(true);
    setMensaje(
      modoReporte === "rapido"
        ? "Creando reporte rápido con Gemini..."
        : foto
        ? "Analizando imagen y guardando reporte..."
        : "Guardando reporte manual..."
    );

    try {
      const response = await api.post(endpoint, formData);
      const payload = response.data;
      const report = payload.report || payload;

      const geminiRequested = Boolean(payload.geminiRequested);
      const geminiSucceeded = Boolean(payload.geminiSucceeded);
      const geminiFallido = geminiRequested && !geminiSucceeded;

      setResultado({
        report,
        vision: payload.vision || null,
        geminiRequested,
        geminiSucceeded,
        geminiError: payload.geminiError || "",
        message:
          payload.message ||
          (geminiFallido
            ? "Reporte creado, pero Gemini no pudo generar sugerencias."
            : "Reporte creado correctamente."),
      });

      setMensaje(
        payload.message ||
          (geminiFallido
            ? "Reporte creado, pero Gemini no pudo generar sugerencias."
            : "Reporte creado correctamente.")
      );

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
    mensaje.toLowerCase().includes("no pudo") ||
    mensaje.toLowerCase().includes("no puede") ||
    mensaje.toLowerCase().includes("necesita") ||
    mensaje.toLowerCase().includes("selecciona") ||
    mensaje.toLowerCase().includes("escribe");

  const fotoLista = Boolean(foto);
  const ubicacionLista = Boolean(ubicacion);

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
          <section className="reportModeSection">
            <div className="reportModeSwitch" aria-label="Modo de reporte">
              <button
                type="button"
                className={modoReporte === "rapido" ? "active" : ""}
                onClick={() => cambiarModo("rapido")}
                disabled={enviando}
              >
                <strong>Reporte rápido</strong>
                <span>Foto + ubicación + análisis inteligente</span>
              </button>

              <button
                type="button"
                className={modoReporte === "manual" ? "active" : ""}
                onClick={() => cambiarModo("manual")}
                disabled={enviando}
              >
                <strong>Reporte manual</strong>
                <span>Completar datos a mano</span>
              </button>
            </div>

            <div className="quickReportNotice">
              {modoReporte === "rapido"
                ? "Sube una foto y usa tu ubicación. El sistema propondrá tipo, severidad, descripción e impacto de accesibilidad."
                : "Completa los datos principales. La foto es opcional, pero puede ayudar a enriquecer el análisis del reporte."}
            </div>
          </section>

          {modoReporte === "rapido" && (
            <section className="quickChecklist">
              <article className={fotoLista ? "ready" : ""}>
                <span>Foto</span>
                <strong>{fotoLista ? "Lista" : "Pendiente"}</strong>
              </article>

              <article className={ubicacionLista ? "ready" : ""}>
                <span>Ubicación</span>
                <strong>{ubicacionLista ? "Lista" : "Pendiente"}</strong>
              </article>
            </section>
          )}

          {modoReporte === "manual" && (
            <section className="manualFields">
              <div className="formGroup">
                <label>Tipo de barrera</label>

                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={enviando}
                >
                  <option value="">
                    {cargandoConfig
                      ? "Cargando opciones..."
                      : "Selecciona una opción"}
                  </option>

                  {reportTypes.map((option) => (
                    <option
                      value={getOptionValue(option)}
                      key={getOptionValue(option)}
                    >
                      {getOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup">
                <label>Nivel de severidad</label>

                <div className="severityOptions">
                  {severities.map((option) => {
                    const value = getOptionValue(option);
                    const label = getOptionLabel(option);

                    return (
                      <button
                        type="button"
                        className={
                          severidad === value ? "severity active" : "severity"
                        }
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
                  placeholder="La banqueta está rota y una silla de ruedas no puede pasar."
                  rows="5"
                  disabled={enviando}
                />
              </div>
            </section>
          )}

          <section className="formGroup">
            <label>
              {modoReporte === "rapido"
                ? "Fotografía del lugar"
                : "Fotografía opcional"}
            </label>

            <div className="photoGuidedUpload">
              {reportTips.map((tip) => (
                <article
                  className={`photoInlineTip tipPosition${tip.id}`}
                  key={tip.id}
                >
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
                <label
                  className={
                    foto ? "photoUploadHeader hasFile" : "photoUploadHeader"
                  }
                  htmlFor="report-photo"
                >
                  {preview ? (
                    <img
                      className="photoUploadPreview"
                      src={preview}
                      alt="Vista previa del reporte"
                    />
                  ) : (
                    <span
                      className="material-symbols-outlined photoUploadIcon"
                      aria-hidden="true"
                    >
                      cloud_upload
                    </span>
                  )}

                  <div className="photoUploadCopy">
                    <strong>
                      {modoReporte === "rapido"
                        ? "Tomar foto para reporte rápido"
                        : "Subir o tomar foto"}
                    </strong>

                    <span>
                      Máximo {maxImageSize} MB. El análisis de imagen puede
                      sugerir tipo, severidad, descripción e impacto.
                    </span>
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
                  <span
                    className="material-symbols-outlined fileStatusIcon"
                    aria-hidden="true"
                  >
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
          </section>

          <section className="formGroup locationGroup">
            <label>Ubicación</label>

            <div className="locationActionRow">
              <button
                type="button"
                className="locationButton"
                onClick={obtenerUbicacion}
                disabled={enviando}
              >
                <span className="locationButtonLoader" aria-hidden="true"></span>

                <span className="locationButtonText">
                  Obtener ubicación actual
                </span>
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
          </section>

          {mensaje && (
            <p className={mensajeEsError ? "message errorMessage" : "message"}>
              {mensaje}
            </p>
          )}

          <button type="submit" className="submitButton" disabled={enviando}>
            {enviando
              ? "Enviando..."
              : modoReporte === "rapido"
              ? "Crear reporte rápido"
              : foto
              ? "Analizar y enviar reporte"
              : "Enviar reporte manual"}
          </button>

          {resultado && (
            <section className="createdReportCard">
              <div className="createdReportHeader">
                <span>Reporte creado</span>
                <h2>{resultado.report.title || resultado.report.typeLabel}</h2>
                <p>{resultado.message}</p>
              </div>

              <div className="createdReportMeta">
                <span>ID: {resultado.report.id}</span>
                <span>{resultado.report.typeLabel}</span>
                <span>Severidad: {resultado.report.severityLabel}</span>
                <span>{resultado.report.trustLabel}</span>
                <span>Prioridad: {resultado.report.priorityLabel}</span>
              </div>

              {(resultado.vision || resultado.geminiRequested) && (
                <div className="geminiSuggestions">
                  <div className="geminiSuggestionsHeader">
                    <span>Gemini</span>
                    <h3>Sugerencias generadas</h3>
                  </div>

                  {resultado.geminiSucceeded && resultado.vision ? (
                    <div className="geminiSuggestionGrid">
                      <article>
                        <strong>Tipo sugerido</strong>
                        <span>
                          {getGeminiValue(resultado.vision, resultado.report, [
                            "typeLabel",
                            "suggestedTypeLabel",
                            "type",
                          ])}
                        </span>
                      </article>

                      <article>
                        <strong>Severidad sugerida</strong>
                        <span>
                          {getGeminiValue(resultado.vision, resultado.report, [
                            "severityLabel",
                            "suggestedSeverityLabel",
                            "severity",
                          ])}
                        </span>
                      </article>

                      <article className="wide">
                        <strong>Descripción generada</strong>
                        <span>
                          {getGeminiValue(resultado.vision, resultado.report, [
                            "description",
                            "suggestedDescription",
                            "summary",
                          ])}
                        </span>
                      </article>

                      <article className="wide">
                        <strong>Impacto de accesibilidad</strong>
                        <span>
                          {getGeminiValue(resultado.vision, resultado.report, [
                            "accessibilityImpact",
                            "impact",
                            "summary",
                          ])}
                        </span>
                      </article>

                      <article>
                        <strong>Confianza Gemini</strong>
                        <span>
                          {Math.round((resultado.vision.confidence || 0) * 100)}%
                        </span>
                      </article>

                      <article>
                        <strong>Prioridad calculada</strong>
                        <span>
                          {resultado.report.priorityLabel || "No disponible"}
                        </span>
                      </article>
                    </div>
                  ) : (
                    <div className="geminiWarning">
                      Gemini no pudo generar sugerencias para este reporte.
                      {resultado.geminiError && (
                        <span>Error: {resultado.geminiError}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {resultado.report.imageUrl && (
                <img
                  className="createdReportImage"
                  src={getImageUrl(resultado.report.imageUrl)}
                  alt="Imagen del reporte creado"
                />
              )}

              <div className="createdReportActions">
                <Link to={`/mapa?reportId=${resultado.report.id}`}>
                  Ver en mapa
                </Link>

                <Link to="/reportes">Ver reportes</Link>
              </div>
            </section>
          )}
        </form>
      </section>
    </main>
  );
}

export default CrearReporte;