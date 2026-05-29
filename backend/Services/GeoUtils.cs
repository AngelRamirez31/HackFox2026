using HackFox2026.DTOs;
using HackFox2026.Models;

namespace HackFox2026.Services;

public static class GeoUtils
{
    private const double EarthRadiusMeters = 6371000;
    private const double MetersPerLatitudeDegree = 111320;

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
        return DistanceToRouteMeters(report, points) <= radiusMeters;
    }

    public static bool IsNearRoute(Report report, IReadOnlyList<RoutePoint> points, double radiusMeters)
    {
        return DistanceToRouteMeters(report, points) <= radiusMeters;
    }

    public static double DistanceToRouteMeters(Report report, IEnumerable<RoutePoint> points)
    {
        return DistanceToRouteMeters(report.Latitude, report.Longitude, points);
    }

    public static double DistanceToRouteMeters(double latitude, double longitude, IEnumerable<RoutePoint> points)
    {
        var routePoints = points.ToList();
        if (routePoints.Count == 0)
        {
            return double.PositiveInfinity;
        }

        if (routePoints.Count == 1)
        {
            var point = routePoints[0];
            return DistanceMeters(latitude, longitude, point.Lat, point.Lng);
        }

        var minimumDistance = double.PositiveInfinity;
        for (var index = 0; index < routePoints.Count - 1; index++)
        {
            var distance = DistancePointToSegmentMeters(latitude, longitude, routePoints[index], routePoints[index + 1]);
            if (distance < minimumDistance)
            {
                minimumDistance = distance;
            }
        }

        return minimumDistance;
    }

    public static double RouteLengthMeters(IReadOnlyList<RoutePoint> points)
    {
        if (points.Count < 2)
        {
            return 0;
        }

        double length = 0;
        for (var index = 0; index < points.Count - 1; index++)
        {
            length += DistanceMeters(points[index].Lat, points[index].Lng, points[index + 1].Lat, points[index + 1].Lng);
        }

        return length;
    }

    public static RouteBoundsResponse GetBounds(IReadOnlyList<RoutePoint> points)
    {
        if (points.Count == 0)
        {
            return new RouteBoundsResponse();
        }

        return new RouteBoundsResponse
        {
            North = points.Max(point => point.Lat),
            South = points.Min(point => point.Lat),
            East = points.Max(point => point.Lng),
            West = points.Min(point => point.Lng)
        };
    }

    private static double DistancePointToSegmentMeters(double latitude, double longitude, RoutePoint segmentStart, RoutePoint segmentEnd)
    {
        var referenceLatitudeRadians = ToRadians(latitude);
        var metersPerLongitudeDegree = MetersPerLatitudeDegree * Math.Cos(referenceLatitudeRadians);

        var pointX = 0.0;
        var pointY = 0.0;
        var startX = (segmentStart.Lng - longitude) * metersPerLongitudeDegree;
        var startY = (segmentStart.Lat - latitude) * MetersPerLatitudeDegree;
        var endX = (segmentEnd.Lng - longitude) * metersPerLongitudeDegree;
        var endY = (segmentEnd.Lat - latitude) * MetersPerLatitudeDegree;

        var segmentX = endX - startX;
        var segmentY = endY - startY;
        var segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

        if (segmentLengthSquared <= 0.000001)
        {
            return Math.Sqrt(startX * startX + startY * startY);
        }

        var t = ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSquared;
        t = Math.Clamp(t, 0, 1);

        var closestX = startX + t * segmentX;
        var closestY = startY + t * segmentY;

        return Math.Sqrt(closestX * closestX + closestY * closestY);
    }

    private static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }
}
