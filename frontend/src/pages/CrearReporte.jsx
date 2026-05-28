import { useState } from "react";
import "./CrearReporte.css";

function CrearReporte() {
  const [tipo, setTipo] = useState("");
  const [severidad, setSeveridad] = useState("media");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [mensaje, setMensaje] = useState("");

  function manejarFoto(e) {
    const archivo = e.target.files[0];

    if (!archivo) return;

    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
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
        setMensaje("No se pudo obtener la ubicación.");
      }
    );
  }

  function enviarReporte(e) {
    e.preventDefault();

    if (!tipo || !descripcion || !ubicacion) {
      setMensaje("Completa el tipo de barrera, descripción y ubicación.");
      return;
    }

    const reporte = {
      tipo,
      severidad,
      descripcion,
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      foto,
      fecha: new Date().toISOString(),
    };

    console.log("Reporte creado:", reporte);

    setMensaje("Reporte generado correctamente. Luego lo conectamos al backend.");

    setTipo("");
    setSeveridad("media");
    setDescripcion("");
    setFoto(null);
    setPreview(null);
    setUbicacion(null);
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
              <option value="">Selecciona una opción</option>
              <option value="Banqueta rota">Banqueta rota</option>
              <option value="Rampa bloqueada">Rampa bloqueada</option>
              <option value="Sin banqueta">Sin banqueta</option>
              <option value="Obstáculo en el camino">Obstáculo en el camino</option>
              <option value="Escalón sin rampa">Escalón sin rampa</option>
              <option value="Pendiente peligrosa">Pendiente peligrosa</option>
              <option value="Cruce inseguro">Cruce inseguro</option>
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
              placeholder="Ejemplo: La banqueta está rota y una silla de ruedas no puede pasar."
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
                  <span>Presiona aquí para agregar evidencia visual</span>
                </div>
              )}
            </label>
          </div>

          <div className="formGroup">
            <label>Ubicación</label>

            <button type="button" className="locationButton" onClick={obtenerUbicacion}>
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

          {mensaje && <p className="message">{mensaje}</p>}

          <button type="submit" className="submitButton">
            Enviar reporte
          </button>
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