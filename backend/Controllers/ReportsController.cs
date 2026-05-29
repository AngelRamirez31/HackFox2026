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
    private readonly GeminiVisionService _geminiVisionService;

    public ReportsController(
        IReportRepository reports,
        LocalFileStorageService fileStorage,
        GeminiVisionService geminiVisionService)
    {
        _reports = reports;
        _fileStorage = fileStorage;
        _geminiVisionService = geminiVisionService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReportResponse>>> GetReports(
        [FromQuery] string? status,
        [FromQuery] string? type,
        [FromQuery] string? search,
        [FromQuery] int? minSeverity,
        [FromQuery] int? maxSeverity,
        [FromQuery] int? limit)
    {
        var reports = await _reports.GetAllAsync();
        var validation = ValidateListQuery(status, type, minSeverity, maxSeverity, limit);
        if (validation is not null)
        {
            return validation;
        }

        var filtered = ApplyFilters(reports, status, type, search, minSeverity, maxSeverity, limit);
        return Ok(filtered.Select(ReportMapper.ToResponse));
    }

    [HttpGet("map")]
    public async Task<ActionResult<IEnumerable<MapReportResponse>>> GetMapReports(
        [FromQuery] string? status = "active",
        [FromQuery] string? type = null,
        [FromQuery] string? search = null,
        [FromQuery] int? minSeverity = null,
        [FromQuery] int? maxSeverity = null,
        [FromQuery] int? limit = null,
        [FromQuery] double? north = null,
        [FromQuery] double? south = null,
        [FromQuery] double? east = null,
        [FromQuery] double? west = null)
    {
        var reports = await _reports.GetAllAsync();
        var validation = ValidateListQuery(status, type, minSeverity, maxSeverity, limit);
        if (validation is not null)
        {
            return validation;
        }

        var boundsValidation = ValidateBounds(north, south, east, west);
        if (boundsValidation is not null)
        {
            return boundsValidation;
        }

        var filtered = ApplyFilters(reports, status, type, search, minSeverity, maxSeverity, limit: null);
        filtered = ApplyBounds(filtered, north, south, east, west);

        if (limit.HasValue)
        {
            filtered = filtered.Take(limit.Value);
        }

        return Ok(filtered.Select(ReportMapper.ToMapResponse));
    }

    [HttpGet("options")]
    public IActionResult GetReportOptions()
    {
        return Ok(new
        {
            types = ReportRules.TypeLabels.Select(pair => new
            {
                value = pair.Key,
                label = pair.Value,
                markerIcon = VisualizationRules.GetMarkerIcon(pair.Key)
            }),
            severities = new[]
            {
                new { value = 1, label = "Baja", color = VisualizationRules.GetSeverityColor(1) },
                new { value = 2, label = "Media", color = VisualizationRules.GetSeverityColor(2) },
                new { value = 3, label = "Alta", color = VisualizationRules.GetSeverityColor(3) }
            },
            severityAliases = new[]
            {
                new { value = "baja", numericValue = 1 },
                new { value = "media", numericValue = 2 },
                new { value = "alta", numericValue = 3 }
            },
            statuses = ReportRules.Statuses.Select(status => new
            {
                value = status,
                label = VisualizationRules.GetStatusLabel(status)
            }),
            mapLegend = new[]
            {
                new { label = "Barrera leve", color = VisualizationRules.GetSeverityColor(1), severity = (int?)1, status = (string?)null },
                new { label = "Barrera media", color = VisualizationRules.GetSeverityColor(2), severity = (int?)2, status = (string?)null },
                new { label = "Barrera alta", color = VisualizationRules.GetSeverityColor(3), severity = (int?)3, status = (string?)null },
                new { label = "Reporte resuelto", color = "#16a34a", severity = (int?)null, status = "resolved" },
                new { label = "Reporte rechazado", color = "#6b7280", severity = (int?)null, status = "rejected" }
            },
            acceptedCreateFields = new
            {
                type = new[] { "type", "tipo" },
                description = new[] { "description", "descripcion" },
                latitude = new[] { "latitude", "latitud", "lat" },
                longitude = new[] { "longitude", "longitud", "lng" },
                severity = new[] { "severity", "severidad" },
                image = new[] { "image", "foto" },
                useGemini = new[] { "useGemini", "usarGemini", "analyzeImage", "analizarImagen" }
            },
            geminiAssistedEndpoint = "/api/reports/analyze-and-create"
        });
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
    public async Task<ActionResult<ReportResponse>> CreateReport([FromForm] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var result = await CreateReportCoreAsync(request, request.ShouldUseGemini(), requireImageForGemini: request.ShouldUseGemini(), cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetReportById), new { id = result.Response!.Report.Id }, result.Response.Report);
    }

    [HttpPost("analyze-and-create")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LocalFileStorageService.MaxImageSizeBytes + 1024 * 1024)]
    public async Task<ActionResult<ReportCreationResponse>> AnalyzeAndCreateReport([FromForm] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var result = await CreateReportCoreAsync(request, useGemini: true, requireImageForGemini: true, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetReportById), new { id = result.Response!.Report.Id }, result.Response);
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

    private async Task<CreateReportCoreResult> CreateReportCoreAsync(
        CreateReportRequest request,
        bool useGemini,
        bool requireImageForGemini,
        CancellationToken cancellationToken)
    {
        var image = request.GetImageValue();
        VisionAnalysisResponse? analysis = null;
        string? geminiError = null;
        var geminiRequested = useGemini;

        if (useGemini)
        {
            if (image is null || image.Length == 0)
            {
                if (requireImageForGemini)
                {
                    return CreateReportCoreResult.Fail("Debes enviar una imagen para crear un reporte asistido por Gemini.", 400);
                }
            }
            else
            {
                var geminiResult = await _geminiVisionService.AnalyzeBarrierImageAsync(image, cancellationToken);
                if (geminiResult.Success)
                {
                    analysis = geminiResult.Analysis;
                }
                else
                {
                    geminiError = geminiResult.Error;
                    if (requireImageForGemini && string.IsNullOrWhiteSpace(request.GetTypeValue()) && string.IsNullOrWhiteSpace(request.GetSeverityValue()))
                    {
                        return CreateReportCoreResult.Fail(geminiResult.Error ?? "No se pudo analizar la imagen con Gemini.", geminiResult.StatusCode);
                    }
                }
            }
        }

        var typeValue = request.GetTypeValue();
        if (string.IsNullOrWhiteSpace(typeValue) && analysis is not null)
        {
            typeValue = analysis.Type;
        }

        if (string.IsNullOrWhiteSpace(typeValue))
        {
            return CreateReportCoreResult.Fail("Debes indicar el tipo de barrera o usar Gemini con una imagen.", 400);
        }

        var type = ReportRules.NormalizeType(typeValue);
        if (!ReportRules.IsValidType(type))
        {
            return CreateReportCoreResult.Fail("Tipo de barrera inválido.", 400);
        }

        var severityValue = request.GetSeverityValue();
        if (string.IsNullOrWhiteSpace(severityValue) && analysis is not null)
        {
            severityValue = analysis.Severity.ToString();
        }

        if (!ReportRules.TryParseSeverity(severityValue, out var severity))
        {
            return CreateReportCoreResult.Fail("Severidad inválida. Usa 1, 2, 3 o baja, media, alta.", 400);
        }

        var latitude = request.GetLatitudeValue();
        var longitude = request.GetLongitudeValue();

        if (!latitude.HasValue || !longitude.HasValue)
        {
            return CreateReportCoreResult.Fail("Debes enviar latitud y longitud del reporte.", 400);
        }

        if (latitude.Value is < -90 or > 90 || longitude.Value is < -180 or > 180)
        {
            return CreateReportCoreResult.Fail("Coordenadas inválidas.", 400);
        }

        var description = request.GetDescriptionValue();
        if (string.IsNullOrWhiteSpace(description) && analysis is not null)
        {
            description = !string.IsNullOrWhiteSpace(analysis.SuggestedDescription)
                ? analysis.SuggestedDescription
                : analysis.Summary;
        }

        description = description.Trim();
        if (description.Length > 500)
        {
            return CreateReportCoreResult.Fail("La descripción no puede superar 500 caracteres.", 400);
        }

        var imageResult = await _fileStorage.SaveReportImageAsync(image, cancellationToken);
        if (!imageResult.Success)
        {
            return CreateReportCoreResult.Fail(imageResult.Error ?? "No se pudo guardar la imagen.", 400);
        }

        var report = new Report
        {
            Type = type,
            Description = description,
            Latitude = latitude.Value,
            Longitude = longitude.Value,
            Severity = severity,
            Status = "active",
            ImageUrl = imageResult.ImageUrl,
            ImageStorageProvider = imageResult.StorageProvider,
            ImageStoragePath = imageResult.StoragePath,
            ImageContentType = imageResult.ContentType
        };

        try
        {
            var created = await _reports.AddAsync(report);
            var response = new ReportCreationResponse
            {
                Report = ReportMapper.ToResponse(created),
                GeminiRequested = geminiRequested,
                GeminiSucceeded = analysis is not null,
                GeminiError = geminiError,
                Vision = analysis,
                Message = analysis is not null
                    ? "Reporte creado con sugerencias de Gemini."
                    : "Reporte creado correctamente."
            };

            return CreateReportCoreResult.Ok(response);
        }
        catch (Exception)
        {
            await _fileStorage.DeleteImageAsync(imageResult.ImageUrl, imageResult.StorageProvider, imageResult.StoragePath, cancellationToken);
            return CreateReportCoreResult.Fail("No se pudo guardar el reporte en la base de datos.", 500);
        }
    }

    private ActionResult? ValidateListQuery(string? status, string? type, int? minSeverity, int? maxSeverity, int? limit)
    {
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = ReportRules.Normalize(status);
            if (!ReportRules.IsValidStatus(normalizedStatus))
            {
                return BadRequest(new { message = "Estatus inválido." });
            }
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalizedType = ReportRules.NormalizeType(type);
            if (!ReportRules.IsValidType(normalizedType))
            {
                return BadRequest(new { message = "Tipo de barrera inválido." });
            }
        }

        if (minSeverity.HasValue && (minSeverity.Value < 1 || minSeverity.Value > 3))
        {
            return BadRequest(new { message = "minSeverity debe estar entre 1 y 3." });
        }

        if (maxSeverity.HasValue && (maxSeverity.Value < 1 || maxSeverity.Value > 3))
        {
            return BadRequest(new { message = "maxSeverity debe estar entre 1 y 3." });
        }

        if (minSeverity.HasValue && maxSeverity.HasValue && minSeverity > maxSeverity)
        {
            return BadRequest(new { message = "minSeverity no puede ser mayor que maxSeverity." });
        }

        if (limit.HasValue && (limit.Value < 1 || limit.Value > 500))
        {
            return BadRequest(new { message = "limit debe estar entre 1 y 500." });
        }

        return null;
    }

    private ActionResult? ValidateBounds(double? north, double? south, double? east, double? west)
    {
        var any = north.HasValue || south.HasValue || east.HasValue || west.HasValue;
        var all = north.HasValue && south.HasValue && east.HasValue && west.HasValue;

        if (any && !all)
        {
            return BadRequest(new { message = "Para filtrar por bounds debes enviar north, south, east y west." });
        }

        if (!all)
        {
            return null;
        }

        if (north.Value is < -90 or > 90 || south.Value is < -90 or > 90 || east.Value is < -180 or > 180 || west.Value is < -180 or > 180)
        {
            return BadRequest(new { message = "Bounds inválidos." });
        }

        if (south.Value > north.Value)
        {
            return BadRequest(new { message = "south no puede ser mayor que north." });
        }

        return null;
    }

    private static IEnumerable<Report> ApplyFilters(
        IEnumerable<Report> reports,
        string? status,
        string? type,
        string? search,
        int? minSeverity,
        int? maxSeverity,
        int? limit)
    {
        var filtered = reports.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = ReportRules.Normalize(status);
            filtered = filtered.Where(report => report.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalizedType = ReportRules.NormalizeType(type);
            filtered = filtered.Where(report => report.Type == normalizedType);
        }

        if (minSeverity.HasValue)
        {
            filtered = filtered.Where(report => report.Severity >= minSeverity.Value);
        }

        if (maxSeverity.HasValue)
        {
            filtered = filtered.Where(report => report.Severity <= maxSeverity.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = ReportRules.NormalizeKey(search).Replace('_', ' ');
            filtered = filtered.Where(report =>
                ReportRules.NormalizeKey(report.Type).Replace('_', ' ').Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
                ReportRules.NormalizeKey(ReportRules.GetTypeLabel(report.Type)).Replace('_', ' ').Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
                ReportRules.NormalizeKey(report.Description).Replace('_', ' ').Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        }

        if (limit.HasValue)
        {
            filtered = filtered.Take(limit.Value);
        }

        return filtered;
    }

    private static IEnumerable<Report> ApplyBounds(
        IEnumerable<Report> reports,
        double? north,
        double? south,
        double? east,
        double? west)
    {
        if (!north.HasValue || !south.HasValue || !east.HasValue || !west.HasValue)
        {
            return reports;
        }

        return reports.Where(report =>
            report.Latitude <= north.Value &&
            report.Latitude >= south.Value &&
            report.Longitude <= east.Value &&
            report.Longitude >= west.Value);
    }

    private record CreateReportCoreResult(bool Success, ReportCreationResponse? Response, string? Error, int StatusCode)
    {
        public static CreateReportCoreResult Ok(ReportCreationResponse response)
        {
            return new CreateReportCoreResult(true, response, null, 200);
        }

        public static CreateReportCoreResult Fail(string error, int statusCode)
        {
            return new CreateReportCoreResult(false, null, error, statusCode);
        }
    }
}
