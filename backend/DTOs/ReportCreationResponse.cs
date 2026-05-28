namespace HackFox2026.DTOs;

public class ReportCreationResponse
{
    public ReportResponse Report { get; set; } = new();
    public bool GeminiRequested { get; set; }
    public bool GeminiSucceeded { get; set; }
    public string? GeminiError { get; set; }
    public VisionAnalysisResponse? Vision { get; set; }
    public string Message { get; set; } = string.Empty;
}
