using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class AccessibilityScoringService
{
    public RouteScoreResponse CalculateScore(RouteScoreRequest request, IEnumerable<Report> reports)
    {
        var routePoints = NormalizeRoutePoints(request.Points);
        var activeReports = reports.Where(report => report.Status == "active").ToList();

        var impactReports = activeReports
            .Select(report => new ReportImpact(report, GeoUtils.DistanceToRouteMeters(report, routePoints), GetPenalty(report)))
            .Where(impact => impact.DistanceMeters <= request.RadiusMeters)
            .OrderByDescending(impact => impact.Report.Severity)
            .ThenBy(impact => impact.DistanceMeters)
            .ThenByDescending(impact => impact.Report.Confirmations)
            .ToList();

        var reportPenalty = impactReports.Count * 10;
        var score = Math.Clamp(100 - reportPenalty, 0, 100);
        var groupedWarnings = impactReports
            .GroupBy(impact => impact.Report.Type)
            .OrderByDescending(group => group.Count())
            .ThenByDescending(group => group.Max(impact => impact.Report.Severity))
            .Select(group => $"{group.Count()} {ReportRules.GetTypeLabel(group.Key).ToLowerInvariant()}")
            .ToList();

        var routeLengthMeters = GeoUtils.RouteLengthMeters(routePoints);
        var impactResponses = impactReports.Select(ToImpactResponse).ToList();
        var style = VisualizationRules.GetRouteStyle(score);

        return new RouteScoreResponse
        {
            Score = score,
            AccessibilityPercent = score,
            Level = GetLevel(score),
            LevelLabel = VisualizationRules.GetRouteLevelLabel(score),
            Color = GetColor(score),
            Message = VisualizationRules.GetRouteMessage(score, impactReports.Count),
            RadiusMeters = request.RadiusMeters,
            NearbyReports = impactReports.Count,
            NearbyReportIds = impactReports.Select(impact => impact.Report.Id).ToList(),
            Warnings = groupedWarnings,
            RouteStyle = style,
            Reports = request.IncludeReports ? impactReports.Select(impact => ReportMapper.ToResponse(impact.Report)).ToList() : [],
            ImpactReports = impactResponses,
            PointCount = routePoints.Count,
            RouteLengthMeters = Math.Round(routeLengthMeters, 1),
            RouteLengthLabel = FormatDistance(routeLengthMeters),
            GoogleDistanceMeters = request.DistanceMeters.HasValue ? Math.Round(request.DistanceMeters.Value, 1) : null,
            GoogleDistanceLabel = request.DistanceMeters.HasValue ? FormatDistance(request.DistanceMeters.Value) : null,
            DurationSeconds = request.DurationSeconds.HasValue ? Math.Round(request.DurationSeconds.Value, 1) : null,
            DurationLabel = request.DurationSeconds.HasValue ? FormatDuration(request.DurationSeconds.Value) : null,
            TravelMode = NormalizeTravelMode(request.TravelMode),
            Source = string.IsNullOrWhiteSpace(request.Source) ? "frontend-route" : request.Source.Trim(),
            Bounds = GeoUtils.GetBounds(routePoints),
            Summary = BuildSummary(score, impactReports.Count, groupedWarnings)
        };
    }

    private static List<RoutePoint> NormalizeRoutePoints(IEnumerable<RoutePoint> points)
    {
        var normalized = new List<RoutePoint>();

        foreach (var point in points)
        {
            if (normalized.Count == 0 || GeoUtils.DistanceMeters(normalized[^1].Lat, normalized[^1].Lng, point.Lat, point.Lng) > 1)
            {
                normalized.Add(point);
            }
        }

        return normalized;
    }

    private static RouteImpactReportResponse ToImpactResponse(ReportImpact impact)
    {
        return new RouteImpactReportResponse
        {
            Id = impact.Report.Id,
            Type = impact.Report.Type,
            TypeLabel = ReportRules.GetTypeLabel(impact.Report.Type),
            Description = impact.Report.Description,
            Position = new ReportPositionResponse
            {
                Lat = impact.Report.Latitude,
                Lng = impact.Report.Longitude
            },
            Severity = impact.Report.Severity,
            SeverityLabel = ReportRules.GetSeverityLabel(impact.Report.Severity),
            SeverityColor = VisualizationRules.GetSeverityColor(impact.Report.Severity),
            MarkerIcon = VisualizationRules.GetMarkerIcon(impact.Report.Type),
            DistanceMeters = Math.Round(impact.DistanceMeters, 1),
            DistanceLabel = FormatDistance(impact.DistanceMeters),
            Penalty = Math.Round(impact.Penalty, 1),
            ImpactLevel = GetImpactLevel(impact.Report.Severity),
            ImpactLabel = GetImpactLabel(impact.Report.Severity),
            ImageUrl = impact.Report.ImageUrl ?? string.Empty,
            Confirmations = impact.Report.Confirmations,
            Rejections = impact.Report.Rejections
        };
    }

    private static double GetPenalty(Report report)
    {
        return 10;
    }

    private static string GetLevel(int score)
    {
        return score switch
        {
            >= 80 => "high",
            >= 50 => "medium",
            _ => "low"
        };
    }

    private static string GetColor(int score)
    {
        return score switch
        {
            >= 80 => "green",
            >= 50 => "orange",
            _ => "red"
        };
    }

    private static string GetImpactLevel(int severity)
    {
        return severity switch
        {
            1 => "low",
            2 => "medium",
            3 => "high",
            _ => "medium"
        };
    }

    private static string GetImpactLabel(int severity)
    {
        return severity switch
        {
            1 => "Impacto bajo",
            2 => "Impacto medio",
            3 => "Impacto alto",
            _ => "Impacto medio"
        };
    }

    private static string NormalizeTravelMode(string? travelMode)
    {
        if (string.IsNullOrWhiteSpace(travelMode))
        {
            return "walking";
        }

        return travelMode.Trim().ToLowerInvariant();
    }

    private static string FormatDistance(double meters)
    {
        if (double.IsInfinity(meters) || double.IsNaN(meters))
        {
            return "Sin distancia";
        }

        return meters >= 1000
            ? $"{meters / 1000:0.##} km"
            : $"{meters:0} m";
    }

    private static string FormatDuration(double seconds)
    {
        if (seconds < 60)
        {
            return $"{Math.Max(1, Math.Round(seconds)):0} s";
        }

        var minutes = Math.Round(seconds / 60);
        if (minutes < 60)
        {
            return minutes == 1 ? "1 min" : $"{minutes:0} min";
        }

        var hours = Math.Floor(minutes / 60);
        var remainingMinutes = minutes % 60;
        return remainingMinutes == 0
            ? $"{hours:0} h"
            : $"{hours:0} h {remainingMinutes:0} min";
    }

    private static string BuildSummary(int score, int nearbyReports, IReadOnlyList<string> warnings)
    {
        if (nearbyReports == 0)
        {
            return "Ruta sin barreras activas reportadas dentro del radio analizado.";
        }

        var prefix = score switch
        {
            >= 80 => "Ruta mayormente accesible",
            >= 50 => "Ruta intermedia",
            _ => "Ruta poco accesible"
        };

        var warningText = warnings.Count > 0 ? string.Join(", ", warnings.Take(3)) : "barreras cercanas";
        return $"{prefix}: se detectaron {nearbyReports} reportes cercanos ({warningText}).";
    }

    private sealed record ReportImpact(Report Report, double DistanceMeters, double Penalty);
}
