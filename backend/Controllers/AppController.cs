using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/app")]
public class AppController : ControllerBase
{
    [HttpGet("config")]
    public ActionResult GetConfig()
    {
        return Ok(new
        {
            app = new
            {
                name = "Streets-H",
                track = "Tijuana Sin Barreras",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
            },
            reports = new
            {
                types = ReportRules.TypeLabels.Select(pair => new
                {
                    value = pair.Key,
                    label = pair.Value,
                    markerIcon = VisualizationRules.GetMarkerIcon(pair.Key)
                }),
                severities = new[]
                {
                    new { value = "baja", numericValue = 1, label = "Baja", color = VisualizationRules.GetSeverityColor(1) },
                    new { value = "media", numericValue = 2, label = "Media", color = VisualizationRules.GetSeverityColor(2) },
                    new { value = "alta", numericValue = 3, label = "Alta", color = VisualizationRules.GetSeverityColor(3) }
                },
                statuses = ReportRules.Statuses.Select(status => new
                {
                    value = status,
                    label = VisualizationRules.GetStatusLabel(status)
                })
            },
            uploads = new
            {
                maxImageSizeMb = LocalFileStorageService.MaxImageSizeBytes / 1024 / 1024,
                allowedImageTypes = new[] { "jpg", "jpeg", "png", "webp" },
                storage = "local"
            },
            routes = new
            {
                defaultRadiusMeters = 50,
                minRadiusMeters = 10,
                maxRadiusMeters = 300,
                scoreEndpoint = "/api/routes/accessibility",
                travelMode = "walking",
                levels = new[]
                {
                    new { min = 80, max = 100, level = "high", label = "Ruta accesible", color = "green" },
                    new { min = 50, max = 79, level = "medium", label = "Ruta con precaución", color = "yellow" },
                    new { min = 0, max = 49, level = "low", label = "Ruta poco accesible", color = "red" }
                }
            },
            endpoints = new
            {
                reports = "/api/reports",
                reportsMap = "/api/reports/map",
                createReport = "/api/reports",
                createGeminiReport = "/api/reports/analyze-and-create",
                stats = "/api/stats",
                routeAccessibility = "/api/routes/accessibility"
            }
        });
    }
}
