using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/firebase")]
public class FirebaseController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public FirebaseController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var provider = _configuration["Persistence:Provider"] ?? _configuration["Firebase:Provider"] ?? "InMemory";
        var isFirestore = string.Equals(provider, "Firestore", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, "Firebase", StringComparison.OrdinalIgnoreCase);
        var projectId = _configuration["Firebase:ProjectId"];
        var credentialsPath = _configuration["Firebase:CredentialsPath"];
        var envCredentials = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

        return Ok(new
        {
            provider,
            database = isFirestore ? "Cloud Firestore" : "InMemory",
            firestoreEnabled = isFirestore,
            projectConfigured = !string.IsNullOrWhiteSpace(projectId),
            projectId = string.IsNullOrWhiteSpace(projectId) ? null : projectId,
            reportsCollection = _configuration["Firebase:ReportsCollection"] ?? "reports",
            credentialsConfigured = !string.IsNullOrWhiteSpace(credentialsPath) || !string.IsNullOrWhiteSpace(envCredentials),
            credentialsSource = GetCredentialSource(credentialsPath, envCredentials),
            note = isFirestore
                ? "El backend intentará guardar reportes en Firebase Cloud Firestore."
                : "El backend sigue usando memoria local. Configura Persistence:Provider=Firestore para activar Firebase."
        });
    }

    private static string GetCredentialSource(string? credentialsPath, string? envCredentials)
    {
        if (!string.IsNullOrWhiteSpace(credentialsPath))
        {
            return "Firebase:CredentialsPath";
        }

        if (!string.IsNullOrWhiteSpace(envCredentials))
        {
            return "GOOGLE_APPLICATION_CREDENTIALS";
        }

        return "ADC/gcloud o service account del entorno";
    }
}
