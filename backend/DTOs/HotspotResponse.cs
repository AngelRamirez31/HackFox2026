namespace HackFox2026.DTOs;

public class HotspotResponse
{
    public double CenterLat { get; set; }
    public double CenterLng { get; set; }
    public ReportPositionResponse Position { get; set; } = new();
    public int ReportCount { get; set; }
    public double AverageSeverity { get; set; }
    public int HighestSeverity { get; set; }
    public string Label { get; set; } = string.Empty;
    public string MainIssue { get; set; } = string.Empty;
    public string MainIssueLabel { get; set; } = string.Empty;
    public string MarkerColor { get; set; } = string.Empty;
    public List<int> ReportIds { get; set; } = [];
    public List<ReportResponse> Reports { get; set; } = [];
}
