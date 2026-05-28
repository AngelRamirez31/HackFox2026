namespace HackFox2026.DTOs;

public class VisionAnalysisResponse
{
    public string Type { get; set; } = "other";
    public string TypeLabel { get; set; } = "Otro";
    public int Severity { get; set; } = 2;
    public string SeverityLabel { get; set; } = "Media";
    public double Confidence { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string SuggestedDescription { get; set; } = string.Empty;
    public string AccessibilityImpact { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
}
