using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public static class ReportMapper
{
    public static ReportResponse ToResponse(Report report)
    {
        var trustScore = ReportIntelligenceRules.CalculateTrustScore(report);
        var priorityScore = ReportIntelligenceRules.CalculatePriorityScore(report);
        var lastCommunityActivityAt = ReportIntelligenceRules.GetLastCommunityActivityAt(report);

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
            RequiresVerification = ReportIntelligenceRules.RequiresVerification(report),
            VerificationLabel = ReportIntelligenceRules.GetVerificationLabel(report),
            ValidationSummary = ReportIntelligenceRules.BuildValidationSummary(report),
            TrustScore = trustScore,
            TrustLevel = ReportIntelligenceRules.GetTrustLevel(trustScore),
            TrustLabel = ReportIntelligenceRules.GetTrustLabel(trustScore),
            PriorityScore = priorityScore,
            PriorityLevel = ReportIntelligenceRules.GetPriorityLevel(priorityScore),
            PriorityLabel = ReportIntelligenceRules.GetPriorityLabel(priorityScore),
            AuthoritySummary = ReportIntelligenceRules.BuildAuthoritySummary(report),
            ImageUrl = report.ImageUrl,
            ImageStorageProvider = report.ImageStorageProvider,
            ImageStoragePath = report.ImageStoragePath,
            ImageContentType = report.ImageContentType,
            HasImage = !string.IsNullOrWhiteSpace(report.ImageUrl),
            GeminiAnalyzed = report.GeminiAnalyzed,
            GeminiConfidence = report.GeminiConfidence.HasValue ? Math.Round(report.GeminiConfidence.Value, 2) : null,
            GeminiSummary = report.GeminiSummary,
            GeminiAccessibilityImpact = report.GeminiAccessibilityImpact,
            DemoSeedKey = report.DemoSeedKey,
            DemoAreaKey = report.DemoAreaKey,
            DemoAreaLabel = report.DemoAreaLabel,
            CreatedAt = report.CreatedAt,
            CreatedAtDisplay = VisualizationRules.GetCreatedAtDisplay(report.CreatedAt),
            ResolvedAt = report.ResolvedAt,
            Confirmations = report.Confirmations,
            Rejections = report.Rejections,
            LastConfirmedAt = report.LastConfirmedAt,
            LastRejectedAt = report.LastRejectedAt,
            LastCommunityActivityAt = lastCommunityActivityAt
        };
    }

    public static MapReportResponse ToMapResponse(Report report)
    {
        var typeLabel = ReportRules.GetTypeLabel(report.Type);
        var trustScore = ReportIntelligenceRules.CalculateTrustScore(report);
        var priorityScore = ReportIntelligenceRules.CalculatePriorityScore(report);

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
            RequiresVerification = ReportIntelligenceRules.RequiresVerification(report),
            VerificationLabel = ReportIntelligenceRules.GetVerificationLabel(report),
            ValidationSummary = ReportIntelligenceRules.BuildValidationSummary(report),
            TrustScore = trustScore,
            TrustLabel = ReportIntelligenceRules.GetTrustLabel(trustScore),
            PriorityScore = priorityScore,
            PriorityLabel = ReportIntelligenceRules.GetPriorityLabel(priorityScore),
            ImageUrl = report.ImageUrl,
            ImageStorageProvider = report.ImageStorageProvider,
            ImageStoragePath = report.ImageStoragePath,
            ImageContentType = report.ImageContentType,
            HasImage = !string.IsNullOrWhiteSpace(report.ImageUrl),
            GeminiAnalyzed = report.GeminiAnalyzed,
            GeminiConfidence = report.GeminiConfidence.HasValue ? Math.Round(report.GeminiConfidence.Value, 2) : null,
            DemoSeedKey = report.DemoSeedKey,
            DemoAreaKey = report.DemoAreaKey,
            DemoAreaLabel = report.DemoAreaLabel,
            CreatedAt = report.CreatedAt,
            CreatedAtDisplay = VisualizationRules.GetCreatedAtDisplay(report.CreatedAt),
            Confirmations = report.Confirmations,
            Rejections = report.Rejections,
            LastCommunityActivityAt = ReportIntelligenceRules.GetLastCommunityActivityAt(report)
        };
    }
}
