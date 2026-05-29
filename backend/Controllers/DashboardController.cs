using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly ReportAnalyticsService _analytics;

    public DashboardController(IReportRepository reports, ReportAnalyticsService analytics)
    {
        _reports = reports;
        _analytics = analytics;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary(
        [FromQuery] int recentLimit = 5,
        [FromQuery] int hotspotLimit = 3,
        [FromQuery] double hotspotRadiusMeters = 120)
    {
        if (recentLimit is < 1 or > 20)
        {
            return BadRequest(new { message = "recentLimit debe estar entre 1 y 20." });
        }

        if (hotspotLimit is < 1 or > 20)
        {
            return BadRequest(new { message = "hotspotLimit debe estar entre 1 y 20." });
        }

        if (hotspotRadiusMeters is < 30 or > 500)
        {
            return BadRequest(new { message = "hotspotRadiusMeters debe estar entre 30 y 500 metros." });
        }

        var reports = await _reports.GetAllAsync();
        return Ok(_analytics.BuildDashboardSummary(reports, recentLimit, hotspotLimit, hotspotRadiusMeters));
    }
}
