using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class ReportAnalyticsService
{
    public StatsResponse BuildStats(IReadOnlyList<Report> reports)
    {
        var reportsByType = reports
            .GroupBy(report => report.Type)
            .ToDictionary(group => group.Key, group => group.Count());

        var reportsByStatus = reports
            .GroupBy(report => report.Status)
            .ToDictionary(group => group.Key, group => group.Count());

        var mostCommon = reportsByType
            .OrderByDescending(pair => pair.Value)
            .FirstOrDefault();

        var activeReports = reports.Where(report => report.Status == "active").ToList();
        var averageSeverity = reports.Count == 0 ? 0 : Math.Round(reports.Average(report => report.Severity), 2);
        var averageActiveSeverity = activeReports.Count == 0 ? 0 : Math.Round(activeReports.Average(report => report.Severity), 2);
        var reportsWithImages = reports.Count(report => !string.IsNullOrWhiteSpace(report.ImageUrl));
        var latestReport = reports.OrderByDescending(report => report.CreatedAt).FirstOrDefault();

        return new StatsResponse
        {
            TotalReports = reports.Count,
            ActiveReports = activeReports.Count,
            ResolvedReports = reports.Count(report => report.Status == "resolved"),
            RejectedReports = reports.Count(report => report.Status == "rejected"),
            HighSeverityReports = activeReports.Count(report => report.Severity == 3),
            MediumSeverityReports = activeReports.Count(report => report.Severity == 2),
            LowSeverityReports = activeReports.Count(report => report.Severity == 1),
            MostCommonType = mostCommon.Key ?? "none",
            MostCommonTypeLabel = string.IsNullOrWhiteSpace(mostCommon.Key) ? "Sin reportes" : ReportRules.GetTypeLabel(mostCommon.Key),
            MostCommonTypeCount = mostCommon.Value,
            ReportsWithImages = reportsWithImages,
            ReportsWithoutImages = Math.Max(0, reports.Count - reportsWithImages),
            AverageSeverity = averageSeverity,
            AverageActiveSeverity = averageActiveSeverity,
            LastReportCreatedAt = latestReport?.CreatedAt,
            LastReportCreatedAtDisplay = latestReport is null ? "Sin reportes" : VisualizationRules.GetCreatedAtDisplay(latestReport.CreatedAt),
            ReportsByType = reportsByType,
            ReportTypeLabels = ReportRules.TypeLabels.ToDictionary(pair => pair.Key, pair => pair.Value),
            ReportsByStatus = reportsByStatus,
            StatusLabels = ReportRules.Statuses.ToDictionary(status => status, VisualizationRules.GetStatusLabel),
            RecentReports = reports
                .OrderByDescending(report => report.CreatedAt)
                .Take(5)
                .Select(ReportMapper.ToResponse)
                .ToList(),
            GeneratedAt = DateTime.UtcNow
        };
    }

    public DashboardSummaryResponse BuildDashboardSummary(IReadOnlyList<Report> reports, int recentLimit = 5, int hotspotLimit = 3)
    {
        var stats = BuildStats(reports);
        var mostCommonCount = stats.MostCommonType == "none" ? 0 : stats.ReportsByType.GetValueOrDefault(stats.MostCommonType);
        var averageRounded = stats.AverageSeverity <= 0 ? 0 : (int)Math.Round(stats.AverageSeverity);

        return new DashboardSummaryResponse
        {
            TotalReports = stats.TotalReports,
            ActiveReports = stats.ActiveReports,
            ResolvedReports = stats.ResolvedReports,
            RejectedReports = stats.RejectedReports,
            HighPriorityReports = stats.HighSeverityReports,
            ReportsWithImages = stats.ReportsWithImages,
            AverageSeverity = stats.AverageSeverity,
            AverageSeverityRounded = averageRounded,
            AverageSeverityLabel = averageRounded == 0 ? "Sin datos" : ReportRules.GetSeverityLabel(averageRounded),
            MostCommonBarrier = stats.MostCommonType,
            MostCommonBarrierLabel = stats.MostCommonTypeLabel,
            MostCommonBarrierCount = mostCommonCount,
            LastReportCreatedAt = stats.LastReportCreatedAt,
            LastReportCreatedAtDisplay = stats.LastReportCreatedAtDisplay,
            OpenIssueRatePercent = stats.TotalReports == 0 ? 0 : (int)Math.Round(stats.ActiveReports * 100.0 / stats.TotalReports),
            RecentReports = reports
                .OrderByDescending(report => report.CreatedAt)
                .Take(Math.Clamp(recentLimit, 1, 20))
                .Select(ReportMapper.ToResponse)
                .ToList(),
            TopHotspots = BuildHotspots(reports, radiusMeters: 140, minReports: 2, limit: Math.Clamp(hotspotLimit, 1, 10), includeReports: false),
            GeneratedAt = DateTime.UtcNow
        };
    }

    public List<HotspotResponse> BuildHotspots(
        IEnumerable<Report> reports,
        double radiusMeters = 140,
        int minReports = 2,
        int limit = 10,
        bool includeReports = true)
    {
        radiusMeters = Math.Clamp(radiusMeters, 30, 1000);
        minReports = Math.Clamp(minReports, 1, 20);
        limit = Math.Clamp(limit, 1, 50);

        var activeReports = reports
            .Where(report => report.Status == "active")
            .OrderByDescending(report => report.Severity)
            .ThenByDescending(report => report.CreatedAt)
            .ToList();

        var usedIds = new HashSet<int>();
        var hotspots = new List<HotspotResponse>();

        foreach (var seed in activeReports)
        {
            if (usedIds.Contains(seed.Id))
            {
                continue;
            }

            var group = activeReports
                .Where(report => !usedIds.Contains(report.Id) && GeoUtils.DistanceMeters(seed.Latitude, seed.Longitude, report.Latitude, report.Longitude) <= radiusMeters)
                .ToList();

            if (group.Count < minReports)
            {
                continue;
            }

            foreach (var report in group)
            {
                usedIds.Add(report.Id);
            }

            var mainIssue = group
                .GroupBy(report => report.Type)
                .OrderByDescending(typeGroup => typeGroup.Count())
                .ThenByDescending(typeGroup => typeGroup.Max(report => report.Severity))
                .Select(typeGroup => typeGroup.Key)
                .FirstOrDefault() ?? "other";

            var highestSeverity = group.Max(report => report.Severity);
            var averageSeverity = Math.Round(group.Average(report => report.Severity), 2);
            var centerLat = Math.Round(group.Average(report => report.Latitude), 6);
            var centerLng = Math.Round(group.Average(report => report.Longitude), 6);

            hotspots.Add(new HotspotResponse
            {
                CenterLat = centerLat,
                CenterLng = centerLng,
                Position = new ReportPositionResponse { Lat = centerLat, Lng = centerLng },
                ReportCount = group.Count,
                AverageSeverity = averageSeverity,
                HighestSeverity = highestSeverity,
                Label = GetHotspotLabel(group.Count, highestSeverity),
                MainIssue = mainIssue,
                MainIssueLabel = ReportRules.GetTypeLabel(mainIssue),
                MarkerColor = VisualizationRules.GetSeverityColor(highestSeverity),
                ReportIds = group.Select(report => report.Id).OrderBy(id => id).ToList(),
                Reports = includeReports ? group.Select(ReportMapper.ToResponse).ToList() : []
            });
        }

        return hotspots
            .OrderByDescending(hotspot => hotspot.HighestSeverity)
            .ThenByDescending(hotspot => hotspot.ReportCount)
            .ThenByDescending(hotspot => hotspot.AverageSeverity)
            .Take(limit)
            .ToList();
    }

    private static string GetHotspotLabel(int count, int highestSeverity)
    {
        if (highestSeverity >= 3 && count >= 3)
        {
            return "Zona crítica";
        }

        if (highestSeverity >= 3 || count >= 3)
        {
            return "Zona prioritaria";
        }

        return "Zona con reportes";
    }
}
