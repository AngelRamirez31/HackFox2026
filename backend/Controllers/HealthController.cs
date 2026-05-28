using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "ok",
            app = "HackFox2026",
            track = "Tijuana Sin Barreras",
            storage = "in-memory",
            resources = new
            {
                maps = "Google Maps Platform desde frontend",
                routes = "Puntos de ruta recibidos desde Maps/Routes/Directions",
                gemini = "preparado para backend, sin exponer keys en React",
                firebase = "opcional para tiempo real en siguiente iteración"
            },
            timestamp = DateTime.UtcNow
        });
    }
}
