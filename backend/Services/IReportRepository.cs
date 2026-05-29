using HackFox2026.Models;

namespace HackFox2026.Services;

public interface IReportRepository
{
    Task<IReadOnlyList<Report>> GetAllAsync();
    Task<Report?> GetByIdAsync(int id);
    Task<Report> AddAsync(Report report);
    Task<Report?> UpdateStatusAsync(int id, string status);
    Task<Report?> ConfirmAsync(int id);
    Task<Report?> RejectAsync(int id);
}
