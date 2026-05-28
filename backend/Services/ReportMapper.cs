using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public static class ReportMapper
{
    public static ReportResponse ToResponse(Report report)
    {
        return new ReportResponse
        {
            Id = report.Id,
            Type = report.Type,
            TypeLabel = ReportRules.GetTypeLabel(report.Type),
            Description = report.Description,
            Latitude = report.Latitude,
            Longitude = report.Longitude,
            Position = new ReportPositionResponse
            {
                Lat = report.Latitude,
                Lng = report.Longitude
            },
            Severity = report.Severity,
            SeverityLabel = ReportRules.GetSeverityLabel(report.Severity),
            SeverityColor = VisualizationRules.GetSeverityColor(report.Severity),
            Status = report.Status,
            StatusLabel = VisualizationRules.GetStatusLabel(report.Status),
            MarkerColor = VisualizationRules.GetMarkerColor(report),
            MarkerIcon = VisualizationRules.GetMarkerIcon(report.Type),
            RequiresAttention = VisualizationRules.RequiresAttention(report),
            ImageUrl = report.ImageUrl,
            CreatedAt = report.CreatedAt,
            CreatedAtDisplay = VisualizationRules.GetCreatedAtDisplay(report.CreatedAt),
            ResolvedAt = report.ResolvedAt,
            Confirmations = report.Confirmations,
            Rejections = report.Rejections
        };
    }

    public static MapReportResponse ToMapResponse(Report report)
    {
        var typeLabel = ReportRules.GetTypeLabel(report.Type);
        return new MapReportResponse
        {
            Id = report.Id,
            Type = report.Type,
            TypeLabel = typeLabel,
            Title = typeLabel,
            Description = report.Description,
            Latitude = report.Latitude,
            Longitude = report.Longitude,
            Position = new ReportPositionResponse
            {
                Lat = report.Latitude,
                Lng = report.Longitude
            },
            Severity = report.Severity,
            SeverityLabel = ReportRules.GetSeverityLabel(report.Severity),
            SeverityColor = VisualizationRules.GetSeverityColor(report.Severity),
            Status = report.Status,
            StatusLabel = VisualizationRules.GetStatusLabel(report.Status),
            MarkerColor = VisualizationRules.GetMarkerColor(report),
            MarkerIcon = VisualizationRules.GetMarkerIcon(report.Type),
            RequiresAttention = VisualizationRules.RequiresAttention(report),
            ImageUrl = report.ImageUrl,
            CreatedAt = report.CreatedAt,
            CreatedAtDisplay = VisualizationRules.GetCreatedAtDisplay(report.CreatedAt),
            Confirmations = report.Confirmations,
            Rejections = report.Rejections
        };
    }
}
