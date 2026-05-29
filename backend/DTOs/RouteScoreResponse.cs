namespace HackFox2026.DTOs;

public class RouteScoreResponse
{
    public int Score { get; set; }
    public int AccessibilityPercent { get; set; }
    public string Level { get; set; } = string.Empty;
    public string LevelLabel { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string BeforeLeavingRecommendation { get; set; } = string.Empty;
    public string MobilityProfile { get; set; } = string.Empty;
    public string MobilityProfileLabel { get; set; } = string.Empty;
    public double RadiusMeters { get; set; }
    public int NearbyReports { get; set; }
    public int PenalizedReports { get; set; }
    public double TotalPenalty { get; set; }
    public List<int> NearbyReportIds { get; set; } = [];
    public List<string> Warnings { get; set; } = [];
    public List<RouteIssueBreakdownResponse> IssueBreakdown { get; set; } = [];
    public RouteStyleResponse RouteStyle { get; set; } = new();
    public List<ReportResponse> Reports { get; set; } = [];
    public List<RouteImpactReportResponse> ImpactReports { get; set; } = [];
    public int PointCount { get; set; }
    public double RouteLengthMeters { get; set; }
    public string RouteLengthLabel { get; set; } = string.Empty;
    public double? GoogleDistanceMeters { get; set; }
    public string? GoogleDistanceLabel { get; set; }
    public double? DurationSeconds { get; set; }
    public string? DurationLabel { get; set; }
    public string TravelMode { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public RouteBoundsResponse Bounds { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
}
