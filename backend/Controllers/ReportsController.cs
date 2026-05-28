using HackFox2026.DTOs;
using HackFox2026.Models;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly LocalFileStorageService _fileStorage;

    public ReportsController(IReportRepository reports, LocalFileStorageService fileStorage)
    {
        _reports = reports;
        _fileStorage = fileStorage;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReportResponse>>> GetReports([FromQuery] string? status, [FromQuery] string? type)
    {
        var reports = await _reports.GetAllAsync();
        var filtered = reports.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = ReportRules.Normalize(status);
            if (!ReportRules.IsValidStatus(normalizedStatus))
            {
                return BadRequest(new { message = "Estatus inválido." });
            }

            filtered = filtered.Where(report => report.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalizedType = ReportRules.Normalize(type);
            if (!ReportRules.IsValidType(normalizedType))
            {
                return BadRequest(new { message = "Tipo de barrera inválido." });
            }

            filtered = filtered.Where(report => report.Type == normalizedType);
        }

        return Ok(filtered.Select(ReportMapper.ToResponse));
    }

    [HttpGet("nearby")]
    public async Task<ActionResult<IEnumerable<ReportResponse>>> GetNearbyReports(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] double radiusMeters = 500)
    {
        if (lat is < -90 or > 90 || lng is < -180 or > 180)
        {
            return BadRequest(new { message = "Coordenadas inválidas." });
        }

        if (radiusMeters is < 10 or > 5000)
        {
            return BadRequest(new { message = "El radio debe estar entre 10 y 5000 metros." });
        }

        var reports = await _reports.GetAllAsync();
        var nearby = reports
            .Where(report => GeoUtils.DistanceMeters(lat, lng, report.Latitude, report.Longitude) <= radiusMeters)
            .Select(ReportMapper.ToResponse);

        return Ok(nearby);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReportResponse>> GetReportById(int id)
    {
        var report = await _reports.GetByIdAsync(id);
        if (report is null)
        {
            return NotFound(new { message = "Reporte no encontrado." });
        }

        return Ok(ReportMapper.ToResponse(report));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LocalFileStorageService.MaxImageSizeBytes + 1024 * 1024)]
    public async Task<ActionResult<ReportResponse>> CreateReport([FromForm] CreateReportRequest request)
    {
        var type = ReportRules.Normalize(request.Type);
        if (!ReportRules.IsValidType(type))
        {
            return BadRequest(new { message = "Tipo de barrera inválido." });
        }

        var imageResult = await _fileStorage.SaveReportImageAsync(request.Image);
        if (!imageResult.Success)
        {
            return BadRequest(new { message = imageResult.Error });
        }

        var description = request.Description?.Trim() ?? string.Empty;
        var report = new Report
        {
            Type = type,
            Description = description,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Severity = request.Severity,
            Status = "active",
            ImageUrl = imageResult.ImageUrl
        };

        var created = await _reports.AddAsync(report);
        var response = ReportMapper.ToResponse(created);

        return CreatedAtAction(nameof(GetReportById), new { id = created.Id }, response);
    }

    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<ReportResponse>> UpdateStatus(int id, [FromBody] UpdateReportStatusRequest request)
    {
        var status = ReportRules.Normalize(request.Status);
        if (!ReportRules.IsValidStatus(status))
        {
            return BadRequest(new { message = "Estatus inválido." });
        }

        var report = await _reports.UpdateStatusAsync(id, status);
        if (report is null)
        {
            return NotFound(new { message = "Reporte no encontrado." });
        }

        return Ok(ReportMapper.ToResponse(report));
    }

    [HttpPost("{id:int}/confirm")]
    public async Task<ActionResult<ReportResponse>> ConfirmReport(int id)
    {
        var report = await _reports.ConfirmAsync(id);
        if (report is null)
        {
            return NotFound(new { message = "Reporte no encontrado." });
        }

        return Ok(ReportMapper.ToResponse(report));
    }

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<ReportResponse>> RejectReport(int id)
    {
        var report = await _reports.RejectAsync(id);
        if (report is null)
        {
            return NotFound(new { message = "Reporte no encontrado." });
        }

        return Ok(ReportMapper.ToResponse(report));
    }
}
