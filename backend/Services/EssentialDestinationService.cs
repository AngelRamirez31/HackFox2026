using HackFox2026.DTOs;

namespace HackFox2026.Services;

public class EssentialDestinationService
{
    public IReadOnlyList<EssentialDestinationResponse> GetAll()
    {
        return
        [
            Build(
                key: "imss-hgr-1",
                name: "IMSS Hospital General Regional No. 1",
                category: "health",
                categoryLabel: "Salud",
                description: "Destino de alta prioridad para traslados médicos y consultas.",
                lat: 32.515594,
                lng: -117.035612,
                profile: "wheelchair",
                icon: "🏥",
                whyImportant: "Llegar a servicios médicos debe ser seguro para personas usuarias de silla de ruedas, adultos mayores y acompañantes.",
                demand: "Demanda alta",
                tags: ["IMSS", "hospital", "consulta", "emergencia"]),
            Build(
                key: "hospital-general-tijuana",
                name: "Hospital General de Tijuana",
                category: "health",
                categoryLabel: "Salud",
                description: "Punto crítico para atención médica pública en la ciudad.",
                lat: 32.519052,
                lng: -117.026412,
                profile: "wheelchair",
                icon: "🏥",
                whyImportant: "Las barreras cercanas pueden retrasar traslados médicos o forzar a circular por la calle.",
                demand: "Demanda alta",
                tags: ["hospital", "salud", "servicio público"]),
            Build(
                key: "palacio-municipal",
                name: "Palacio Municipal de Tijuana",
                category: "government",
                categoryLabel: "Gobierno",
                description: "Destino frecuente para trámites, pagos y servicios municipales.",
                lat: 32.532010,
                lng: -117.043165,
                profile: "elderly",
                icon: "🏛️",
                whyImportant: "Los trámites públicos deben poder realizarse sin depender de rutas inseguras o inaccesibles.",
                demand: "Demanda media-alta",
                tags: ["gobierno", "trámites", "municipio"]),
            Build(
                key: "cecyte-zona-rio",
                name: "Zona escolar / universitaria cercana a Zona Río",
                category: "education",
                categoryLabel: "Educación",
                description: "Referencia para evaluar trayectos escolares y cruces con alto flujo peatonal.",
                lat: 32.526720,
                lng: -117.044108,
                profile: "default",
                icon: "🎓",
                whyImportant: "Las zonas escolares necesitan cruces claros, banquetas continuas y reportes visibles para estudiantes y familias.",
                demand: "Demanda media",
                tags: ["escuela", "estudiantes", "cruces"]),
            Build(
                key: "parada-transporte-centro",
                name: "Nodo de transporte Centro",
                category: "transport",
                categoryLabel: "Transporte",
                description: "Punto de conexión para rutas urbanas y último tramo peatonal.",
                lat: 32.533050,
                lng: -117.120685,
                profile: "walker",
                icon: "🚌",
                whyImportant: "El último tramo hacia transporte público suele definir si el trayecto completo es viable.",
                demand: "Demanda alta",
                tags: ["transporte", "parada", "último tramo"])
        ];
    }

    public EssentialDestinationResponse GetDefault()
    {
        return GetAll().First(destination => destination.Key == "imss-hgr-1");
    }

    public EssentialDestinationResponse? GetByKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        return GetAll().FirstOrDefault(destination => string.Equals(destination.Key, key.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    private static EssentialDestinationResponse Build(
        string key,
        string name,
        string category,
        string categoryLabel,
        string description,
        double lat,
        double lng,
        string profile,
        string icon,
        string whyImportant,
        string demand,
        List<string> tags)
    {
        var normalizedProfile = ReportIntelligenceRules.NormalizeMobilityProfile(profile);

        return new EssentialDestinationResponse
        {
            Key = key,
            Name = name,
            Category = category,
            CategoryLabel = categoryLabel,
            Description = description,
            Lat = lat,
            Lng = lng,
            RecommendedMobilityProfile = normalizedProfile,
            RecommendedMobilityProfileLabel = ReportIntelligenceRules.GetMobilityProfileLabel(normalizedProfile),
            Icon = icon,
            WhyImportant = whyImportant,
            EstimatedDemandLabel = demand,
            Tags = tags
        };
    }
}
