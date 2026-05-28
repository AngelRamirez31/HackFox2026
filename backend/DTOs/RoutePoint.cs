using System.ComponentModel.DataAnnotations;

namespace HackFox2026.DTOs;

public class RoutePoint
{
    [Range(-90, 90)]
    public double Lat { get; set; }

    [Range(-180, 180)]
    public double Lng { get; set; }
}
