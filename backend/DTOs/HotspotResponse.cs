namespace HackFox2026.DTOs;

public class HotspotResponse
{
    public double CenterLat { get; set; }
    public double CenterLng { get; set; }
    public int ReportCount { get; set; }
    public double AverageSeverity { get; set; }
    public string Label { get; set; } = string.Empty;
    public string MainIssue { get; set; } = string.Empty;
    public string MainIssueLabel { get; set; } = string.Empty;
    public string SeverityColor { get; set; } = string.Empty;
    public int PriorityScore { get; set; }
    public string PriorityLevel { get; set; } = string.Empty;
    public string PriorityLabel { get; set; } = string.Empty;
    public List<int> ReportIds { get; set; } = [];
    public List<MapReportResponse> Reports { get; set; } = [];
}
