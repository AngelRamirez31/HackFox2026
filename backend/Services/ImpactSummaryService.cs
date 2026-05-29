using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class ImpactSummaryService
{
    private readonly ReportAnalyticsService _analytics;
    private readonly EssentialDestinationService _destinations;

    public ImpactSummaryService(ReportAnalyticsService analytics, EssentialDestinationService destinations)
    {
        _analytics = analytics;
        _destinations = destinations;
    }

    public ImpactSummaryResponse Build(IEnumerable<Report> reports, int hotspotLimit = 5)
    {
        var list = reports.ToList();
        var activeReports = list.Where(report => ReportRules.Normalize(report.Status) == "active").ToList();
        var priorityScores = activeReports.Select(report => ReportIntelligenceRules.CalculatePriorityScore(report)).ToList();
        var trustScores = activeReports.Select(ReportIntelligenceRules.CalculateTrustScore).ToList();
        var hotspots = _analytics.BuildHotspots(activeReports, hotspotLimit, 140);
        var criticalReports = activeReports.Count(report => ReportIntelligenceRules.CalculatePriorityScore(report) >= 85);
        var highReports = activeReports.Count(report => ReportIntelligenceRules.CalculatePriorityScore(report) >= 65);
        var confirmedReports = activeReports.Count(report => report.Confirmations > report.Rejections && report.Confirmations > 0);
        var verificationReports = activeReports.Count(ReportIntelligenceRules.RequiresVerification);
        var authorityReadyReports = activeReports.Count(report =>
            ReportIntelligenceRules.CalculatePriorityScore(report) >= 60 &&
            ReportIntelligenceRules.CalculateTrustScore(report) >= 40);
        var averagePriority = priorityScores.Count == 0 ? 0 : Math.Round(priorityScores.Average(), 1);
        var averageTrust = trustScores.Count == 0 ? 0 : Math.Round(trustScores.Average(), 1);
        var averageRisk = priorityScores.Count == 0 ? 0 : Math.Round(priorityScores.Average() * 0.72 + Math.Min(20, activeReports.Count * 1.2), 1);

        return new ImpactSummaryResponse
        {
            GeneratedAt = DateTime.UtcNow,
            GeneratedAtDisplay = "Actualizado al momento",
            Headline = BuildHeadline(activeReports.Count, hotspots.Count, highReports),
            Narrative = "Streets-H transforma reportes ciudadanos en evidencia accionable para planear trayectos accesibles, priorizar reparaciones y demostrar impacto social medible.",
            TotalReports = list.Count,
            ActiveReports = activeReports.Count,
            ConfirmedReports = confirmedReports,
            HighPriorityReports = highReports,
            CriticalPriorityReports = criticalReports,
            RequiresVerificationReports = verificationReports,
            AuthorityReadyReports = authorityReadyReports,
            CriticalZonesDetected = hotspots.Count,
            EssentialDestinationCount = _destinations.GetAll().Count,
            AverageTrustScore = averageTrust,
            AveragePriorityScore = averagePriority,
            AverageAccessibilityRisk = averageRisk,
            Metrics = BuildMetrics(activeReports.Count, confirmedReports, hotspots.Count, highReports, criticalReports, authorityReadyReports, verificationReports, averageTrust, averagePriority),
            PriorityZones = hotspots.Select(hotspot => new ImpactZoneResponse
            {
                Title = $"{hotspot.Label}: {hotspot.MainIssueLabel}",
                Description = $"{hotspot.ReportCount} reportes cercanos con prioridad {hotspot.PriorityLabel.ToLowerInvariant()}.",
                Lat = hotspot.CenterLat,
                Lng = hotspot.CenterLng,
                ReportCount = hotspot.ReportCount,
                MainIssueLabel = hotspot.MainIssueLabel,
                PriorityLabel = hotspot.PriorityLabel,
                PriorityScore = hotspot.PriorityScore
            }).ToList(),
            RecommendedActions = BuildActions(highReports, criticalReports, verificationReports, hotspots)
        };
    }

    private static string BuildHeadline(int activeReports, int hotspotCount, int highReports)
    {
        if (activeReports == 0)
        {
            return "Todavía no hay reportes activos suficientes para medir impacto urbano.";
        }

        return $"{activeReports} reportes activos alimentan {hotspotCount} zonas críticas y {highReports} casos de atención prioritaria.";
    }

    private static List<ImpactMetricResponse> BuildMetrics(
        int activeReports,
        int confirmedReports,
        int hotspotCount,
        int highReports,
        int criticalReports,
        int authorityReadyReports,
        int verificationReports,
        double averageTrust,
        double averagePriority)
    {
        return
        [
            new ImpactMetricResponse
            {
                Key = "activeReports",
                Label = "Mapa vivo",
                Value = activeReports.ToString(),
                Detail = "reportes activos que alimentan rutas y zonas críticas",
                Level = activeReports >= 10 ? "high" : activeReports >= 4 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "confirmedReports",
                Label = "Evidencia comunitaria",
                Value = confirmedReports.ToString(),
                Detail = "reportes confirmados por la comunidad",
                Level = confirmedReports >= 8 ? "high" : confirmedReports >= 3 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "hotspots",
                Label = "Zonas críticas",
                Value = hotspotCount.ToString(),
                Detail = "agrupaciones útiles para intervención urbana",
                Level = hotspotCount >= 4 ? "high" : hotspotCount >= 2 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "priorityReports",
                Label = "Atención prioritaria",
                Value = highReports.ToString(),
                Detail = $"{criticalReports} marcados como críticos",
                Level = criticalReports > 0 ? "critical" : highReports > 0 ? "high" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "authorityReady",
                Label = "Listos para municipio",
                Value = authorityReadyReports.ToString(),
                Detail = "casos con prioridad y confianza suficientes para seguimiento",
                Level = authorityReadyReports >= 6 ? "high" : authorityReadyReports >= 2 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "verification",
                Label = "Por verificar",
                Value = verificationReports.ToString(),
                Detail = "reportes antiguos o con baja actividad reciente",
                Level = verificationReports > 0 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "trust",
                Label = "Confianza promedio",
                Value = $"{averageTrust:0}%",
                Detail = "calidad combinada de evidencia, imagen y validación",
                Level = averageTrust >= 75 ? "high" : averageTrust >= 45 ? "medium" : "low"
            },
            new ImpactMetricResponse
            {
                Key = "priorityAverage",
                Label = "Urgencia urbana",
                Value = $"{averagePriority:0}%",
                Detail = "promedio de severidad, confianza y validación",
                Level = averagePriority >= 70 ? "critical" : averagePriority >= 45 ? "medium" : "low"
            }
        ];
    }

    private static List<ImpactActionResponse> BuildActions(int highReports, int criticalReports, int verificationReports, IReadOnlyList<HotspotResponse> hotspots)
    {
        var actions = new List<ImpactActionResponse>();

        if (criticalReports > 0)
        {
            actions.Add(new ImpactActionResponse
            {
                Title = "Atender barreras críticas primero",
                Description = $"Hay {criticalReports} reportes críticos que pueden impedir el paso seguro hacia servicios esenciales.",
                Owner = "Municipio / mantenimiento urbano",
                Urgency = "Crítica"
            });
        }

        if (hotspots.Count > 0)
        {
            var top = hotspots[0];
            actions.Add(new ImpactActionResponse
            {
                Title = "Intervenir la zona con mayor concentración",
                Description = $"El hotspot principal concentra {top.ReportCount} reportes, principalmente {top.MainIssueLabel.ToLowerInvariant()}.",
                Owner = "Autoridades + comunidad",
                Urgency = top.PriorityLabel
            });
        }

        if (verificationReports > 0)
        {
            actions.Add(new ImpactActionResponse
            {
                Title = "Enviar verificación comunitaria",
                Description = $"{verificationReports} reportes necesitan confirmación reciente para no afectar de más el cálculo de rutas.",
                Owner = "Ciudadanía",
                Urgency = "Media"
            });
        }

        if (highReports > 0)
        {
            actions.Add(new ImpactActionResponse
            {
                Title = "Preparar paquete para municipio",
                Description = $"{highReports} casos de prioridad alta o crítica pueden convertirse en seguimiento formal con resumen para autoridad.",
                Owner = "Equipo Streets-H",
                Urgency = "Alta"
            });
        }

        if (actions.Count == 0)
        {
            actions.Add(new ImpactActionResponse
            {
                Title = "Activar recolección de reportes",
                Description = "Todavía se necesitan más reportes ciudadanos para demostrar impacto medible por zona.",
                Owner = "Equipo Streets-H",
                Urgency = "Inicial"
            });
        }

        return actions.Take(4).ToList();
    }
}
