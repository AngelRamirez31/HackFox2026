using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IReportRepository _reports;
    private readonly GeminiVisionService _geminiVisionService;
    private readonly LocalFileStorageService _fileStorage;

    public HealthController(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IReportRepository reports,
        GeminiVisionService geminiVisionService,
        LocalFileStorageService fileStorage)
    {
        _configuration = configuration;
        _environment = environment;
        _reports = reports;
        _geminiVisionService = geminiVisionService;
        _fileStorage = fileStorage;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth([FromQuery] bool deep = false)
    {
        var provider = _configuration["Persistence:Provider"] ?? _configuration["Firebase:Provider"] ?? "InMemory";
        var isFirestore = string.Equals(provider, "Firestore", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Firebase", StringComparison.OrdinalIgnoreCase);

        var databaseStatus = "not_checked";
        int? reportCount = null;
        string? databaseError = null;

        if (deep)
        {
            try
            {
                var reports = await _reports.GetAllAsync();
                reportCount = reports.Count;
                databaseStatus = "ok";
            }
            catch (Exception ex)
            {
                databaseStatus = "error";
                databaseError = ex.Message;
            }
        }

        var overallStatus = deep && databaseStatus == "error" ? "degraded" : "ok";

        return Ok(new
        {
            status = overallStatus,
            app = "HackFox2026",
            track = "Tijuana Sin Barreras",
            environment = _environment.EnvironmentName,
            storage = isFirestore ? "firebase-firestore" : "in-memory",
            database = new
            {
                provider,
                firestoreEnabled = isFirestore,
                projectConfigured = !string.IsNullOrWhiteSpace(_configuration["Firebase:ProjectId"]),
                reportsCollection = _configuration["Firebase:ReportsCollection"] ?? "reports",
                status = databaseStatus,
                reportCount,
                error = databaseError
            },
            resources = new
            {
                maps = "Google Maps Platform desde frontend",
                routes = "Puntos de ruta recibidos desde Maps/Routes/Directions",
                gemini = _geminiVisionService.IsConfigured ? "configurado desde backend" : "pendiente de configurar en backend",
                firebase = isFirestore ? "Cloud Firestore activo para reportes" : "preparado, pendiente de activar",
                imageStorage = _fileStorage.GetStatus()
            },
            geminiConfigured = _geminiVisionService.IsConfigured,
            timestamp = DateTime.UtcNow
        });
    }
}
