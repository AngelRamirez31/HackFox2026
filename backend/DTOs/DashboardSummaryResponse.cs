namespace HackFox2026.DTOs;

public class DashboardSummaryResponse
{
    public int TotalReports { get; set; }
    public int ActiveReports { get; set; }
    public int ResolvedReports { get; set; }
    public int RejectedReports { get; set; }
    public int HighPriorityReports { get; set; }
    public int MediumPriorityReports { get; set; }
    public int LowPriorityReports { get; set; }
    public int ReportsWithImages { get; set; }
    public int RecentReportsCount { get; set; }
    public string MostCommonBarrier { get; set; } = string.Empty;
    public string MostCommonBarrierLabel { get; set; } = string.Empty;
    public double AverageSeverity { get; set; }
    public DateTime? LastReportCreatedAt { get; set; }
    public string LastReportCreatedAtDisplay { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public Dictionary<string, int> ReportsByType { get; set; } = [];
    public Dictionary<string, int> ReportsByStatus { get; set; } = [];
    public List<ReportResponse> RecentReports { get; set; } = [];
    public List<HotspotResponse> TopHotspots { get; set; } = [];
}
