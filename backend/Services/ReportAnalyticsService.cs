using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class ReportAnalyticsService
{
    public DashboardSummaryResponse BuildDashboardSummary(
        IEnumerable<Report> reports,
        int recentLimit = 5,
        int hotspotLimit = 3,
        double hotspotRadiusMeters = 120)
    {
        var list = reports.ToList();
        var activeReports = list.Where(report => ReportRules.Normalize(report.Status) == "active").ToList();
        var reportsByType = list
            .GroupBy(report => report.Type)
            .ToDictionary(group => group.Key, group => group.Count());

        var reportsByStatus = list
            .GroupBy(report => ReportRules.Normalize(report.Status))
            .ToDictionary(group => group.Key, group => group.Count());

        var mostCommonBarrier = reportsByType
            .OrderByDescending(pair => pair.Value)
            .ThenBy(pair => pair.Key)
            .Select(pair => pair.Key)
            .FirstOrDefault() ?? "none";

        var lastReport = list
            .OrderByDescending(report => report.CreatedAt)
            .FirstOrDefault();

        recentLimit = Math.Clamp(recentLimit, 1, 20);
        hotspotLimit = Math.Clamp(hotspotLimit, 1, 20);
        hotspotRadiusMeters = Math.Clamp(hotspotRadiusMeters, 30, 500);

        return new DashboardSummaryResponse
        {
            TotalReports = list.Count,
            ActiveReports = activeReports.Count,
            ResolvedReports = list.Count(report => ReportRules.Normalize(report.Status) == "resolved"),
            RejectedReports = list.Count(report => ReportRules.Normalize(report.Status) == "rejected"),
            HighPriorityReports = activeReports.Count(report => report.Severity == 3),
            MediumPriorityReports = activeReports.Count(report => report.Severity == 2),
            LowPriorityReports = activeReports.Count(report => report.Severity == 1),
            ReportsWithImages = list.Count(report => !string.IsNullOrWhiteSpace(report.ImageUrl)),
            RecentReportsCount = list.Count(report => report.CreatedAt >= DateTime.UtcNow.AddDays(-7)),
            MostCommonBarrier = mostCommonBarrier,
            MostCommonBarrierLabel = mostCommonBarrier == "none" ? "Sin reportes" : ReportRules.GetTypeLabel(mostCommonBarrier),
            AverageSeverity = activeReports.Count == 0 ? 0 : Math.Round(activeReports.Average(report => report.Severity), 2),
            LastReportCreatedAt = lastReport?.CreatedAt,
            LastReportCreatedAtDisplay = lastReport is null ? "Sin reportes" : VisualizationRules.GetCreatedAtDisplay(lastReport.CreatedAt),
            GeneratedAt = DateTime.UtcNow,
            ReportsByType = reportsByType,
            ReportsByStatus = reportsByStatus,
            RecentReports = list
                .OrderByDescending(report => report.CreatedAt)
                .Take(recentLimit)
                .Select(ReportMapper.ToResponse)
                .ToList(),
            TopHotspots = BuildHotspots(activeReports, hotspotLimit, hotspotRadiusMeters)
        };
    }

    public List<HotspotResponse> BuildHotspots(IEnumerable<Report> reports, int limit = 5, double radiusMeters = 120)
    {
        limit = Math.Clamp(limit, 1, 50);
        radiusMeters = Math.Clamp(radiusMeters, 30, 500);

        var activeReports = reports
            .Where(report => ReportRules.Normalize(report.Status) == "active")
            .OrderByDescending(report => report.Severity)
            .ThenByDescending(report => report.Confirmations)
            .ThenByDescending(report => report.CreatedAt)
            .ToList();

        var assigned = new HashSet<int>();
        var hotspots = new List<HotspotResponse>();

        foreach (var candidate in activeReports)
        {
            if (assigned.Contains(candidate.Id))
            {
                continue;
            }

            var cluster = activeReports
                .Where(report => !assigned.Contains(report.Id) &&
                    GeoUtils.DistanceMeters(candidate.Latitude, candidate.Longitude, report.Latitude, report.Longitude) <= radiusMeters)
                .OrderByDescending(report => report.Severity)
                .ThenBy(report => GeoUtils.DistanceMeters(candidate.Latitude, candidate.Longitude, report.Latitude, report.Longitude))
                .ToList();

            if (cluster.Count == 0)
            {
                continue;
            }

            foreach (var report in cluster)
            {
                assigned.Add(report.Id);
            }

            var averageSeverity = cluster.Average(report => report.Severity);
            var mainIssue = cluster
                .GroupBy(report => report.Type)
                .OrderByDescending(group => group.Count())
                .ThenByDescending(group => group.Max(report => report.Severity))
                .Select(group => group.Key)
                .FirstOrDefault() ?? "other";

            hotspots.Add(new HotspotResponse
            {
                CenterLat = Math.Round(cluster.Average(report => report.Latitude), 6),
                CenterLng = Math.Round(cluster.Average(report => report.Longitude), 6),
                ReportCount = cluster.Count,
                AverageSeverity = Math.Round(averageSeverity, 2),
                Label = GetHotspotLabel(cluster.Count, averageSeverity),
                MainIssue = mainIssue,
                MainIssueLabel = ReportRules.GetTypeLabel(mainIssue),
                SeverityColor = VisualizationRules.GetSeverityColor((int)Math.Round(averageSeverity, MidpointRounding.AwayFromZero)),
                ReportIds = cluster.Select(report => report.Id).ToList(),
                Reports = cluster.Select(ReportMapper.ToMapResponse).ToList()
            });
        }

        return hotspots
            .OrderByDescending(hotspot => hotspot.ReportCount)
            .ThenByDescending(hotspot => hotspot.AverageSeverity)
            .Take(limit)
            .ToList();
    }

    private static string GetHotspotLabel(int reportCount, double averageSeverity)
    {
        if (reportCount >= 4 || averageSeverity >= 2.6)
        {
            return "Zona crítica";
        }

        if (reportCount >= 2)
        {
            return "Zona de atención";
        }

        return "Punto reportado";
    }
}
