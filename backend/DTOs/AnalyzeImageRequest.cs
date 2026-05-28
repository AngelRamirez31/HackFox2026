using Microsoft.AspNetCore.Http;

namespace HackFox2026.DTOs;

public class AnalyzeImageRequest
{
    public IFormFile? Image { get; set; }
}
