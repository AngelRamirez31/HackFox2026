using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/impact")]
public class ImpactController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly ImpactSummaryService _impact;

    public ImpactController(IReportRepository reports, ImpactSummaryService impact)
    {
        _reports = reports;
        _impact = impact;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ImpactSummaryResponse>> GetSummary([FromQuery] int hotspotLimit = 5)
    {
        if (hotspotLimit is < 1 or > 20)
        {
            return BadRequest(new { message = "hotspotLimit debe estar entre 1 y 20." });
        }

        var reports = await _reports.GetAllAsync();
        return Ok(_impact.Build(reports, hotspotLimit));
    }
}
