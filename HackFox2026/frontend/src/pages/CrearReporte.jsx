function CrearReporte() {
  return (
    <main>
      <h1>Reportar barrera</h1>

      <form>
        <label>Tipo de barrera</label>
        <select>
          <option>Banqueta rota</option>
          <option>Rampa bloqueada</option>
          <option>Sin banqueta</option>
          <option>Obstáculo</option>
        </select>

        <br />

        <label>Descripción</label>
        <textarea placeholder="Describe el problema"></textarea>

        <br />

        <label>Foto</label>
        <input type="file" accept="image/*" capture="environment" />

        <br />

        <button type="submit">Enviar reporte</button>
      </form>
    </main>
  );
}

export default CrearReporte;