using System.Globalization;
using System.Text;

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

    private static readonly IReadOnlyDictionary<string, string> TypeAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["banqueta_rota"] = "sidewalk_damage",
        ["banqueta_danada"] = "sidewalk_damage",
        ["sidewalk_damage"] = "sidewalk_damage",
        ["sidewalk_damaged"] = "sidewalk_damage",
        ["rampa_bloqueada"] = "blocked_ramp",
        ["blocked_ramp"] = "blocked_ramp",
        ["rampa_obstruida"] = "blocked_ramp",
        ["sin_rampa"] = "missing_ramp",
        ["falta_de_rampa"] = "missing_ramp",
        ["missing_ramp"] = "missing_ramp",
        ["sin_banqueta"] = "missing_ramp",
        ["escalon_sin_rampa"] = "stairs",
        ["escalones_sin_rampa"] = "stairs",
        ["escaleras"] = "stairs",
        ["stairs"] = "stairs",
        ["cruce_inseguro"] = "unsafe_crossing",
        ["unsafe_crossing"] = "unsafe_crossing",
        ["obra"] = "construction",
        ["obra_o_reparacion"] = "construction",
        ["construccion"] = "construction",
        ["construction"] = "construction",
        ["obstaculo"] = "obstacle",
        ["obstaculo_en_el_camino"] = "obstacle",
        ["obstaculo_en_camino"] = "obstacle",
        ["pendiente_peligrosa"] = "obstacle",
        ["obstacle"] = "obstacle",
        ["problema_de_transporte"] = "transport_issue",
        ["transporte_inaccesible"] = "transport_issue",
        ["transport_issue"] = "transport_issue",
        ["otro"] = "other",
        ["other"] = "other"
    };

    public static bool IsValidType(string? type)
    {
        var normalized = NormalizeType(type ?? string.Empty);
        return TypeLabels.ContainsKey(normalized);
    }

    public static bool IsValidStatus(string? status)
    {
        return !string.IsNullOrWhiteSpace(status) && Statuses.Contains(Normalize(status));
    }

    public static string Normalize(string value)
    {
        return value.Trim().ToLowerInvariant();
    }

    public static string NormalizeType(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var key = NormalizeKey(value);
        return TypeAliases.TryGetValue(key, out var canonical) ? canonical : key;
    }

    public static string GetTypeLabel(string type)
    {
        var normalized = NormalizeType(type);
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

    public static bool TryParseSeverity(string? value, out int severity)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            severity = 2;
            return true;
        }

        var key = NormalizeKey(value);
        severity = key switch
        {
            "1" or "baja" or "low" => 1,
            "2" or "media" or "medium" => 2,
            "3" or "alta" or "high" => 3,
            _ => 0
        };

        if (severity is >= 1 and <= 3)
        {
            return true;
        }

        if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed is >= 1 and <= 3)
        {
            severity = parsed;
            return true;
        }

        severity = 2;
        return false;
    }

    public static string NormalizeKey(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        var lastWasSeparator = false;

        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                lastWasSeparator = false;
                continue;
            }

            if (character == '_' || character == '-' || char.IsWhiteSpace(character))
            {
                if (!lastWasSeparator && builder.Length > 0)
                {
                    builder.Append('_');
                    lastWasSeparator = true;
                }
            }
        }

        return builder.ToString().Trim('_');
    }
}
