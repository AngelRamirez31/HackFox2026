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
            >= 50 => "Ruta con precaución",
            _ => "Ruta poco accesible"
        };
    }

    public static string GetRouteMessage(int score, int nearbyReports)
    {
        if (nearbyReports == 0)
        {
            return "No se detectaron barreras reportadas cerca de esta ruta.";
        }

        return score switch
        {
            >= 80 => "La ruta tiene reportes cercanos, pero el nivel general de accesibilidad sigue siendo alto.",
            >= 50 => "La ruta tiene barreras cercanas. Se recomienda avanzar con precaución.",
            _ => "La ruta tiene varias barreras cercanas. Se recomienda buscar una alternativa si es posible."
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
                StrokeColor = "#f59e0b",
                StrokeOpacity = 0.9,
                StrokeWeight = 6,
                BadgeLabel = "Amarillo",
                Description = "Ruta con precaución"
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
