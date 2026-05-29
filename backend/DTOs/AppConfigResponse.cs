namespace HackFox2026.DTOs;

public class AppConfigResponse
{
    public string AppName { get; set; } = "HackFox2026";
    public string Track { get; set; } = "Tijuana Sin Barreras";
    public string BackendVersion { get; set; } = "local-dev";
    public object Api { get; set; } = new();
    public object Reports { get; set; } = new();
    public object Routes { get; set; } = new();
    public object Uploads { get; set; } = new();
    public object Map { get; set; } = new();
    public object Resources { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
