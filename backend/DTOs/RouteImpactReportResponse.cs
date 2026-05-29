namespace HackFox2026.DTOs;

public class RouteImpactReportResponse
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ReportPositionResponse Position { get; set; } = new();
    public int Severity { get; set; }
    public string SeverityLabel { get; set; } = string.Empty;
    public string SeverityColor { get; set; } = string.Empty;
    public string MarkerIcon { get; set; } = string.Empty;
    public double DistanceMeters { get; set; }
    public string DistanceLabel { get; set; } = string.Empty;
    public double Penalty { get; set; }
    public string ImpactLevel { get; set; } = string.Empty;
    public string ImpactLabel { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int Confirmations { get; set; }
    public int Rejections { get; set; }
}
