using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public HealthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public IActionResult GetHealth()
    {
        var geminiConfigured = !string.IsNullOrWhiteSpace(_configuration["Gemini:ApiKey"]);

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
                gemini = geminiConfigured ? "configurado desde backend" : "pendiente de configurar en backend",
                firebase = "opcional para tiempo real en siguiente iteración"
            },
            geminiConfigured,
            timestamp = DateTime.UtcNow
        });
    }
}
