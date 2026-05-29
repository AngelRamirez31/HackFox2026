using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public static class VisualizationRules
{
    public static string GetStatusLabel(string status)
    {
        return ReportRules.Normalize(status) switch
        {
            "active" => "Activo",
            "resolved" => "Resuelto",
            "rejected" => "Rechazado",
            _ => "Desconocido"
        };
    }

    public static string GetSeverityColor(int severity)
    {
        return severity switch
        {
            1 => "#2563eb",
            2 => "#f59e0b",
            3 => "#dc2626",
            _ => "#6b7280"
        };
    }

    public static string GetMarkerColor(Report report)
    {
        var status = ReportRules.Normalize(report.Status);
        if (status == "resolved")
        {
            return "#16a34a";
        }

        if (status == "rejected")
        {
            return "#6b7280";
        }

        return GetSeverityColor(report.Severity);
    }

    public static string GetMarkerIcon(string type)
    {
        return ReportRules.NormalizeType(type) switch
        {
            "sidewalk_damage" => "🚧",
            "blocked_ramp" => "♿",
            "missing_ramp" => "↗️",
            "stairs" => "🪜",
            "unsafe_crossing" => "⚠️",
            "construction" => "🏗️",
            "obstacle" => "⛔",
            "transport_issue" => "🚌",
            _ => "📍"
        };
    }

    public static bool RequiresAttention(Report report)
    {
        return ReportRules.Normalize(report.Status) == "active" && report.Severity >= 2;
    }

    public static string GetCreatedAtDisplay(DateTime createdAt)
    {
        var utc = createdAt.Kind == DateTimeKind.Utc ? createdAt : createdAt.ToUniversalTime();
        var difference = DateTime.UtcNow - utc;

        if (difference.TotalMinutes < 1)
        {
            return "Hace menos de un minuto";
        }

        if (difference.TotalMinutes < 60)
        {
            var minutes = (int)Math.Floor(difference.TotalMinutes);
            return minutes == 1 ? "Hace 1 minuto" : $"Hace {minutes} minutos";
        }

        if (difference.TotalHours < 24)
        {
            var hours = (int)Math.Floor(difference.TotalHours);
            return hours == 1 ? "Hace 1 hora" : $"Hace {hours} horas";
        }

        if (difference.TotalDays < 30)
        {
            var days = (int)Math.Floor(difference.TotalDays);
            return days == 1 ? "Hace 1 día" : $"Hace {days} días";
        }

        return utc.ToString("yyyy-MM-dd");
    }

    public static string GetRouteLevelLabel(int score)
    {
        return score switch
        {
            >= 80 => "Ruta accesible",
            >= 50 => "Ruta intermedia",
            _ => "Ruta poco accesible"
        };
    }

    public static string GetRouteMessage(int score, int nearbyReports)
    {
        if (nearbyReports == 0)
        {
            return "Esta ruta no tiene barreras reportadas cerca. Accesibilidad 100/100.";
        }

        return score switch
        {
            >= 80 => $"Ruta accesible: se detectaron {nearbyReports} reportes cercanos. Accesibilidad {score}/100.",
            >= 50 => $"Ruta intermedia: se detectaron {nearbyReports} reportes cercanos. Accesibilidad {score}/100.",
            _ => $"Ruta poco accesible: se detectaron {nearbyReports} reportes cercanos. Accesibilidad {score}/100."
        };
    }

    public static RouteStyleResponse GetRouteStyle(int score)
    {
        return score switch
        {
            >= 80 => new RouteStyleResponse
            {
                StrokeColor = "#16a34a",
                StrokeOpacity = 0.9,
                StrokeWeight = 6,
                BadgeLabel = "Verde",
                Description = "Ruta accesible"
            },
            >= 50 => new RouteStyleResponse
            {
                StrokeColor = "#f97316",
                StrokeOpacity = 0.9,
                StrokeWeight = 6,
                BadgeLabel = "Naranja",
                Description = "Ruta intermedia"
            },
            _ => new RouteStyleResponse
            {
                StrokeColor = "#dc2626",
                StrokeOpacity = 0.95,
                StrokeWeight = 7,
                BadgeLabel = "Rojo",
                Description = "Ruta poco accesible"
            }
        };
    }
}
