using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/routes")]
public class RoutesController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly AccessibilityScoringService _scoringService;

    public RoutesController(IReportRepository reports, AccessibilityScoringService scoringService)
    {
        _reports = reports;
        _scoringService = scoringService;
    }

    [HttpGet("options")]
    public ActionResult GetRouteOptions()
    {
        return Ok(new
        {
            endpoint = "/api/routes/score",
            aliases = new[] { "/api/routes/accessibility" },
            description = "Calcula el porcentaje de accesibilidad de una ruta real generada por Geoapify u otro proveedor de rutas.",
            requiredFields = new[] { "points" },
            optionalFields = new[] { "radiusMeters", "distanceMeters", "durationSeconds", "travelMode", "mobilityProfile", "source", "includeReports" },
            defaults = new
            {
                radiusMeters = 50,
                travelMode = "walking",
                mobilityProfile = "default",
                includeReports = true
            },
            limits = new
            {
                minPoints = 2,
                maxPoints = 1000,
                minRadiusMeters = 10,
                maxRadiusMeters = 300
            },
            scoringFormula = "accessibilityPercent = max(0, 100 - weighted penalties by severity, barrier type, mobility profile, trust and verification state)",
            mobilityProfiles = new[]
            {
                new { value = "default", label = "General" },
                new { value = "wheelchair", label = "Silla de ruedas" },
                new { value = "walker", label = "Bastón o andadera" },
                new { value = "elderly", label = "Adulto mayor" },
                new { value = "stroller", label = "Carriola" }
            },
            scoreLevels = new[]
            {
                new { min = 80, max = 100, level = "high", label = "Ruta accesible", color = "green" },
                new { min = 50, max = 79, level = "medium", label = "Ruta intermedia", color = "orange" },
                new { min = 0, max = 49, level = "low", label = "Ruta poco accesible", color = "red" }
            }
        });
    }

    [HttpPost("score")]
    public async Task<ActionResult<RouteScoreResponse>> ScoreRoute([FromBody] RouteScoreRequest request)
    {
        var validationResult = ValidateRouteRequest(request);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var reports = await _reports.GetAllAsync();
        var result = _scoringService.CalculateScore(request, reports);
        return Ok(result);
    }

    [HttpPost("accessibility")]
    public async Task<ActionResult<RouteScoreResponse>> AnalyzeAccessibility([FromBody] RouteScoreRequest request)
    {
        return await ScoreRoute(request);
    }

    private BadRequestObjectResult? ValidateRouteRequest(RouteScoreRequest request)
    {
        if (request.Points is null || request.Points.Count < 2)
        {
            return BadRequest(new { message = "La ruta debe tener al menos dos puntos." });
        }

        if (request.Points.Count > 1000)
        {
            return BadRequest(new { message = "La ruta no puede tener más de 1000 puntos." });
        }

        if (request.Points.Any(point => point.Lat is < -90 or > 90 || point.Lng is < -180 or > 180))
        {
            return BadRequest(new { message = "La ruta contiene coordenadas inválidas." });
        }

        if (request.RadiusMeters is < 10 or > 300)
        {
            return BadRequest(new { message = "El radio de análisis debe estar entre 10 y 300 metros." });
        }

        if (!ReportIntelligenceRules.IsValidMobilityProfile(request.MobilityProfile))
        {
            return BadRequest(new { message = "Perfil de movilidad inválido. Usa default, wheelchair, walker, elderly o stroller." });
        }

        var uniquePoints = request.Points
            .Select(point => new { Lat = Math.Round(point.Lat, 6), Lng = Math.Round(point.Lng, 6) })
            .Distinct()
            .Count();

        if (uniquePoints < 2)
        {
            return BadRequest(new { message = "La ruta debe contener al menos dos puntos diferentes." });
        }

        return null;
    }
}
