using HackFox2026.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private readonly DemoReportSeeder _seeder;
    private readonly IReportRepository _reports;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public DemoController(
        DemoReportSeeder seeder,
        IReportRepository reports,
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        _seeder = seeder;
        _reports = reports;
        _environment = environment;
        _configuration = configuration;
    }

    [HttpPost("seed-reports")]
    public async Task<IActionResult> SeedDemoReports()
    {
        if (!IsSeedEndpointEnabled())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "El sembrado de datos demo está desactivado. Actívalo con Demo:EnableSeedEndpoint=true si lo necesitas para una demo desplegada."
            });
        }

        var result = await _seeder.SeedAsync();
        return Ok(new
        {
            message = result.AddedReports == 0
                ? "No se agregaron reportes porque los datos demo ya existen."
                : "Datos demo agregados correctamente.",
            result.ExistingReportsBeforeSeed,
            result.AddedReports,
            result.Reports
        });
    }

    [HttpPost("reset-reports")]
    public async Task<IActionResult> ResetDemoReports([FromQuery] bool seed = false)
    {
        if (!IsSeedEndpointEnabled())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "El reinicio de datos demo está desactivado. Actívalo con Demo:EnableSeedEndpoint=true si lo necesitas para una demo desplegada."
            });
        }

        var deletedReports = await _reports.DeleteAllAsync();
        object? seedResult = null;

        if (seed)
        {
            seedResult = await _seeder.SeedAsync();
        }

        return Ok(new
        {
            message = seed ? "Reportes reiniciados y datos demo sembrados." : "Reportes eliminados correctamente.",
            deletedReports,
            seedResult
        });
    }

    private bool IsSeedEndpointEnabled()
    {
        return _environment.IsDevelopment() || _configuration.GetValue<bool>("Demo:EnableSeedEndpoint");
    }
}
