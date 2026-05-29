using HackFox2026.Models;

namespace HackFox2026.Services;

public class DemoReportSeeder
{
    private readonly IReportRepository _reports;

    public DemoReportSeeder(IReportRepository reports)
    {
        _reports = reports;
    }

    public async Task<DemoSeedResult> SeedAsync()
    {
        var existingReports = await _reports.GetAllAsync();
        var addedReports = new List<Report>();

        foreach (var report in GetDemoReports())
        {
            var alreadyExists = existingReports.Any(existing =>
                existing.Type == report.Type &&
                GeoUtils.DistanceMeters(existing.Latitude, existing.Longitude, report.Latitude, report.Longitude) <= 15);

            if (alreadyExists)
            {
                continue;
            }

            var added = await _reports.AddAsync(report);
            addedReports.Add(added);
        }

        return new DemoSeedResult(existingReports.Count, addedReports.Count, addedReports.Select(ReportMapper.ToResponse).ToList());
    }

    private static IEnumerable<Report> GetDemoReports()
    {
        return new[]
        {
            new Report
            {
                Type = "sidewalk_damage",
                Description = "Banqueta dañada cerca del cruce peatonal; una silla de ruedas tendría que bajar a la calle.",
                Latitude = 32.514947,
                Longitude = -117.038247,
                Severity = 3,
                Status = "active",
                Confirmations = 6,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-2),
                CreatedAt = DateTime.UtcNow.AddHours(-8)
            },
            new Report
            {
                Type = "blocked_ramp",
                Description = "Rampa bloqueada por vehículo estacionado frente al paso peatonal.",
                Latitude = 32.515980,
                Longitude = -117.034608,
                Severity = 3,
                Status = "active",
                Confirmations = 4,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-6)
            },
            new Report
            {
                Type = "missing_ramp",
                Description = "Cruce sin rampa visible para personas con silla de ruedas o carriola.",
                Latitude = 32.510182,
                Longitude = -117.036537,
                Severity = 2,
                Status = "active",
                Confirmations = 3,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-2),
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new Report
            {
                Type = "construction",
                Description = "Obra invadiendo parte de la banqueta sin paso alternativo claro.",
                Latitude = 32.519156,
                Longitude = -117.026355,
                Severity = 2,
                Status = "active",
                Confirmations = 2,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-3),
                CreatedAt = DateTime.UtcNow.AddHours(-4)
            },
            new Report
            {
                Type = "unsafe_crossing",
                Description = "Cruce con poca visibilidad y sin señalización clara para peatones.",
                Latitude = 32.533100,
                Longitude = -117.043100,
                Severity = 3,
                Status = "active",
                Confirmations = 5,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            },
            new Report
            {
                Type = "obstacle",
                Description = "Objeto fijo reduciendo el espacio disponible en la banqueta.",
                Latitude = 32.526700,
                Longitude = -117.120600,
                Severity = 1,
                Status = "active",
                Confirmations = 1,
                LastConfirmedAt = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            }
        };
    }
}

public record DemoSeedResult(int ExistingReportsBeforeSeed, int AddedReports, IReadOnlyList<HackFox2026.DTOs.ReportResponse> Reports);
