namespace HackFox2026.Services;

public static class ReportRules
{
    public static readonly IReadOnlyDictionary<string, string> TypeLabels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["sidewalk_damage"] = "Banqueta dañada",
        ["blocked_ramp"] = "Rampa bloqueada",
        ["missing_ramp"] = "Falta de rampa",
        ["stairs"] = "Escaleras sin alternativa",
        ["unsafe_crossing"] = "Cruce inseguro",
        ["construction"] = "Obra o reparación",
        ["obstacle"] = "Obstáculo en camino",
        ["transport_issue"] = "Problema de transporte",
        ["other"] = "Otro"
    };

    public static readonly IReadOnlySet<string> Statuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "active",
        "resolved",
        "rejected"
    };

    public static bool IsValidType(string type)
    {
        return TypeLabels.ContainsKey(Normalize(type));
    }

    public static bool IsValidStatus(string status)
    {
        return Statuses.Contains(Normalize(status));
    }

    public static string Normalize(string value)
    {
        return value.Trim().ToLowerInvariant();
    }

    public static string GetTypeLabel(string type)
    {
        var normalized = Normalize(type);
        return TypeLabels.TryGetValue(normalized, out var label) ? label : "Otro";
    }

    public static string GetSeverityLabel(int severity)
    {
        return severity switch
        {
            1 => "Baja",
            2 => "Media",
            3 => "Alta",
            _ => "Media"
        };
    }
}
