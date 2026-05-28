using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace HackFox2026.DTOs;

public class CreateReportRequest
{
    [Required]
    [StringLength(40, MinimumLength = 2)]
    public string Type { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }

    [Range(1, 3)]
    public int Severity { get; set; } = 2;

    public IFormFile? Image { get; set; }
}
