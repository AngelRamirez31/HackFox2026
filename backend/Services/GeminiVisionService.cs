using System.Globalization;
using System.Text;
using System.Text.Json;
using HackFox2026.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace HackFox2026.Services;

public class GeminiVisionService
{
    private const long MaxImageSizeBytes = LocalFileStorageService.MaxImageSizeBytes;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GeminiVisionService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(GetApiKey());

    public async Task<GeminiVisionResult> AnalyzeBarrierImageAsync(IFormFile? image, CancellationToken cancellationToken)
    {
        var validation = ValidateImage(image);
        if (!validation.Success)
        {
            return GeminiVisionResult.Fail(validation.Error ?? "Imagen inválida.", 400);
        }

        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return GeminiVisionResult.Fail("Gemini no está configurado. Guarda la clave con dotnet user-secrets set \"Gemini:ApiKey\" \"TU_API_KEY\".", 503);
        }

        var model = _configuration["Gemini:Model"];
        if (string.IsNullOrWhiteSpace(model))
        {
            model = "gemini-2.5-flash";
        }

        var baseUrl = _configuration["Gemini:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        }

        var imageBytes = await ReadBytesAsync(image!, cancellationToken);
        var mimeType = NormalizeMimeType(image!);
        var base64 = Convert.ToBase64String(imageBytes);
        var url = $"{baseUrl.TrimEnd('/')}/models/{model}:generateContent";

        var payload = BuildGeminiPayload(mimeType, base64);
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("x-goog-api-key", apiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return GeminiVisionResult.Fail($"Gemini respondió con error {(int)response.StatusCode}.", 502);
        }

        var text = ExtractCandidateText(responseContent);
        if (string.IsNullOrWhiteSpace(text))
        {
            return GeminiVisionResult.Fail("Gemini no devolvió una clasificación válida.", 502);
        }

        try
        {
            var parsed = ParseAnalysis(text, model);
            return parsed is null
                ? GeminiVisionResult.Fail("No se pudo leer la respuesta de Gemini como JSON.", 502)
                : GeminiVisionResult.Ok(parsed);
        }
        catch (JsonException)
        {
            return GeminiVisionResult.Fail("No se pudo leer la respuesta de Gemini como JSON.", 502);
        }
    }

    private string? GetApiKey()
    {
        return _configuration["Gemini:ApiKey"];
    }

