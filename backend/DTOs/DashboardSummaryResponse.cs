namespace HackFox2026.DTOs;

public class DashboardSummaryResponse
{
    public int TotalReports { get; set; }
    public int ActiveReports { get; set; }
    public int ResolvedReports { get; set; }
    public int RejectedReports { get; set; }
    public int HighPriorityReports { get; set; }
    public int ReportsWithImages { get; set; }
    public double AverageSeverity { get; set; }
    public int AverageSeverityRounded { get; set; }
    public string AverageSeverityLabel { get; set; } = string.Empty;
    public string MostCommonBarrier { get; set; } = string.Empty;
    public string MostCommonBarrierLabel { get; set; } = string.Empty;
    public int MostCommonBarrierCount { get; set; }
    public DateTime? LastReportCreatedAt { get; set; }
    public string LastReportCreatedAtDisplay { get; set; } = string.Empty;
    public int OpenIssueRatePercent { get; set; }
    public List<ReportResponse> RecentReports { get; set; } = [];
    public List<HotspotResponse> TopHotspots { get; set; } = [];
    public DateTime GeneratedAt { get; set; }
}
