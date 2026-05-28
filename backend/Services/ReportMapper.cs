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
            Severity = report.Severity,
            SeverityLabel = ReportRules.GetSeverityLabel(report.Severity),
            Status = report.Status,
            ImageUrl = report.ImageUrl,
            CreatedAt = report.CreatedAt,
            ResolvedAt = report.ResolvedAt,
            Confirmations = report.Confirmations,
            Rejections = report.Rejections
        };
    }
}
