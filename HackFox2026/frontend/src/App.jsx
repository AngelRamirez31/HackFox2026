import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import CrearReporte from "./pages/CrearReporte";
import Reportes from "./pages/Reportes";
import MapView from "./components/MapView";

function App() {
  return (
    <>
      <nav>
        <Link to="/">Inicio</Link> |{" "}
        <Link to="/mapa">Mapa</Link> |{" "}
        <Link to="/crear-reporte">Reportar</Link> |{" "}
        <Link to="/reportes">Reportes</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mapa" element={<MapView />} />
        <Route path="/crear-reporte" element={<CrearReporte />} />
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
    </>
  );
}

export default App;