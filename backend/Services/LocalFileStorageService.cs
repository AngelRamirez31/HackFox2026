using Google.Cloud.Storage.V1;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using StorageObject = Google.Apis.Storage.v1.Data.Object;

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
    private readonly IConfiguration _configuration;
    private readonly Lazy<StorageClient> _storageClient;

    public LocalFileStorageService(IWebHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
        _storageClient = new Lazy<StorageClient>(StorageClient.Create);
    }

    public async Task<FileStorageResult> SaveReportImageAsync(IFormFile? image, CancellationToken cancellationToken = default)
    {
        var validation = ValidateImage(image);
        if (!validation.Success)
        {
            return validation;
        }

        if (image is null || image.Length == 0)
        {
            return FileStorageResult.Ok(null, null, null, null, "none");
        }

        if (ShouldUseFirebaseStorage())
        {
            return await SaveFirebaseStorageImageAsync(image, cancellationToken);
        }

        return await SaveLocalImageAsync(image, cancellationToken);
    }

    public async Task DeleteImageAsync(string? imageUrl, string? storageProvider = null, string? storagePath = null, CancellationToken cancellationToken = default)
    {
        var provider = storageProvider ?? InferProviderFromUrl(imageUrl);

        if (string.Equals(provider, "firebase_storage", StringComparison.OrdinalIgnoreCase))
        {
            await DeleteFirebaseStorageImageAsync(storagePath, cancellationToken);
            return;
        }

        DeleteLocalImage(imageUrl);
    }

    public void DeleteLocalImage(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl) || !imageUrl.StartsWith("/uploads/reports/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var fileName = Path.GetFileName(imageUrl);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        var webRoot = GetWebRootPath();
        var fullPath = Path.Combine(webRoot, "uploads", "reports", fileName);
        try
        {
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    public StorageStatus GetStatus()
    {
        var providerSetting = GetStorageProviderSetting();
        var bucketName = GetBucketName();
        var folderName = GetStorageFolder();
        var usesFirebase = ShouldUseFirebaseStorage();

        return new StorageStatus
        {
            Provider = usesFirebase ? "FirebaseStorage" : "Local",
            ProviderSetting = providerSetting,
            FirebaseStorageEnabled = usesFirebase,
            BucketConfigured = !string.IsNullOrWhiteSpace(bucketName),
            BucketName = string.IsNullOrWhiteSpace(bucketName) ? null : bucketName,
            Folder = folderName,
            LocalFallbackPath = "/uploads/reports/",
            MaxImageSizeMb = MaxImageSizeBytes / 1024 / 1024
        };
    }

    private FileStorageResult ValidateImage(IFormFile? image)
    {
        if (image is null || image.Length == 0)
        {
            return FileStorageResult.Ok(null, null, null, null, "none");
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

        return FileStorageResult.Ok(null, null, null, null, "validated");
    }

    private async Task<FileStorageResult> SaveLocalImageAsync(IFormFile image, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(image.FileName);
        var webRoot = GetWebRootPath();
        var uploadDirectory = Path.Combine(webRoot, "uploads", "reports");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(uploadDirectory, fileName);

        await using var stream = new FileStream(fullPath, FileMode.CreateNew);
        await image.CopyToAsync(stream, cancellationToken);

        return FileStorageResult.Ok(
            imageUrl: $"/uploads/reports/{fileName}",
            storageProvider: "local",
            storagePath: fullPath,
            contentType: NormalizeContentType(image),
            message: "Imagen guardada localmente.");
    }

    private async Task<FileStorageResult> SaveFirebaseStorageImageAsync(IFormFile image, CancellationToken cancellationToken)
    {
        var bucketName = GetBucketName();
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            return FileStorageResult.Fail("Firebase:StorageBucket es obligatorio cuando Storage:Provider es FirebaseStorage.");
        }

        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        var contentType = NormalizeContentType(image);
        var folder = GetStorageFolder();
        var objectName = $"{folder.Trim('/')}/{Guid.NewGuid():N}{extension}";
        var downloadToken = Guid.NewGuid().ToString("D");

        var storageObject = new StorageObject
        {
            Bucket = bucketName,
            Name = objectName,
            ContentType = contentType,
            CacheControl = "public, max-age=31536000",
            Metadata = new Dictionary<string, string>
            {
                ["firebaseStorageDownloadTokens"] = downloadToken,
                ["source"] = "HackFox2026"
            }
        };

        await using var stream = image.OpenReadStream();
        await _storageClient.Value.UploadObjectAsync(storageObject, stream, options: null, cancellationToken: cancellationToken);

        var encodedObjectName = Uri.EscapeDataString(objectName);
        var imageUrl = $"https://firebasestorage.googleapis.com/v0/b/{bucketName}/o/{encodedObjectName}?alt=media&token={downloadToken}";

        return FileStorageResult.Ok(
            imageUrl: imageUrl,
            storageProvider: "firebase_storage",
            storagePath: objectName,
            contentType: contentType,
            message: "Imagen guardada en Firebase Storage.");
    }

    private async Task DeleteFirebaseStorageImageAsync(string? storagePath, CancellationToken cancellationToken)
    {
        var bucketName = GetBucketName();
        if (string.IsNullOrWhiteSpace(bucketName) || string.IsNullOrWhiteSpace(storagePath))
        {
            return;
        }

        try
        {
            await _storageClient.Value.DeleteObjectAsync(bucketName, storagePath, cancellationToken: cancellationToken);
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
        }
    }

    private bool ShouldUseFirebaseStorage()
    {
        var provider = GetStorageProviderSetting();
        var bucketName = GetBucketName();

        if (string.Equals(provider, "FirebaseStorage", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Firebase", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "CloudStorage", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(provider, "Auto", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(bucketName))
        {
            return true;
        }

        return false;
    }

    private string GetStorageProviderSetting()
    {
        return _configuration["Storage:Provider"] ?? "Local";
    }

    private string? GetBucketName()
    {
        return _configuration["Firebase:StorageBucket"] ?? _configuration["Storage:Bucket"];
    }

    private string GetStorageFolder()
    {
        var folder = _configuration["Firebase:StorageFolder"] ?? _configuration["Storage:Folder"] ?? "reports";
        return string.IsNullOrWhiteSpace(folder) ? "reports" : folder.Trim('/');
    }

    private string GetWebRootPath()
    {
        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        return webRoot;
    }

    private static string NormalizeContentType(IFormFile image)
    {
        if (!string.IsNullOrWhiteSpace(image.ContentType) && image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return image.ContentType;
        }

        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }

    private static string InferProviderFromUrl(string? imageUrl)
    {
        if (!string.IsNullOrWhiteSpace(imageUrl)
            && imageUrl.Contains("firebasestorage.googleapis.com", StringComparison.OrdinalIgnoreCase))
        {
            return "firebase_storage";
        }

        return "local";
    }
}

public record FileStorageResult(bool Success, string? ImageUrl, string? Error, string? StorageProvider, string? StoragePath, string? ContentType, string? Message)
{
    public static FileStorageResult Ok(string? imageUrl)
    {
        return new FileStorageResult(true, imageUrl, null, null, null, null, null);
    }

    public static FileStorageResult Ok(string? imageUrl, string? storageProvider, string? storagePath, string? contentType, string? message)
    {
        return new FileStorageResult(true, imageUrl, null, storageProvider, storagePath, contentType, message);
    }

    public static FileStorageResult Fail(string error)
    {
        return new FileStorageResult(false, null, error, null, null, null, null);
    }
}

public class StorageStatus
{
    public string Provider { get; set; } = string.Empty;
    public string ProviderSetting { get; set; } = string.Empty;
    public bool FirebaseStorageEnabled { get; set; }
    public bool BucketConfigured { get; set; }
    public string? BucketName { get; set; }
    public string Folder { get; set; } = string.Empty;
    public string LocalFallbackPath { get; set; } = string.Empty;
    public long MaxImageSizeMb { get; set; }
}
