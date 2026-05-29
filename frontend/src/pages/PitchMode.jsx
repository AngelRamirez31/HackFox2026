import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuPresentation, LuRoute, LuSparkles } from "react-icons/lu";
import api, { getApiErrorMessage } from "../services/api";
import "./PitchMode.css";

function getScoreClass(score) {
  if (Number(score) >= 80) return "pitchScore good";
  if (Number(score) >= 50) return "pitchScore mid";
  return "pitchScore bad";
}

function ScenarioCard({ scenario, featured = false }) {
  return (
    <article className={featured ? "scenarioCard featured" : "scenarioCard"}>
      <div className="scenarioTop">
        <span>{scenario.label}</span>
        <strong className={getScoreClass(scenario.accessibilityPercent)}>
          {scenario.accessibilityPercent}%
        </strong>
      </div>

      <h2>{scenario.levelLabel}</h2>
      <p>{scenario.summary}</p>

      <div className="scenarioStats">
        <div>
          <strong>{scenario.distanceLabel}</strong>
          <span>distancia</span>
        </div>
        <div>
          <strong>{scenario.durationLabel}</strong>
          <span>tiempo estimado</span>
        </div>
        <div>
          <strong>{scenario.barrierCount}</strong>
          <span>barreras cercanas</span>
        </div>
      </div>

      <div className="scenarioRisk">
        <span>Riesgo principal</span>
        <strong>{scenario.mainRisk}</strong>
        <small>{scenario.criticalBarrierCount} barreras críticas</small>
      </div>

      {scenario.issueBreakdown?.length > 0 && (
        <ul className="scenarioIssues">
          {scenario.issueBreakdown.slice(0, 3).map((issue) => (
            <li key={issue.type}>
              {issue.count} {issue.pluralLabel || issue.typeLabel}
            </li>
          ))}
        </ul>
      )}

      <p className="scenarioRecommendation">{scenario.recommendation}</p>
    </article>
  );
}

function PitchMode() {
  const [pitch, setPitch] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [destinationKey, setDestinationKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDestinations() {
      try {
        const response = await api.get("/api/essential-destinations");
        if (!active) return;
        const data = Array.isArray(response.data) ? response.data : [];
        setDestinations(data);
        if (data.length > 0) setDestinationKey(data[0].key);
      } catch {
        if (active) setDestinations([]);
      }
    }

    loadDestinations();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPitch() {
      setLoading(true);
      setError("");

      try {
        const pitchResponse = await api.get("/api/scenarios/accessibility", {
          params: { destinationKey: destinationKey || undefined },
        });

        if (active) {
          setPitch(pitchResponse.data);
        }
      } catch (err) {
        if (active) setError(getApiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPitch();

    return () => {
      active = false;
    };
  }, [destinationKey]);


  const improvement = useMemo(() => {
    const normal = Number(pitch?.normalRoute?.accessibilityPercent || 0);
    const streets = Number(pitch?.streetsHRoute?.accessibilityPercent || 0);
    return Math.max(0, streets - normal);
  }, [pitch]);

  return (
    <main className="pitchPage">
      <section className="pitchHero">
        <div>
          <span className="pitchBadge">Escenario accesible</span>
          <h1>Compara una ruta directa con una ruta más segura</h1>
          <p>
            Evalúa trayectos hacia servicios esenciales con barreras cercanas,
            nivel de accesibilidad y recomendaciones claras antes de salir.
          </p>
        </div>

        <div className="pitchControlCard">
          <LuPresentation />
          <label>
            Destino de interés
            <select
              value={destinationKey}
              onChange={(event) => setDestinationKey(event.target.value)}
            >
              {destinations.map((destination) => (
                <option value={destination.key} key={destination.key}>
                  {destination.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>



      {error && <div className="pitchMessage error">{error}</div>}

      {loading ? (
        <section className="pitchMessage">Preparando escenario...</section>
      ) : pitch ? (
        <>
          <section className="pitchStoryCard">
            <div className="pitchStoryHeader">
              <LuSparkles />
              <div>
                <span>{pitch.title}</span>
                <h2>{pitch.destination.icon} {pitch.destination.name}</h2>
              </div>
            </div>

            <p className="pitchSubtitle">{pitch.subtitle}</p>

            <div className="pitchPersonaGrid">
              <article>
                <strong>Persona</strong>
                <p>{pitch.persona}</p>
              </article>
              <article>
                <strong>Misión</strong>
                <p>{pitch.mission}</p>
              </article>
              <article>
                <strong>Mejora mostrada</strong>
                <p>+{improvement} puntos de accesibilidad frente a la ruta normal.</p>
              </article>
            </div>
          </section>

          <section className="scenarioCompare">
            <ScenarioCard scenario={pitch.normalRoute} />
            <ScenarioCard scenario={pitch.streetsHRoute} featured />
          </section>

          <section className="pitchScriptGrid">
            <div className="pitchPanel">
              <div className="pitchPanelHeader">
                <LuRoute />
                <div>
                  <span>Lectura del escenario</span>
                  <h2>Secuencia del trayecto</h2>
                </div>
              </div>

              <ol className="pitchTimeline">
                {pitch.storyline.map((item, index) => (
                  <li key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pitchPanel">
              <div className="pitchPanelHeader">
                <LuSparkles />
                <div>
                  <span>Indicadores clave</span>
                  <h2>Valor para la ciudad</h2>
                </div>
              </div>

              <div className="talkingPoints">
                {pitch.juryTalkingPoints.map((point) => (
                  <article key={point}>{point}</article>
                ))}
              </div>
            </div>
          </section>

          <section className="pitchMetrics">
            {pitch.metrics.map((metric) => (
              <article key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </section>

          <div className="pitchActions">
            <Link to="/mapa" className="pitchPrimaryLink">
              Abrir mapa y probar ruta
            </Link>
            <Link to="/impacto" className="pitchSecondaryLink">
              Ver impacto urbano
            </Link>
          </div>
        </>
      ) : (
        <section className="pitchMessage">No se pudo preparar el escenario.</section>
      )}
    </main>
  );
}

export default PitchMode;
