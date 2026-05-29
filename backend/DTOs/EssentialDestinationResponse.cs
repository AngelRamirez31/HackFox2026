namespace HackFox2026.DTOs;

public class EssentialDestinationResponse
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string CategoryLabel { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string RecommendedMobilityProfile { get; set; } = string.Empty;
    public string RecommendedMobilityProfileLabel { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string WhyImportant { get; set; } = string.Empty;
    public string EstimatedDemandLabel { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
}
