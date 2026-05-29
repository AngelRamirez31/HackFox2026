using HackFox2026.DTOs;
using HackFox2026.Services;
using Microsoft.AspNetCore.Mvc;

namespace HackFox2026.Controllers;

[ApiController]
[Route("api/essential-destinations")]
public class EssentialDestinationsController : ControllerBase
{
    private readonly EssentialDestinationService _destinations;

    public EssentialDestinationsController(EssentialDestinationService destinations)
    {
        _destinations = destinations;
    }

    [HttpGet]
    public ActionResult<IReadOnlyList<EssentialDestinationResponse>> GetAll([FromQuery] string? category = null)
    {
        var destinations = _destinations.GetAll();

        if (!string.IsNullOrWhiteSpace(category))
        {
            destinations = destinations
                .Where(destination => string.Equals(destination.Category, category.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return Ok(destinations);
    }

    [HttpGet("{key}")]
    public ActionResult<EssentialDestinationResponse> GetByKey(string key)
    {
        var destination = _destinations.GetByKey(key);

        if (destination is null)
        {
            return NotFound(new { message = "Destino esencial no encontrado." });
        }

        return Ok(destination);
    }
}
