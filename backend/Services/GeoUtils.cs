using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public static class GeoUtils
{
    private const double EarthRadiusMeters = 6371000;

    public static double DistanceMeters(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLng = ToRadians(lng2 - lng1);
        var rLat1 = ToRadians(lat1);
        var rLat2 = ToRadians(lat2);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(rLat1) * Math.Cos(rLat2) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    public static bool IsNearAnyPoint(Report report, IEnumerable<RoutePoint> points, double radiusMeters)
    {
        return points.Any(point => DistanceMeters(report.Latitude, report.Longitude, point.Lat, point.Lng) <= radiusMeters);
    }

    private static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }
}
