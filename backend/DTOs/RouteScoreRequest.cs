using System.ComponentModel.DataAnnotations;

namespace HackFox2026.DTOs;

public class RouteScoreRequest
{
    [Required]
    [MinLength(2)]
    [MaxLength(1000)]
    public List<RoutePoint> Points { get; set; } = [];

    [Range(10, 300)]
    public double RadiusMeters { get; set; } = 50;

    [Range(0, 100000)]
    public double? DistanceMeters { get; set; }

    [Range(0, 86400)]
    public double? DurationSeconds { get; set; }

    [StringLength(40)]
    public string? TravelMode { get; set; }

    [StringLength(40)]
    public string? MobilityProfile { get; set; }

    [StringLength(40)]
    public string? Source { get; set; }

    public bool IncludeReports { get; set; } = true;
}
