using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace HackFox2026.Services;

public class LocalFileStorageService
{
    public const long MaxImageSizeBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly IWebHostEnvironment _environment;

    public LocalFileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<FileStorageResult> SaveReportImageAsync(IFormFile? image)
    {
        if (image is null || image.Length == 0)
        {
            return FileStorageResult.Ok(null);
        }

        if (image.Length > MaxImageSizeBytes)
        {
            return FileStorageResult.Fail("La imagen no puede pesar más de 5 MB.");
        }

        var extension = Path.GetExtension(image.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            return FileStorageResult.Fail("Solo se permiten imágenes .jpg, .jpeg, .png o .webp.");
        }

        if (!string.IsNullOrWhiteSpace(image.ContentType) && !image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return FileStorageResult.Fail("El archivo debe ser una imagen válida.");
        }

        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var uploadDirectory = Path.Combine(webRoot, "uploads", "reports");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(uploadDirectory, fileName);

        await using var stream = new FileStream(fullPath, FileMode.CreateNew);
        await image.CopyToAsync(stream);

        return FileStorageResult.Ok($"/uploads/reports/{fileName}");
    }
}

public record FileStorageResult(bool Success, string? ImageUrl, string? Error)
{
    public static FileStorageResult Ok(string? imageUrl)
    {
        return new FileStorageResult(true, imageUrl, null);
    }

    public static FileStorageResult Fail(string error)
    {
        return new FileStorageResult(false, null, error);
    }
}
