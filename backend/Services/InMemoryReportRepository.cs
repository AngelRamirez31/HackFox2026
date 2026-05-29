using System.Collections.Concurrent;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class InMemoryReportRepository : IReportRepository
{
    private readonly ConcurrentDictionary<int, Report> _reports = new();
    private int _nextId;

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
        report.CreatedAt = report.CreatedAt == default ? DateTime.UtcNow : NormalizeUtc(report.CreatedAt);
        report.ResolvedAt = report.ResolvedAt.HasValue ? NormalizeUtc(report.ResolvedAt.Value) : null;
        report.LastConfirmedAt = report.LastConfirmedAt.HasValue ? NormalizeUtc(report.LastConfirmedAt.Value) : null;
        report.LastRejectedAt = report.LastRejectedAt.HasValue ? NormalizeUtc(report.LastRejectedAt.Value) : null;
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
