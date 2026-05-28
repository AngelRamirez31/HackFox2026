using System.Globalization;
using Google.Cloud.Firestore;
using HackFox2026.Models;

namespace HackFox2026.Services;

public class FirestoreReportRepository : IReportRepository
{
    private readonly FirestoreDb _db;
    private readonly CollectionReference _reportsCollection;
    private readonly DocumentReference _counterDocument;
    public FirestoreReportRepository(FirestoreDb db, IConfiguration configuration)
    {
        _db = db;
        var collectionName = configuration["Firebase:ReportsCollection"];
        if (string.IsNullOrWhiteSpace(collectionName))
        {
            collectionName = "reports";
        }

        _reportsCollection = _db.Collection(collectionName);
        _counterDocument = _db.Collection("_metadata").Document("counters");
    }

    public async Task<IReadOnlyList<Report>> GetAllAsync()
    {
        var snapshot = await _reportsCollection.GetSnapshotAsync();
        var reports = snapshot.Documents
            .Where(document => document.Exists)
            .Select(ToReport)
            .OrderByDescending(report => report.CreatedAt)
            .ToList();

        return reports;
    }

    public async Task<Report?> GetByIdAsync(int id)
    {
        var document = await GetDocument(id).GetSnapshotAsync();
        return document.Exists ? ToReport(document) : null;
    }

    public async Task<Report> AddAsync(Report report)
    {
        return await _db.RunTransactionAsync(async transaction =>
        {
            var counterSnapshot = await transaction.GetSnapshotAsync(_counterDocument);
            var nextId = 1;

            if (counterSnapshot.Exists && counterSnapshot.TryGetValue<int>("reportsLastId", out var lastId))
            {
                nextId = lastId + 1;
            }

            report.Id = nextId;
            report.Status = string.IsNullOrWhiteSpace(report.Status) ? "active" : ReportRules.Normalize(report.Status);
            report.CreatedAt = NormalizeUtc(report.CreatedAt == default ? DateTime.UtcNow : report.CreatedAt);
            report.ResolvedAt = report.ResolvedAt.HasValue ? NormalizeUtc(report.ResolvedAt.Value) : null;

            var document = GetDocument(nextId);

            transaction.Set(_counterDocument, new Dictionary<string, object>
            {
                ["reportsLastId"] = nextId,
                ["updatedAt"] = Timestamp.FromDateTime(DateTime.UtcNow)
            }, SetOptions.MergeAll);

            transaction.Set(document, ToDictionary(report));

            return Copy(report);
        });
    }

