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

        return Ok(new StatsResponse
        {
            TotalReports = reports.Count,
            ActiveReports = reports.Count(report => report.Status == "active"),
            ResolvedReports = reports.Count(report => report.Status == "resolved"),
            RejectedReports = reports.Count(report => report.Status == "rejected"),
            HighSeverityReports = reports.Count(report => report.Severity == 3 && report.Status == "active"),
            MostCommonType = mostCommonType,
            MostCommonTypeLabel = mostCommonType == "none" ? "Sin reportes" : ReportRules.GetTypeLabel(mostCommonType),
            ReportsByType = reportsByType,
            ReportsByStatus = reportsByStatus
        });
    }
}
