using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class AccessibilityScoringService
{
    public RouteScoreResponse CalculateScore(RouteScoreRequest request, IEnumerable<Report> reports)
    {
        var routePoints = NormalizeRoutePoints(request.Points);
        var mobilityProfile = ReportIntelligenceRules.NormalizeMobilityProfile(request.MobilityProfile);
        var activeReports = reports.Where(report => ReportRules.Normalize(report.Status) == "active").ToList();

        var impactReports = activeReports
            .Select(report =>
            {
                var distance = GeoUtils.DistanceToRouteMeters(report, routePoints);
                var penalty = ReportIntelligenceRules.GetAccessibilityPenalty(report, mobilityProfile, distance);
                return new ReportImpact(report, distance, penalty);
            })
            .Where(impact => impact.DistanceMeters <= request.RadiusMeters)
            .OrderByDescending(impact => impact.Penalty)
            .ThenByDescending(impact => impact.Report.Severity)
            .ThenBy(impact => impact.DistanceMeters)
            .ThenByDescending(impact => impact.Report.Confirmations)
            .ToList();

        var totalPenalty = impactReports.Sum(impact => impact.Penalty);
        var score = Math.Clamp((int)Math.Round(100 - totalPenalty), 0, 100);
        var issueBreakdown = BuildIssueBreakdown(impactReports);
        var groupedWarnings = issueBreakdown
            .Select(issue => $"{issue.Count} {issue.PluralLabel}")
            .ToList();

        var routeLengthMeters = GeoUtils.RouteLengthMeters(routePoints);
        var impactResponses = impactReports.Select(ToImpactResponse).ToList();
        var style = VisualizationRules.GetRouteStyle(score);
        var explanation = BuildExplanation(score, impactReports, issueBreakdown, mobilityProfile);

        return new RouteScoreResponse
        {
            Score = score,
            AccessibilityPercent = score,
            Level = GetLevel(score),
            LevelLabel = VisualizationRules.GetRouteLevelLabel(score),
            Color = GetColor(score),
            Message = VisualizationRules.GetRouteMessage(score, impactReports.Count),
            Explanation = explanation,
            BeforeLeavingRecommendation = BuildBeforeLeavingRecommendation(score, impactReports, mobilityProfile),
            MobilityProfile = mobilityProfile,
            MobilityProfileLabel = ReportIntelligenceRules.GetMobilityProfileLabel(mobilityProfile),
            RadiusMeters = request.RadiusMeters,
            NearbyReports = impactReports.Count,
            PenalizedReports = impactReports.Count(impact => impact.Penalty > 0),
            TotalPenalty = Math.Round(totalPenalty, 1),
            NearbyReportIds = impactReports.Select(impact => impact.Report.Id).ToList(),
            Warnings = groupedWarnings,
            IssueBreakdown = issueBreakdown,
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
        var trustScore = ReportIntelligenceRules.CalculateTrustScore(impact.Report);
        var priorityScore = ReportIntelligenceRules.CalculatePriorityScore(impact.Report, impact.DistanceMeters);

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
            EffectiveWeight = ReportIntelligenceRules.GetReportEffectiveWeight(impact.Report),
            ImpactLevel = GetImpactLevel(impact.Report.Severity),
            ImpactLabel = GetImpactLabel(impact.Report.Severity),
            ImageUrl = impact.Report.ImageUrl ?? string.Empty,
            Confirmations = impact.Report.Confirmations,
            Rejections = impact.Report.Rejections,
            TrustScore = trustScore,
            TrustLabel = ReportIntelligenceRules.GetTrustLabel(trustScore),
            RequiresVerification = ReportIntelligenceRules.RequiresVerification(impact.Report),
            VerificationLabel = ReportIntelligenceRules.GetVerificationLabel(impact.Report),
            PriorityScore = priorityScore,
            PriorityLabel = ReportIntelligenceRules.GetPriorityLabel(priorityScore)
        };
    }

    private static List<RouteIssueBreakdownResponse> BuildIssueBreakdown(IEnumerable<ReportImpact> impacts)
    {
        return impacts
            .GroupBy(impact => impact.Report.Type)
            .Select(group => new RouteIssueBreakdownResponse
            {
                Type = group.Key,
                TypeLabel = ReportRules.GetTypeLabel(group.Key),
                PluralLabel = ReportIntelligenceRules.GetPluralTypeLabel(group.Key),
                Count = group.Count(),
                TotalPenalty = Math.Round(group.Sum(impact => impact.Penalty), 1),
                AverageSeverity = Math.Round(group.Average(impact => impact.Report.Severity), 2)
            })
            .OrderByDescending(issue => issue.TotalPenalty)
            .ThenByDescending(issue => issue.Count)
            .ToList();
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

    private static string BuildExplanation(int score, IReadOnlyList<ReportImpact> impacts, IReadOnlyList<RouteIssueBreakdownResponse> breakdown, string mobilityProfile)
    {
        if (impacts.Count == 0)
        {
            return "La ruta recibió 100% porque no pasa cerca de barreras activas dentro del radio analizado.";
        }

        var issueText = JoinNaturalList(breakdown.Select(issue => $"{issue.Count} {issue.PluralLabel}").Take(4).ToList());
        var verificationCount = impacts.Count(impact => ReportIntelligenceRules.RequiresVerification(impact.Report));
        var lowTrustCount = impacts.Count(impact => ReportIntelligenceRules.CalculateTrustScore(impact.Report) < 45);
        var profileText = mobilityProfile == "default"
            ? "Se usó el perfil general de movilidad."
            : $"Se usó el perfil {ReportIntelligenceRules.GetMobilityProfileLabel(mobilityProfile).ToLowerInvariant()}, por eso algunas barreras pesan más.";
        var verificationText = verificationCount > 0
            ? $" {verificationCount} reporte{(verificationCount == 1 ? "" : "s")} requiere{(verificationCount == 1 ? "" : "n")} verificación y afectó{(verificationCount == 1 ? "" : "n")} menos el score."
            : string.Empty;
        var trustText = lowTrustCount > 0
            ? $" {lowTrustCount} reporte{(lowTrustCount == 1 ? "" : "s")} tiene{(lowTrustCount == 1 ? "" : "n")} baja confianza."
            : string.Empty;

        return $"Esta ruta recibió {score}% porque pasa cerca de {issueText}. {profileText}{verificationText}{trustText}";
    }

    private static string BuildBeforeLeavingRecommendation(int score, IReadOnlyList<ReportImpact> impacts, string mobilityProfile)
    {
        if (impacts.Count == 0)
        {
            return "Antes de salir: no hay obstáculos activos reportados cerca de esta ruta, pero mantente atento a cambios recientes en la vía.";
        }

        var caution = score switch
        {
            >= 80 => "precaución baja",
            >= 50 => "precaución media",
            _ => "precaución alta"
        };

        var profileAdvice = mobilityProfile switch
        {
            "wheelchair" => "se recomienda revisar alternativas si usas silla de ruedas",
            "walker" => "se recomienda avanzar con apoyo o revisar alternativas si usas bastón o andadera",
            "elderly" => "se recomienda evitar prisas y revisar cruces antes de salir",
            "stroller" => "se recomienda revisar alternativas si llevas carriola",
            _ => "se recomienda revisar alternativas si necesitas una ruta más continua"
        };

        return $"Antes de salir: esta ruta tiene {caution}, pasa cerca de {impacts.Count} obstáculo{(impacts.Count == 1 ? "" : "s")} y {profileAdvice}.";
    }

    private static string JoinNaturalList(IReadOnlyList<string> items)
    {
        if (items.Count == 0)
        {
            return "barreras cercanas";
        }

        if (items.Count == 1)
        {
            return items[0];
        }

        if (items.Count == 2)
        {
            return $"{items[0]} y {items[1]}";
        }

        return $"{string.Join(", ", items.Take(items.Count - 1))} y {items[^1]}";
    }

    private sealed record ReportImpact(Report Report, double DistanceMeters, double Penalty);
}
