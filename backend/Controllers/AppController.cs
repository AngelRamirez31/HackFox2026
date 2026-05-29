using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/app")]
public class AppController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly LocalFileStorageService _fileStorage;
    private readonly GeminiVisionService _geminiVisionService;

    public AppController(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        LocalFileStorageService fileStorage,
        GeminiVisionService geminiVisionService)
    {
        _configuration = configuration;
        _environment = environment;
        _fileStorage = fileStorage;
        _geminiVisionService = geminiVisionService;
    }

    [HttpGet("config")]
    public ActionResult<AppConfigResponse> GetConfig()
    {
        var provider = _configuration["Persistence:Provider"] ?? _configuration["Firebase:Provider"] ?? "InMemory";
        var isFirestore = string.Equals(provider, "Firestore", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Firebase", StringComparison.OrdinalIgnoreCase);
        var storage = _fileStorage.GetStatus();

        return Ok(new AppConfigResponse
        {
            AppName = "HackFox2026",
            Track = "Tijuana Sin Barreras",
            BackendVersion = "local-dev",
            Api = new
            {
                health = "/api/health",
                reports = "/api/reports",
                mapReports = "/api/reports/map",
                createReport = "/api/reports",
                geminiAssistedCreate = "/api/reports/analyze-and-create",
                routeScore = "/api/routes/score",
                dashboardSummary = "/api/dashboard/summary",
                hotspots = "/api/reports/hotspots",
                stats = "/api/stats"
            },
            Reports = new
            {
                types = ReportRules.TypeLabels.Select(pair => new
                {
                    value = pair.Key,
                    label = pair.Value,
                    markerIcon = VisualizationRules.GetMarkerIcon(pair.Key)
                }),
                statuses = ReportRules.Statuses.Select(status => new
                {
                    value = status,
                    label = VisualizationRules.GetStatusLabel(status)
                }),
                severities = new[]
                {
                    new { value = 1, label = "Baja", color = VisualizationRules.GetSeverityColor(1) },
                    new { value = 2, label = "Media", color = VisualizationRules.GetSeverityColor(2) },
                    new { value = 3, label = "Alta", color = VisualizationRules.GetSeverityColor(3) }
                },
                duplicateCheck = new
                {
                    enabled = _configuration.GetValue<bool>("Reports:PreventDuplicates"),
                    radiusMeters = GetDuplicateRadius()
                },
                geographicValidation = new
                {
                    restrictToTijuana = _configuration.GetValue<bool>("Reports:RestrictToTijuana"),
                    bounds = ReportRules.TijuanaBounds
                }
            },
            Routes = new
            {
                scoreEndpoint = "/api/routes/score",
                aliases = new[] { "/api/routes/accessibility" },
                minPoints = 2,
                maxPoints = 1000,
                defaultRadiusMeters = 50,
                minRadiusMeters = 10,
                maxRadiusMeters = 300,
                levels = new[]
                {
                    new { min = 80, max = 100, level = "high", label = "Ruta accesible", color = "green" },
                    new { min = 50, max = 79, level = "medium", label = "Ruta con precaución", color = "yellow" },
                    new { min = 0, max = 49, level = "low", label = "Ruta poco accesible", color = "red" }
                }
            },
            Uploads = new
            {
                provider = storage.Provider,
                maxImageSizeMb = storage.MaxImageSizeMb,
                acceptedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" },
                localFallbackPath = storage.LocalFallbackPath
            },
            Map = new
            {
                defaultCenter = new { lat = 32.514947, lng = -117.038247 },
                defaultZoom = 14,
                requiredFrontendEnv = "VITE_GOOGLE_MAPS_API_KEY"
            },
            Resources = new
            {
                environment = _environment.EnvironmentName,
                persistenceProvider = provider,
                firestoreEnabled = isFirestore,
                geminiConfigured = _geminiVisionService.IsConfigured,
                firebaseProjectConfigured = !string.IsNullOrWhiteSpace(_configuration["Firebase:ProjectId"]),
                reportsCollection = _configuration["Firebase:ReportsCollection"] ?? "reports"
            },
            GeneratedAt = DateTime.UtcNow
        });
    }

    private double GetDuplicateRadius()
    {
        var radius = _configuration.GetValue<double?>("Reports:DuplicateRadiusMeters") ?? 20;
        return Math.Clamp(radius, 5, 100);
    }
}
