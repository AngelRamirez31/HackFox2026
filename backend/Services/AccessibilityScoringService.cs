using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class AccessibilityScoringService
{
    public RouteScoreResponse CalculateScore(RouteScoreRequest request, IEnumerable<Report> reports)
    {
        var activeReports = reports.Where(report => report.Status == "active").ToList();
        var nearbyReports = activeReports
            .Where(report => GeoUtils.IsNearAnyPoint(report, request.Points, request.RadiusMeters))
            .OrderByDescending(report => report.Severity)
            .ThenByDescending(report => report.Confirmations)
            .ToList();

        var totalPenalty = nearbyReports.Sum(GetPenalty);
        var score = Math.Clamp(100 - (int)Math.Round(totalPenalty), 0, 100);
        var groupedWarnings = nearbyReports
            .GroupBy(report => report.Type)
            .OrderByDescending(group => group.Count())
            .ThenByDescending(group => group.Max(report => report.Severity))
            .Select(group => $"{group.Count()} {ReportRules.GetTypeLabel(group.Key).ToLowerInvariant()}")
            .ToList();

        return new RouteScoreResponse
        {
            Score = score,
            Level = GetLevel(score),
            LevelLabel = VisualizationRules.GetRouteLevelLabel(score),
            Color = GetColor(score),
            Message = VisualizationRules.GetRouteMessage(score, nearbyReports.Count),
            RadiusMeters = request.RadiusMeters,
            NearbyReports = nearbyReports.Count,
            NearbyReportIds = nearbyReports.Select(report => report.Id).ToList(),
            Warnings = groupedWarnings,
            RouteStyle = VisualizationRules.GetRouteStyle(score),
            Reports = nearbyReports.Select(ReportMapper.ToResponse).ToList()
        };
    }

    private static double GetPenalty(Report report)
    {
        var basePenalty = report.Severity switch
        {
            1 => 5,
            2 => 10,
            3 => 18,
            _ => 10
        };

        var confirmationMultiplier = Math.Min(1.5, 1 + report.Confirmations * 0.1);
        var rejectionMultiplier = Math.Max(0.5, 1 - report.Rejections * 0.1);
        var ageMultiplier = report.CreatedAt < DateTime.UtcNow.AddDays(-30) ? 0.6 : 1.0;

        return basePenalty * confirmationMultiplier * rejectionMultiplier * ageMultiplier;
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
            >= 50 => "yellow",
            _ => "red"
        };
    }
}
