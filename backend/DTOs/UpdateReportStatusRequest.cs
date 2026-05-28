using System.ComponentModel.DataAnnotations;

namespace HackFox2026.DTOs;

public class UpdateReportStatusRequest
{
    [Required]
    [StringLength(20, MinimumLength = 3)]
    public string Status { get; set; } = string.Empty;
}
