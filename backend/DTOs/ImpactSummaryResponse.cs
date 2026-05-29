namespace HackFox2026.DTOs;

public class ImpactSummaryResponse
{
    public DateTime GeneratedAt { get; set; }
    public string GeneratedAtDisplay { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Narrative { get; set; } = string.Empty;
    public int TotalReports { get; set; }
    public int ActiveReports { get; set; }
    public int ConfirmedReports { get; set; }
    public int HighPriorityReports { get; set; }
    public int CriticalPriorityReports { get; set; }
    public int RequiresVerificationReports { get; set; }
    public int AuthorityReadyReports { get; set; }
    public int CriticalZonesDetected { get; set; }
    public int EssentialDestinationCount { get; set; }
    public double AverageTrustScore { get; set; }
    public double AveragePriorityScore { get; set; }
    public double AverageAccessibilityRisk { get; set; }
    public List<ImpactMetricResponse> Metrics { get; set; } = [];
    public List<ImpactZoneResponse> PriorityZones { get; set; } = [];
    public List<ImpactActionResponse> RecommendedActions { get; set; } = [];
}

public class ImpactMetricResponse
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
}

public class ImpactZoneResponse
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int ReportCount { get; set; }
    public string MainIssueLabel { get; set; } = string.Empty;
    public string PriorityLabel { get; set; } = string.Empty;
    public int PriorityScore { get; set; }
}

public class ImpactActionResponse
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Urgency { get; set; } = string.Empty;
}