    public async Task<Report?> UpdateStatusAsync(int id, string status)
    {
        status = ReportRules.Normalize(status);
        var document = GetDocument(id);

        return await _db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(document);
            if (!snapshot.Exists)
            {
                return null;
            }

            var report = ToReport(snapshot);
            report.Status = status;
            report.ResolvedAt = status == "resolved" ? DateTime.UtcNow : null;

            transaction.Set(document, new Dictionary<string, object>
            {
                ["status"] = report.Status,
                ["resolvedAt"] = report.ResolvedAt.HasValue
                    ? Timestamp.FromDateTime(NormalizeUtc(report.ResolvedAt.Value))
                    : null!
            }, SetOptions.MergeAll);

            return report;
        });
    }

    public async Task<Report?> ConfirmAsync(int id)
    {
        var document = GetDocument(id);

        return await _db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(document);
            if (!snapshot.Exists)
            {
                return null;
            }

            var report = ToReport(snapshot);
            report.Confirmations++;

            transaction.Set(document, new Dictionary<string, object>
            {
                ["confirmations"] = report.Confirmations
            }, SetOptions.MergeAll);

            return report;
        });
    }

    public async Task<Report?> RejectAsync(int id)
    {
        var document = GetDocument(id);

        return await _db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(document);
            if (!snapshot.Exists)
            {
                return null;
            }

            var report = ToReport(snapshot);
            report.Rejections++;

            transaction.Set(document, new Dictionary<string, object>
            {
                ["rejections"] = report.Rejections
            }, SetOptions.MergeAll);

            return report;
        });
    }

    private DocumentReference GetDocument(int id)
    {
        return _reportsCollection.Document(id.ToString(CultureInfo.InvariantCulture));
    }

    private static Dictionary<string, object> ToDictionary(Report report)
    {
        return new Dictionary<string, object>
        {
            ["id"] = report.Id,
            ["type"] = report.Type,
            ["description"] = report.Description,
            ["latitude"] = report.Latitude,
            ["longitude"] = report.Longitude,
            ["severity"] = report.Severity,
            ["status"] = report.Status,
            ["imageUrl"] = report.ImageUrl ?? null!,
            ["createdAt"] = Timestamp.FromDateTime(NormalizeUtc(report.CreatedAt)),
            ["resolvedAt"] = report.ResolvedAt.HasValue ? Timestamp.FromDateTime(NormalizeUtc(report.ResolvedAt.Value)) : null!,
            ["confirmations"] = report.Confirmations,
            ["rejections"] = report.Rejections
        };
    }

    private static Report ToReport(DocumentSnapshot document)
    {
        var data = document.ToDictionary();
        var fallbackId = int.TryParse(document.Id, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id) ? id : 0;

        return new Report
        {
            Id = GetInt(data, "id", fallbackId),
            Type = GetString(data, "type", "other"),
            Description = GetString(data, "description", string.Empty),
            Latitude = GetDouble(data, "latitude"),
            Longitude = GetDouble(data, "longitude"),
            Severity = Math.Clamp(GetInt(data, "severity", 2), 1, 3),
            Status = GetString(data, "status", "active"),
            ImageUrl = GetNullableString(data, "imageUrl"),
            CreatedAt = GetDateTime(data, "createdAt") ?? DateTime.UtcNow,
            ResolvedAt = GetDateTime(data, "resolvedAt"),
            Confirmations = Math.Max(0, GetInt(data, "confirmations")),
            Rejections = Math.Max(0, GetInt(data, "rejections"))
        };
    }

    private static Report Copy(Report report)
    {
        return new Report
        {
            Id = report.Id,
            Type = report.Type,
            Description = report.Description,
            Latitude = report.Latitude,
            Longitude = report.Longitude,
            Severity = report.Severity,
            Status = report.Status,
            ImageUrl = report.ImageUrl,
            CreatedAt = report.CreatedAt,
            ResolvedAt = report.ResolvedAt,
            Confirmations = report.Confirmations,
            Rejections = report.Rejections
        };
    }

    private static string GetString(IReadOnlyDictionary<string, object> data, string key, string fallback)
    {
        if (!data.TryGetValue(key, out var value) || value is null)
        {
            return fallback;
        }

        var text = value.ToString();
        return string.IsNullOrWhiteSpace(text) ? fallback : text;
    }

    private static string? GetNullableString(IReadOnlyDictionary<string, object> data, string key)
    {
        if (!data.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        var text = value.ToString();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static int GetInt(IReadOnlyDictionary<string, object> data, string key, int fallback = 0)
    {
        if (!data.TryGetValue(key, out var value) || value is null)
        {
            return fallback;
        }

        try
        {
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }
        catch (Exception)
        {
            return fallback;
        }
    }

    private static double GetDouble(IReadOnlyDictionary<string, object> data, string key, double fallback = 0)
    {
        if (!data.TryGetValue(key, out var value) || value is null)
        {
            return fallback;
        }

        try
        {
            return Convert.ToDouble(value, CultureInfo.InvariantCulture);
        }
        catch (Exception)
        {
            return fallback;
        }
    }

    private static DateTime? GetDateTime(IReadOnlyDictionary<string, object> data, string key)
    {
        if (!data.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value switch
        {
            Timestamp timestamp => timestamp.ToDateTime(),
            DateTime dateTime => NormalizeUtc(dateTime),
            string text when DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed) => NormalizeUtc(parsed),
            _ => null
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
