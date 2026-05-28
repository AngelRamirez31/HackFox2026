var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// OpenAPI
builder.Services.AddOpenApi();

// CORS debe ir ANTES de builder.Build()
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// CORS debe ir antes de Authorization y antes de MapControllers
app.UseCors("FrontendPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();