using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly AccessibilityScoringService _scoring;
    private readonly EssentialDestinationService _destinations;
    private readonly ImpactSummaryService _impact;

    public DemoController(
        IReportRepository reports,
        AccessibilityScoringService scoring,
        EssentialDestinationService destinations,
        ImpactSummaryService impact)
    {
        _reports = reports;
        _scoring = scoring;
        _destinations = destinations;
        _impact = impact;
    }

    [HttpGet("pitch")]
    [HttpGet("/api/scenarios/accessibility")]
    public async Task<ActionResult<DemoPitchResponse>> GetPitchMode([FromQuery] string? destinationKey = null)
    {
        var reports = await _reports.GetAllAsync();
        var activeReports = reports
            .Where(report => ReportRules.Normalize(report.Status) == "active")
            .OrderByDescending(report => ReportIntelligenceRules.CalculatePriorityScore(report))
            .ThenByDescending(report => report.Severity)
            .ThenByDescending(report => report.Confirmations)
            .ToList();

        var destination = _destinations.GetByKey(destinationKey) ?? _destinations.GetDefault();
        var normalPoints = BuildNormalRoutePoints(destination, activeReports);
        var optimizedPoints = BuildOptimizedRoutePoints(destination);
        var normalScore = _scoring.CalculateScore(new RouteScoreRequest
        {
            Points = normalPoints,
            RadiusMeters = 90,
            DistanceMeters = 2100,
            DurationSeconds = 7200,
            TravelMode = "walking",
            MobilityProfile = destination.RecommendedMobilityProfile,
            Source = "scenario-direct-route",
            IncludeReports = true
        }, reports);
        var optimizedScore = _scoring.CalculateScore(new RouteScoreRequest
        {
            Points = optimizedPoints,
            RadiusMeters = 55,
            DistanceMeters = 2400,
            DurationSeconds = 5400,
            TravelMode = "walking",
            MobilityProfile = destination.RecommendedMobilityProfile,
            Source = "scenario-streets-h-route",
            IncludeReports = true
        }, reports);
        var impact = _impact.Build(reports, 3);

        return Ok(new DemoPitchResponse
        {
            GeneratedAt = DateTime.UtcNow,
            Title = "Escenario de ruta accesible",
            Subtitle = "Comparación entre una ruta directa y una alternativa con menor exposición a barreras físicas.",
            Persona = "Persona con movilidad reducida, adulto mayor o familia que necesita llegar a un servicio público con mayor seguridad.",
            Mission = $"Llegar a {destination.Name} usando información comunitaria para evitar barreras físicas cercanas.",
            Destination = destination,
            NormalRoute = BuildScenario("Ruta directa", normalScore, normalPoints, "Camino más corto, pero con mayor exposición a barreras de alto impacto.", "Úsala solo como referencia y revisa las barreras cercanas antes de salir."),
            StreetsHRoute = BuildScenario("Ruta Streets-H", optimizedScore, optimizedPoints, "Alternativa evaluada con reportes, confianza, prioridad y perfil de movilidad.", "Revisa la recomendación de accesibilidad y confirma si la ruta se ajusta a tus necesidades."),
            Storyline =
            [
                "Identifica el destino esencial al que se quiere llegar.",
                $"Compara una ruta directa hacia {destination.Name} contra una alternativa con menor exposición a barreras físicas.",
                "Consulta el porcentaje de accesibilidad, los riesgos principales y la recomendación antes de salir.",
                "Usa los reportes y zonas críticas como evidencia para mejorar la movilidad urbana."
            ],
            JuryTalkingPoints =
            [
                "Reportes activos, zonas críticas y confianza comunitaria ayudan a priorizar la atención urbana.",
                "El mapa vivo combina rutas, reportes ciudadanos, análisis de imagen y perfiles de movilidad.",
                "El score explica los riesgos de la ruta en lugar de mostrar solo un porcentaje.",
                "La información puede ampliarse por colonia, dependencia o tipo de servicio esencial."
            ],
            Metrics = impact.Metrics.Take(4).ToList()
        });
    }

    private static List<RoutePoint> BuildNormalRoutePoints(EssentialDestinationResponse destination, IReadOnlyList<HackFox2026.Models.Report> activeReports)
    {
        var nearbyReports = activeReports
            .Select(report => new
            {
                Report = report,
                Distance = GeoUtils.DistanceMeters(destination.Lat, destination.Lng, report.Latitude, report.Longitude)
            })
            .Where(item => item.Distance <= 950)
            .OrderByDescending(item => ReportIntelligenceRules.CalculatePriorityScore(item.Report))
            .ThenBy(item => item.Distance)
            .Select(item => item.Report)
            .Take(4)
            .ToList();

        if (nearbyReports.Count < 3)
        {
            nearbyReports.AddRange(activeReports
                .Where(report => nearbyReports.All(selected => selected.Id != report.Id))
                .OrderByDescending(report => ReportIntelligenceRules.CalculatePriorityScore(report))
                .Take(4 - nearbyReports.Count));
        }

        var points = new List<RoutePoint>
        {
            new() { Lat = destination.Lat - 0.0105, Lng = destination.Lng - 0.0085 }
        };

        points.AddRange(nearbyReports.Select(report => new RoutePoint
        {
            Lat = report.Latitude,
            Lng = report.Longitude
        }));

        points.Add(new RoutePoint { Lat = destination.Lat, Lng = destination.Lng });

        return EnsureTwoPoints(points, destination);
    }

    private static List<RoutePoint> BuildOptimizedRoutePoints(EssentialDestinationResponse destination)
    {
        return EnsureTwoPoints(
        [
            new RoutePoint { Lat = destination.Lat - 0.0120, Lng = destination.Lng - 0.0120 },
            new RoutePoint { Lat = destination.Lat - 0.0080, Lng = destination.Lng - 0.0155 },
            new RoutePoint { Lat = destination.Lat - 0.0035, Lng = destination.Lng - 0.0100 },
            new RoutePoint { Lat = destination.Lat, Lng = destination.Lng }
        ], destination);
    }

    private static List<RoutePoint> EnsureTwoPoints(List<RoutePoint> points, EssentialDestinationResponse destination)
    {
        if (points.Count >= 2)
        {
            return points;
        }

        return
        [
            new RoutePoint { Lat = destination.Lat - 0.01, Lng = destination.Lng - 0.01 },
            new RoutePoint { Lat = destination.Lat, Lng = destination.Lng }
        ];
    }

    private static PitchRouteScenarioResponse BuildScenario(string label, RouteScoreResponse score, List<RoutePoint> points, string summary, string recommendation)
    {
        return new PitchRouteScenarioResponse
        {
            Label = label,
            Summary = summary,
            AccessibilityPercent = score.AccessibilityPercent,
            LevelLabel = score.LevelLabel,
            DistanceLabel = score.GoogleDistanceLabel ?? score.RouteLengthLabel,
            DurationLabel = score.DurationLabel ?? "Tiempo no disponible",
            BarrierCount = score.NearbyReports,
            CriticalBarrierCount = score.ImpactReports.Count(report => report.Severity >= 3 || report.PriorityScore >= 85),
            MainRisk = score.IssueBreakdown.FirstOrDefault()?.TypeLabel ?? "Sin barreras críticas cercanas",
            Recommendation = recommendation,
            IssueBreakdown = score.IssueBreakdown,
            ImpactReports = score.ImpactReports.Take(4).ToList(),
            Points = points
        };
    }
}
