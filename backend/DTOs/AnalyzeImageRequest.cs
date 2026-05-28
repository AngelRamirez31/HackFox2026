using Microsoft.AspNetCore.Http;

namespace HackFox2026.DTOs;

public class AnalyzeImageRequest
{
    public IFormFile? Image { get; set; }
    public IFormFile? Foto { get; set; }

    public IFormFile? GetImageValue()
    {
        return Image ?? Foto;
    }
}
