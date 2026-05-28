using HackFox2026.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IReportRepository, InMemoryReportRepository>();
builder.Services.AddScoped<LocalFileStorageService>();
builder.Services.AddScoped<AccessibilityScoringService>();
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
