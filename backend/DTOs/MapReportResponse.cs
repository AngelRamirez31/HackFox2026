namespace HackFox2026.DTOs;

public class MapReportResponse
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public ReportPositionResponse Position { get; set; } = new();
    public int Severity { get; set; }
    public string SeverityLabel { get; set; } = string.Empty;
    public string SeverityColor { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public string MarkerColor { get; set; } = string.Empty;
    public string MarkerIcon { get; set; } = string.Empty;
    public bool RequiresAttention { get; set; }
    public bool RequiresVerification { get; set; }
    public string VerificationLabel { get; set; } = string.Empty;
    public string ValidationSummary { get; set; } = string.Empty;
    public int TrustScore { get; set; }
    public string TrustLabel { get; set; } = string.Empty;
    public int PriorityScore { get; set; }
    public string PriorityLabel { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ImageStorageProvider { get; set; }
    public string? ImageStoragePath { get; set; }
    public string? ImageContentType { get; set; }
    public bool HasImage { get; set; }
    public bool GeminiAnalyzed { get; set; }
    public double? GeminiConfidence { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedAtDisplay { get; set; } = string.Empty;
    public int Confirmations { get; set; }
    public int Rejections { get; set; }
    public DateTime? LastCommunityActivityAt { get; set; }
}
