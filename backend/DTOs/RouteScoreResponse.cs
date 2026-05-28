namespace HackFox2026.DTOs;

public class RouteScoreResponse
{
    public int Score { get; set; }
    public string Level { get; set; } = string.Empty;
    public string LevelLabel { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public double RadiusMeters { get; set; }
    public int NearbyReports { get; set; }
    public List<int> NearbyReportIds { get; set; } = [];
    public List<string> Warnings { get; set; } = [];
    public RouteStyleResponse RouteStyle { get; set; } = new();
    public List<ReportResponse> Reports { get; set; } = [];
}
