using System.ComponentModel.DataAnnotations;

namespace HackFox2026.DTOs;

public class RouteScoreRequest
{
    [Required]
    [MinLength(2)]
    [MaxLength(500)]
    public List<RoutePoint> Points { get; set; } = [];

    [Range(10, 300)]
    public double RadiusMeters { get; set; } = 50;
}
