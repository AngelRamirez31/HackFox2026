using Microsoft.AspNetCore.Http;

namespace HackFox2026.DTOs;

public class CreateReportRequest
{
    public string? Type { get; set; }
    public string? Tipo { get; set; }

    public string? Description { get; set; }
    public string? Descripcion { get; set; }

    public double? Latitude { get; set; }
    public double? Latitud { get; set; }
    public double? Lat { get; set; }

    public double? Longitude { get; set; }
    public double? Longitud { get; set; }
    public double? Lng { get; set; }

    public string? Severity { get; set; }
    public string? Severidad { get; set; }

    public IFormFile? Image { get; set; }
    public IFormFile? Foto { get; set; }

    public string? GetTypeValue()
    {
        return string.IsNullOrWhiteSpace(Type) ? Tipo : Type;
    }

    public string GetDescriptionValue()
    {
        return (string.IsNullOrWhiteSpace(Description) ? Descripcion : Description)?.Trim() ?? string.Empty;
    }

    public string? GetSeverityValue()
    {
        return string.IsNullOrWhiteSpace(Severity) ? Severidad : Severity;
    }

    public double? GetLatitudeValue()
    {
        return Latitude ?? Latitud ?? Lat;
    }

    public double? GetLongitudeValue()
    {
        return Longitude ?? Longitud ?? Lng;
    }

    public IFormFile? GetImageValue()
    {
        return Image ?? Foto;
    }
}
