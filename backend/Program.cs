using Google.Cloud.Firestore;
using HackFox2026.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var firebaseCredentialsPath = builder.Configuration["Firebase:CredentialsPath"];
if (!string.IsNullOrWhiteSpace(firebaseCredentialsPath))
{
    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", firebaseCredentialsPath);
}

var persistenceProvider = builder.Configuration["Persistence:Provider"]
    ?? builder.Configuration["Firebase:Provider"]
    ?? "InMemory";

if (string.Equals(persistenceProvider, "Firestore", StringComparison.OrdinalIgnoreCase)
    || string.Equals(persistenceProvider, "Firebase", StringComparison.OrdinalIgnoreCase))
{
    var projectId = builder.Configuration["Firebase:ProjectId"];
    if (string.IsNullOrWhiteSpace(projectId))
    {
        throw new InvalidOperationException("Firebase:ProjectId es obligatorio cuando Persistence:Provider es Firestore.");
    }

    var credentialsPath = builder.Configuration["Firebase:CredentialsPath"];
    if (!string.IsNullOrWhiteSpace(credentialsPath))
    {
        Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialsPath);
    }

    builder.Services.AddSingleton(_ => FirestoreDb.Create(projectId));
    builder.Services.AddSingleton<IReportRepository, FirestoreReportRepository>();
}
else
{
    builder.Services.AddSingleton<IReportRepository, InMemoryReportRepository>();
}

builder.Services.AddScoped<LocalFileStorageService>();
builder.Services.AddScoped<AccessibilityScoringService>();
builder.Services.AddScoped<ReportAnalyticsService>();
builder.Services.AddScoped<DemoReportSeeder>();
builder.Services.AddHttpClient<GeminiVisionService>();

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = LocalFileStorageService.MaxImageSizeBytes + 1024 * 1024;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("FrontendPolicy");
app.UseAuthorization();
app.MapControllers();

app.Run();
