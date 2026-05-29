using System.Collections.Concurrent;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class InMemoryReportRepository : IReportRepository
{
    private readonly ConcurrentDictionary<int, Report> _reports = new();
    private int _nextId;

    public InMemoryReportRepository()
    {
        Seed("sidewalk_damage", "Banqueta rota cerca del cruce peatonal.", 32.514947, -117.038247, 3, 2, 0, -2);
        Seed("blocked_ramp", "Rampa bloqueada por vehículo estacionado.", 32.515980, -117.034608, 3, 3, 0, -1);
        Seed("missing_ramp", "Cruce sin rampa visible para silla de ruedas.", 32.510182, -117.036537, 2, 1, 0, -5);
        Seed("construction", "Obra invadiendo parte de la banqueta.", 32.519156, -117.026355, 2, 0, 0, -8);
    }

    public Task<IReadOnlyList<Report>> GetAllAsync()
    {
        var reports = _reports.Values.OrderByDescending(report => report.CreatedAt).ToList();
        return Task.FromResult<IReadOnlyList<Report>>(reports);
    }

    public Task<Report?> GetByIdAsync(int id)
    {
        _reports.TryGetValue(id, out var report);
        return Task.FromResult(report);
    }

    public Task<Report> AddAsync(Report report)
    {
        report.Id = Interlocked.Increment(ref _nextId);
        report.CreatedAt = DateTime.UtcNow;
        _reports[report.Id] = report;
        return Task.FromResult(report);
    }

    public Task<Report?> UpdateStatusAsync(int id, string status)
    {
        if (!_reports.TryGetValue(id, out var report))
        {
            return Task.FromResult<Report?>(null);
        }

        report.Status = status;
        report.ResolvedAt = status == "resolved" ? DateTime.UtcNow : null;
        return Task.FromResult<Report?>(report);
    }

    public Task<Report?> ConfirmAsync(int id)
    {
        if (!_reports.TryGetValue(id, out var report))
        {
            return Task.FromResult<Report?>(null);
        }

        lock (report)
        {
            report.Confirmations++;
            report.LastConfirmedAt = DateTime.UtcNow;
        }

        return Task.FromResult<Report?>(report);
    }

    public Task<Report?> RejectAsync(int id)
    {
        if (!_reports.TryGetValue(id, out var report))
        {
            return Task.FromResult<Report?>(null);
        }

        lock (report)
        {
            report.Rejections++;
            report.LastRejectedAt = DateTime.UtcNow;
        }

        return Task.FromResult<Report?>(report);
    }

    private void Seed(string type, string description, double latitude, double longitude, int severity, int confirmations, int rejections, int daysOffset)
    {
        var id = Interlocked.Increment(ref _nextId);
        var createdAt = DateTime.UtcNow.AddDays(daysOffset).AddHours(-id);
        _reports[id] = new Report
        {
            Id = id,
            Type = type,
            Description = description,
            Latitude = latitude,
            Longitude = longitude,
            Severity = severity,
            Status = "active",
            Confirmations = confirmations,
            Rejections = rejections,
            CreatedAt = createdAt,
            LastConfirmedAt = confirmations > 0 ? createdAt.AddHours(3) : null,
            LastRejectedAt = rejections > 0 ? createdAt.AddHours(4) : null
        };
    }
}
