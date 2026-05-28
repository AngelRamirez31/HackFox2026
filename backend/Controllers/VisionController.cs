using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/vision")]
public class VisionController : ControllerBase
{
    private readonly GeminiVisionService _geminiVisionService;

    public VisionController(GeminiVisionService geminiVisionService)
    {
        _geminiVisionService = geminiVisionService;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            configured = _geminiVisionService.IsConfigured,
            resource = "Gemini Vision desde backend",
            keyLocation = "User Secrets en local o variable Gemini__ApiKey en despliegue"
        });
    }

    [HttpPost("analyze-report-image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LocalFileStorageService.MaxImageSizeBytes + 1024 * 1024)]
    public async Task<ActionResult<VisionAnalysisResponse>> AnalyzeReportImage([FromForm] AnalyzeImageRequest request, CancellationToken cancellationToken)
    {
        var result = await _geminiVisionService.AnalyzeBarrierImageAsync(request.GetImageValue(), cancellationToken);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.Error });
        }

        return Ok(result.Analysis);
    }
}
