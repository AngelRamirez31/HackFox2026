using HackFox2026.Models;

namespace HackFox2026.Services;

public static class ReportIntelligenceRules
{
    private static readonly IReadOnlyDictionary<string, string> TypePluralLabels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["sidewalk_damage"] = "banquetas dañadas",
        ["blocked_ramp"] = "rampas bloqueadas",
        ["missing_ramp"] = "cruces sin rampa",
        ["stairs"] = "escaleras sin alternativa",
        ["unsafe_crossing"] = "cruces inseguros",
        ["construction"] = "obras o reparaciones",
        ["obstacle"] = "obstáculos en el camino",
        ["transport_issue"] = "problemas de transporte",
        ["other"] = "otros reportes"
    };

    private static readonly IReadOnlyDictionary<string, double> BasePriorityByType = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
    {
        ["blocked_ramp"] = 20,
        ["missing_ramp"] = 18,
        ["stairs"] = 18,
        ["unsafe_crossing"] = 17,
        ["sidewalk_damage"] = 15,
        ["obstacle"] = 14,
        ["construction"] = 13,
        ["transport_issue"] = 12,
        ["other"] = 9
    };

    public static string NormalizeMobilityProfile(string? profile)
    {
        if (string.IsNullOrWhiteSpace(profile))
        {
            return "default";
        }

        return ReportRules.NormalizeKey(profile) switch
        {
            "wheelchair" or "silla_de_ruedas" or "silla_ruedas" => "wheelchair",
            "walker" or "baston" or "andadera" or "crutches" or "muletas" => "walker",
            "elderly" or "adulto_mayor" or "persona_mayor" => "elderly",
            "stroller" or "carriola" or "baby_stroller" => "stroller",
            _ => "default"
        };
    }

    public static bool IsValidMobilityProfile(string? profile)
    {
        if (string.IsNullOrWhiteSpace(profile))
        {
            return true;
        }

        var normalized = ReportRules.NormalizeKey(profile);
        return normalized is "default" or "general" or "wheelchair" or "silla_de_ruedas" or "silla_ruedas"
            or "walker" or "baston" or "andadera" or "crutches" or "muletas"
            or "elderly" or "adulto_mayor" or "persona_mayor"
            or "stroller" or "carriola" or "baby_stroller";
    }

    public static string GetMobilityProfileLabel(string? profile)
    {
        return NormalizeMobilityProfile(profile) switch
        {
            "wheelchair" => "Silla de ruedas",
            "walker" => "Bastón o andadera",
            "elderly" => "Adulto mayor",
            "stroller" => "Carriola",
            _ => "General"
        };
    }

    public static string GetPluralTypeLabel(string type)
    {
        var normalized = ReportRules.NormalizeType(type);
        return TypePluralLabels.TryGetValue(normalized, out var label) ? label : ReportRules.GetTypeLabel(normalized).ToLowerInvariant();
    }

    public static DateTime? GetLastCommunityActivityAt(Report report)
    {
        DateTime?[] dates = [report.LastConfirmedAt, report.LastRejectedAt];
        var normalizedDates = dates
            .Where(date => date.HasValue)
            .Select(date => NormalizeUtc(date.Value))
            .ToList();

        return normalizedDates.Count == 0 ? null : normalizedDates.Max();
    }

    public static DateTime GetLastActivityAt(Report report)
    {
        DateTime?[] dates = [report.CreatedAt, report.ResolvedAt, report.LastConfirmedAt, report.LastRejectedAt];
        var normalizedDates = dates
            .Where(date => date.HasValue)
            .Select(date => NormalizeUtc(date.Value))
            .ToList();

        return normalizedDates.Count == 0 ? DateTime.UtcNow : normalizedDates.Max();
    }

    public static bool RequiresVerification(Report report)
    {
        if (ReportRules.Normalize(report.Status) != "active")
        {
            return false;
        }

        var now = DateTime.UtcNow;
        var createdAt = NormalizeUtc(report.CreatedAt);
        var lastCommunityActivity = GetLastCommunityActivityAt(report);
        var daysSinceCreated = (now - createdAt).TotalDays;
        var daysSinceCommunityActivity = lastCommunityActivity.HasValue
            ? (now - lastCommunityActivity.Value).TotalDays
            : daysSinceCreated;

        if (report.Rejections > report.Confirmations && report.Rejections >= 2)
        {
            return true;
        }

        if (report.Confirmations == 0 && daysSinceCreated >= 4)
        {
            return true;
        }

        if (daysSinceCommunityActivity >= 7)
        {
            return true;
        }

        return false;
    }

    public static int CalculateTrustScore(Report report)
    {
        var score = 42.0;
        var ageDays = Math.Max(0, (DateTime.UtcNow - NormalizeUtc(report.CreatedAt)).TotalDays);

        score += Math.Min(30, report.Confirmations * 11);
        score -= Math.Min(28, report.Rejections * 12);

        if (!string.IsNullOrWhiteSpace(report.ImageUrl))
        {
            score += 10;
        }

        if (report.GeminiAnalyzed)
        {
            var geminiConfidence = report.GeminiConfidence ?? 0;
            score += geminiConfidence >= 0.65 ? 9 : 5;
        }

        score += ageDays switch
        {
            <= 2 => 8,
            <= 7 => 3,
            <= 14 => -4,
            _ => -12
        };

        if (RequiresVerification(report))
        {
            score -= 16;
        }

        if (ReportRules.Normalize(report.Status) == "resolved")
        {
            score += 5;
        }

        if (ReportRules.Normalize(report.Status) == "rejected")
        {
            score -= 25;
        }

        return (int)Math.Clamp(Math.Round(score), 0, 100);
    }

    public static string GetTrustLevel(int trustScore)
    {
        return trustScore switch
        {
            >= 75 => "high",
            >= 45 => "medium",
            _ => "low"
        };
    }

    public static string GetTrustLabel(int trustScore)
    {
        return trustScore switch
        {
            >= 75 => "Alta confianza",
            >= 45 => "Media confianza",
            _ => "Baja confianza"
        };
    }

    public static string GetVerificationLabel(Report report)
    {
        if (ReportRules.Normalize(report.Status) == "resolved")
        {
            return "Resuelto por la comunidad";
        }

        if (ReportRules.Normalize(report.Status) == "rejected")
        {
            return "Rechazado por la comunidad";
        }

        return RequiresVerification(report) ? "Requiere verificación" : "Verificación vigente";
    }

    public static string BuildValidationSummary(Report report)
    {
        var confirmations = report.Confirmations == 1
            ? "1 persona confirmó que sigue ahí"
            : $"{report.Confirmations} personas confirmaron que sigue ahí";

        var rejections = report.Rejections == 1
            ? "1 persona indicó que ya no está"
            : $"{report.Rejections} personas indicaron que ya no está";

        var lastActivity = GetLastCommunityActivityAt(report);
        var activityText = lastActivity.HasValue
            ? $"Última validación: {VisualizationRules.GetCreatedAtDisplay(lastActivity.Value).ToLowerInvariant()}."
            : "Sin validación comunitaria reciente.";

        return $"{confirmations}; {rejections}. {activityText}";
    }

    public static string BuildAuthoritySummary(Report report)
    {
        var issue = ReportRules.GetTypeLabel(report.Type).ToLowerInvariant();
        var severity = ReportRules.GetSeverityLabel(report.Severity).ToLowerInvariant();
        var impact = !string.IsNullOrWhiteSpace(report.GeminiAccessibilityImpact)
            ? report.GeminiAccessibilityImpact.Trim()
            : GetDefaultAccessibilityImpact(report.Type);

        return $"Se reporta {issue} con severidad {severity}. {impact} Ubicación aproximada: {report.Latitude:0.000000}, {report.Longitude:0.000000}. {BuildValidationSummary(report)}";
    }

    public static int CalculatePriorityScore(Report report, double? distanceToRouteMeters = null)
    {
        var normalizedType = ReportRules.NormalizeType(report.Type);
        var score = report.Severity * 18.0;
        score += BasePriorityByType.TryGetValue(normalizedType, out var typeWeight) ? typeWeight : 9;
        score += Math.Min(12, report.Confirmations * 3);
        score -= Math.Min(14, report.Rejections * 4);

        var trustScore = CalculateTrustScore(report);
        score += trustScore >= 75 ? 8 : trustScore >= 45 ? 3 : -7;

        if (RequiresVerification(report))
        {
            score -= 9;
        }

        if (distanceToRouteMeters.HasValue)
        {
            score += distanceToRouteMeters.Value switch
            {
                <= 20 => 14,
                <= 50 => 9,
                <= 100 => 5,
                _ => 0
            };
        }

        return (int)Math.Clamp(Math.Round(score), 0, 100);
    }

    public static string GetPriorityLevel(int priorityScore)
    {
        return priorityScore switch
        {
            >= 85 => "critical",
            >= 65 => "high",
            >= 40 => "medium",
            _ => "low"
        };
    }

    public static string GetPriorityLabel(int priorityScore)
    {
        return priorityScore switch
        {
            >= 85 => "Crítica",
            >= 65 => "Alta",
            >= 40 => "Media",
            _ => "Baja"
        };
    }

    public static double GetAccessibilityPenalty(Report report, string? mobilityProfile, double distanceMeters)
    {
        var severityBase = report.Severity switch
        {
            1 => 6.0,
            2 => 10.0,
            3 => 15.0,
            _ => 10.0
        };

        var typeMultiplier = GetMobilityTypeMultiplier(report.Type, mobilityProfile);
        var distanceMultiplier = distanceMeters switch
        {
            <= 20 => 1.0,
            <= 50 => 0.82,
            <= 100 => 0.65,
            _ => 0.5
        };

        var trustScore = CalculateTrustScore(report);
        var trustMultiplier = trustScore switch
        {
            >= 75 => 1.05,
            >= 45 => 0.88,
            _ => 0.65
        };

        var verificationMultiplier = RequiresVerification(report) ? 0.45 : 1.0;

        if (report.Rejections > report.Confirmations && report.Rejections >= 1)
        {
            verificationMultiplier = Math.Min(verificationMultiplier, 0.55);
        }

        return Math.Round(severityBase * typeMultiplier * distanceMultiplier * trustMultiplier * verificationMultiplier, 1);
    }

    public static double GetReportEffectiveWeight(Report report)
    {
        var trustScore = CalculateTrustScore(report);
        var weight = trustScore switch
        {
            >= 75 => 1.0,
            >= 45 => 0.75,
            _ => 0.5
        };

        if (RequiresVerification(report))
        {
            weight *= 0.45;
        }

        return Math.Round(weight, 2);
    }

    private static double GetMobilityTypeMultiplier(string type, string? mobilityProfile)
    {
        var normalizedType = ReportRules.NormalizeType(type);
        var profile = NormalizeMobilityProfile(mobilityProfile);

        return profile switch
        {
            "wheelchair" => normalizedType switch
            {
                "stairs" => 2.0,
                "missing_ramp" => 1.85,
                "blocked_ramp" => 1.75,
                "sidewalk_damage" => 1.45,
                "obstacle" => 1.35,
                "unsafe_crossing" => 1.25,
                _ => 1.15
            },
            "walker" => normalizedType switch
            {
                "stairs" => 1.65,
                "sidewalk_damage" => 1.35,
                "unsafe_crossing" => 1.3,
                "obstacle" => 1.2,
                _ => 1.05
            },
            "elderly" => normalizedType switch
            {
                "stairs" => 1.55,
                "unsafe_crossing" => 1.45,
                "sidewalk_damage" => 1.3,
                "construction" => 1.2,
                _ => 1.05
            },
            "stroller" => normalizedType switch
            {
                "stairs" => 1.75,
                "missing_ramp" => 1.55,
                "blocked_ramp" => 1.45,
                "sidewalk_damage" => 1.25,
                "obstacle" => 1.25,
                _ => 1.05
            },
            _ => 1.0
        };
    }

    private static string GetDefaultAccessibilityImpact(string type)
    {
        return ReportRules.NormalizeType(type) switch
        {
            "blocked_ramp" => "La rampa bloqueada puede impedir el cruce seguro de personas usuarias de silla de ruedas, carriolas o andaderas y obligarlas a circular por la calle.",
            "missing_ramp" => "La ausencia de rampa limita el tránsito seguro de personas usuarias de silla de ruedas o carriolas y puede obligarlas a circular por la calle.",
            "sidewalk_damage" => "La banqueta dañada aumenta el riesgo de tropiezos, caídas y desvíos inseguros para personas con movilidad reducida.",
            "stairs" => "Las escaleras sin alternativa accesible bloquean el paso de personas que no pueden subir escalones de forma segura.",
            "unsafe_crossing" => "El cruce inseguro reduce la visibilidad y puede exponer a peatones vulnerables al tránsito vehicular.",
            "construction" => "La obra reduce el espacio de circulación y puede dejar a peatones sin una ruta accesible clara.",
            "obstacle" => "El obstáculo reduce el ancho útil de paso y puede impedir el tránsito continuo de personas con ayudas de movilidad.",
            "transport_issue" => "El problema de transporte puede dificultar el acceso a paradas, unidades o conexiones necesarias para completar el trayecto.",
            _ => "La barrera reportada puede reducir la seguridad y continuidad del recorrido peatonal accesible."
        };
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
        {
            return value;
        }

        if (value.Kind == DateTimeKind.Unspecified)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        return value.ToUniversalTime();
    }
}
