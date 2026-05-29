namespace HackFox2026.DTOs;

public class DemoPitchResponse
{
    public DateTime GeneratedAt { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Persona { get; set; } = string.Empty;
    public string Mission { get; set; } = string.Empty;
    public EssentialDestinationResponse Destination { get; set; } = new();
    public PitchRouteScenarioResponse NormalRoute { get; set; } = new();
    public PitchRouteScenarioResponse StreetsHRoute { get; set; } = new();
    public List<string> Storyline { get; set; } = [];
    public List<string> JuryTalkingPoints { get; set; } = [];
    public List<ImpactMetricResponse> Metrics { get; set; } = [];
}

public class PitchRouteScenarioResponse
{
    public string Label { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public int AccessibilityPercent { get; set; }
    public string LevelLabel { get; set; } = string.Empty;
    public string DistanceLabel { get; set; } = string.Empty;
    public string DurationLabel { get; set; } = string.Empty;
    public int BarrierCount { get; set; }
    public int CriticalBarrierCount { get; set; }
    public string MainRisk { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public List<RouteIssueBreakdownResponse> IssueBreakdown { get; set; } = [];
    public List<RouteImpactReportResponse> ImpactReports { get; set; } = [];
    public List<RoutePoint> Points { get; set; } = [];
}
