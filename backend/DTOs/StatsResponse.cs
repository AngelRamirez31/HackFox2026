namespace HackFox2026.DTOs;

public class StatsResponse
{
    public int TotalReports { get; set; }
    public int ActiveReports { get; set; }
    public int ResolvedReports { get; set; }
    public int RejectedReports { get; set; }
    public int HighSeverityReports { get; set; }
    public int MediumSeverityReports { get; set; }
    public int LowSeverityReports { get; set; }
    public int RequiresVerificationReports { get; set; }
    public int HighTrustReports { get; set; }
    public int CriticalPriorityReports { get; set; }
    public string MostCommonType { get; set; } = string.Empty;
    public string MostCommonTypeLabel { get; set; } = string.Empty;
    public Dictionary<string, int> ReportsByType { get; set; } = [];
    public Dictionary<string, string> ReportTypeLabels { get; set; } = [];
    public Dictionary<string, int> ReportsByStatus { get; set; } = [];
    public Dictionary<string, string> StatusLabels { get; set; } = [];
    public DateTime GeneratedAt { get; set; }
}
