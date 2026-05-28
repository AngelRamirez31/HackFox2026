using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/routes")]
public class RoutesController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly AccessibilityScoringService _scoringService;

    public RoutesController(IReportRepository reports, AccessibilityScoringService scoringService)
    {
        _reports = reports;
        _scoringService = scoringService;
    }

    [HttpPost("score")]
    public async Task<ActionResult<RouteScoreResponse>> ScoreRoute([FromBody] RouteScoreRequest request)
    {
        if (request.Points.Count < 2)
        {
            return BadRequest(new { message = "La ruta debe tener al menos dos puntos." });
        }

        if (request.Points.Any(point => point.Lat is < -90 or > 90 || point.Lng is < -180 or > 180))
        {
            return BadRequest(new { message = "La ruta contiene coordenadas inválidas." });
        }

        var reports = await _reports.GetAllAsync();
        var result = _scoringService.CalculateScore(request, reports);
        return Ok(result);
    }
}
