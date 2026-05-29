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
    public int ReportsWithImages { get; set; }
    public int ReportsWithoutImages { get; set; }
    public double AverageSeverity { get; set; }
    public double AverageActiveSeverity { get; set; }
    public string MostCommonType { get; set; } = string.Empty;
    public string MostCommonTypeLabel { get; set; } = string.Empty;
    public int MostCommonTypeCount { get; set; }
    public DateTime? LastReportCreatedAt { get; set; }
    public string LastReportCreatedAtDisplay { get; set; } = string.Empty;
    public Dictionary<string, int> ReportsByType { get; set; } = [];
    public Dictionary<string, string> ReportTypeLabels { get; set; } = [];
    public Dictionary<string, int> ReportsByStatus { get; set; } = [];
    public Dictionary<string, string> StatusLabels { get; set; } = [];
    public List<ReportResponse> RecentReports { get; set; } = [];
    public DateTime GeneratedAt { get; set; }
}