    private static FileStorageResult ValidateImage(IFormFile? image)
    {
        if (image is null || image.Length == 0)
        {
            return FileStorageResult.Fail("Debes enviar una imagen para analizar.");
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

        return FileStorageResult.Ok(null);
    }

    private static async Task<byte[]> ReadBytesAsync(IFormFile image, CancellationToken cancellationToken)
    {
        await using var stream = new MemoryStream();
        await image.CopyToAsync(stream, cancellationToken);
        return stream.ToArray();
    }

    private static string NormalizeMimeType(IFormFile image)
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
            _ => "image/jpeg"
        };
    }

    private static object BuildGeminiPayload(string mimeType, string base64)
    {
        var typeList = string.Join(", ", ReportRules.TypeLabels.Keys);
        var prompt = $$"""
Analiza esta foto para una app del track Tijuana Sin Barreras. La app reporta barreras físicas para personas con discapacidad motriz, adultos mayores y familias.

Clasifica la imagen usando solamente uno de estos tipos: {{typeList}}.

Responde únicamente JSON válido con esta estructura exacta:
{
  "type": "sidewalk_damage | blocked_ramp | missing_ramp | stairs | unsafe_crossing | construction | obstacle | transport_issue | other",
  "severity": 1,
  "confidence": 0.0,
  "summary": "resumen corto en español",
  "suggestedDescription": "descripción corta que el usuario pueda guardar en el reporte",
  "accessibilityImpact": "impacto para movilidad reducida en español"
}

Criterios:
- severity 1 = baja, 2 = media, 3 = alta.
- Si no puedes determinar la barrera, usa type other, severity 2 y confidence menor a 0.5.
- No inventes ubicaciones, calles ni datos que no estén visibles.
""";

        return new Dictionary<string, object?>
        {
            ["contents"] = new object[]
            {
                new Dictionary<string, object?>
                {
                    ["role"] = "user",
                    ["parts"] = new object[]
                    {
                        new Dictionary<string, object?> { ["text"] = prompt },
                        new Dictionary<string, object?>
                        {
                            ["inline_data"] = new Dictionary<string, object?>
                            {
                                ["mime_type"] = mimeType,
                                ["data"] = base64
                            }
                        }
                    }
                }
            }
        };
    }

    private static string? ExtractCandidateText(string responseContent)
    {
        using var document = JsonDocument.Parse(responseContent);
        var root = document.RootElement;

        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            return null;
        }

        var firstCandidate = candidates[0];
        if (!firstCandidate.TryGetProperty("content", out var content))
        {
            return null;
        }

        if (!content.TryGetProperty("parts", out var parts) || parts.GetArrayLength() == 0)
        {
            return null;
        }

        var builder = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var textElement))
            {
                builder.Append(textElement.GetString());
            }
        }

        return builder.ToString();
    }

    private static VisionAnalysisResponse? ParseAnalysis(string text, string model)
    {
        var cleaned = CleanJson(text);
        using var document = JsonDocument.Parse(cleaned);
        var root = document.RootElement;

        var type = ReadString(root, "type", "other");
        type = ReportRules.Normalize(type);
        if (!ReportRules.IsValidType(type))
        {
            type = "other";
        }

        var severity = ReadInt(root, "severity", 2);
        severity = Math.Clamp(severity, 1, 3);

        var confidence = ReadDouble(root, "confidence", 0.0);
        confidence = Math.Clamp(confidence, 0.0, 1.0);

        return new VisionAnalysisResponse
        {
            Type = type,
            TypeLabel = ReportRules.GetTypeLabel(type),
            Severity = severity,
            SeverityLabel = ReportRules.GetSeverityLabel(severity),
            Confidence = Math.Round(confidence, 2),
            Summary = ReadString(root, "summary", string.Empty),
            SuggestedDescription = ReadString(root, "suggestedDescription", string.Empty),
            AccessibilityImpact = ReadString(root, "accessibilityImpact", string.Empty),
            Model = model
        };
    }

    private static string CleanJson(string value)
    {
        var cleaned = value.Trim();
        if (cleaned.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[7..].Trim();
        }
        else if (cleaned.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[3..].Trim();
        }

        if (cleaned.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[..^3].Trim();
        }

        return cleaned;
    }

    private static string ReadString(JsonElement root, string property, string fallback)
    {
        if (!root.TryGetProperty(property, out var element))
        {
            return fallback;
        }

        return element.ValueKind == JsonValueKind.String ? element.GetString()?.Trim() ?? fallback : fallback;
    }

    private static int ReadInt(JsonElement root, string property, int fallback)
    {
        if (!root.TryGetProperty(property, out var element))
        {
            return fallback;
        }

        if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var value))
        {
            return value;
        }

        if (element.ValueKind == JsonValueKind.String && int.TryParse(element.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        return fallback;
    }

    private static double ReadDouble(JsonElement root, string property, double fallback)
    {
        if (!root.TryGetProperty(property, out var element))
        {
            return fallback;
        }

        if (element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out var value))
        {
            return value;
        }

        if (element.ValueKind == JsonValueKind.String && double.TryParse(element.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        return fallback;
    }
}

public record GeminiVisionResult(bool Success, VisionAnalysisResponse? Analysis, string? Error, int StatusCode)
{
    public static GeminiVisionResult Ok(VisionAnalysisResponse analysis)
    {
        return new GeminiVisionResult(true, analysis, null, 200);
    }

    public static GeminiVisionResult Fail(string error, int statusCode)
    {
        return new GeminiVisionResult(false, null, error, statusCode);
    }
}
