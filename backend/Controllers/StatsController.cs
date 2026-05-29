using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly ReportAnalyticsService _analytics;

    public StatsController(IReportRepository reports, ReportAnalyticsService analytics)
    {
        _reports = reports;
        _analytics = analytics;
    }

    [HttpGet]
    public async Task<ActionResult<StatsResponse>> GetStats()
    {
        var reports = await _reports.GetAllAsync();
        return Ok(_analytics.BuildStats(reports));
    }
}
