import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import CrearReporte from "./pages/CrearReporte";
import Reportes from "./pages/Reportes";
import MapView from "./components/MapView";
import "./App.css";

function App() {
  return (
    <>
      <header className="navbar">
        <div className="navbarContainer">
          <NavLink to="/" className="logo">
            Streets-H
          </NavLink>

          <nav className="navLinks">
            <NavLink to="/" className={({ isActive }) => isActive ? "navItem active" : "navItem"}>
              Inicio
            </NavLink>

            <NavLink to="/mapa" className={({ isActive }) => isActive ? "navItem active" : "navItem"}>
              Mapa
            </NavLink>

            <NavLink to="/crear-reporte" className={({ isActive }) => isActive ? "navItem active" : "navItem"}>
              Reportar
            </NavLink>

            <NavLink to="/reportes" className={({ isActive }) => isActive ? "navItem active" : "navItem"}>
              Reportes
            </NavLink>
          </nav>
        </div>
      </header>

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