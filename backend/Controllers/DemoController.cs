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
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public DemoController(DemoReportSeeder seeder, IWebHostEnvironment environment, IConfiguration configuration)
    {
        _seeder = seeder;
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

    private bool IsSeedEndpointEnabled()
    {
        return _environment.IsDevelopment() || _configuration.GetValue<bool>("Demo:EnableSeedEndpoint");
    }
}
