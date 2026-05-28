namespace HackFox2026.Models;

public class Report
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Severity { get; set; }
    public string Status { get; set; } = "active";
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public int Confirmations { get; set; }
    public int Rejections { get; set; }
}
