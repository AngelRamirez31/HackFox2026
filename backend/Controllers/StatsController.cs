using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly IReportRepository _reports;

    public StatsController(IReportRepository reports)
    {
        _reports = reports;
    }

    [HttpGet]
    public async Task<ActionResult<StatsResponse>> GetStats()
    {
        var reports = await _reports.GetAllAsync();
        var reportsByType = reports
            .GroupBy(report => report.Type)
            .ToDictionary(group => group.Key, group => group.Count());

        var reportsByStatus = reports
            .GroupBy(report => report.Status)
            .ToDictionary(group => group.Key, group => group.Count());

        var mostCommonType = reportsByType
            .OrderByDescending(pair => pair.Value)
            .Select(pair => pair.Key)
            .FirstOrDefault() ?? "none";

        var activeReports = reports.Where(report => ReportRules.Normalize(report.Status) == "active").ToList();

        return Ok(new StatsResponse
        {
            TotalReports = reports.Count,
            ActiveReports = activeReports.Count,
            ResolvedReports = reports.Count(report => ReportRules.Normalize(report.Status) == "resolved"),
            RejectedReports = reports.Count(report => ReportRules.Normalize(report.Status) == "rejected"),
            HighSeverityReports = activeReports.Count(report => report.Severity == 3),
            MediumSeverityReports = activeReports.Count(report => report.Severity == 2),
            LowSeverityReports = activeReports.Count(report => report.Severity == 1),
            RequiresVerificationReports = activeReports.Count(ReportIntelligenceRules.RequiresVerification),
            HighTrustReports = activeReports.Count(report => ReportIntelligenceRules.CalculateTrustScore(report) >= 75),
            CriticalPriorityReports = activeReports.Count(report => ReportIntelligenceRules.CalculatePriorityScore(report) >= 85),
            MostCommonType = mostCommonType,
            MostCommonTypeLabel = mostCommonType == "none" ? "Sin reportes" : ReportRules.GetTypeLabel(mostCommonType),
            ReportsByType = reportsByType,
            ReportTypeLabels = ReportRules.TypeLabels.ToDictionary(pair => pair.Key, pair => pair.Value),
            ReportsByStatus = reportsByStatus,
            StatusLabels = ReportRules.Statuses.ToDictionary(status => status, VisualizationRules.GetStatusLabel),
            GeneratedAt = DateTime.UtcNow
        });
    }
}
