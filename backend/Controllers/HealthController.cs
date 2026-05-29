using Microsoft.AspNetCore.Mvc;

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
        var provider = _configuration["Persistence:Provider"] ?? _configuration["Firebase:Provider"] ?? "InMemory";
        var isFirestore = string.Equals(provider, "Firestore", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Firebase", StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            status = "ok",
            app = "HackFox2026",
            track = "Tijuana Sin Barreras",
            storage = isFirestore ? "firebase-firestore" : "in-memory",
            resources = new
            {
                maps = "Geoapify Maps + Routing desde frontend",
                routes = "Puntos de ruta recibidos desde Geoapify Routing",
                gemini = geminiConfigured ? "configurado desde backend" : "pendiente de configurar en backend",
                firebase = isFirestore ? "Cloud Firestore activo para reportes" : "preparado, pendiente de activar"
            },
            geminiConfigured,
            firebase = new
            {
                provider,
                firestoreEnabled = isFirestore,
                projectConfigured = !string.IsNullOrWhiteSpace(_configuration["Firebase:ProjectId"]),
                reportsCollection = _configuration["Firebase:ReportsCollection"] ?? "reports"
            },
            timestamp = DateTime.UtcNow
        });
    }
}
