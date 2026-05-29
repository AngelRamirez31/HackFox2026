namespace HackFox2026.DTOs;

public class RouteIssueBreakdownResponse
{
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string PluralLabel { get; set; } = string.Empty;
    public int Count { get; set; }
    public double TotalPenalty { get; set; }
    public double AverageSeverity { get; set; }
}
