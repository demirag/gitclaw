namespace GitClaw.Core.Models;

/// <summary>
/// Represents a watch subscription for repository activity notifications
/// </summary>
public class RepositoryWatch
{
    public Guid Id { get; set; }
    public Guid RepositoryId { get; set; }
    public Guid AgentId { get; set; }
    public DateTime WatchedAt { get; set; }
    
    // Navigation properties
    public Repository Repository { get; set; } = null!;
    public Agent Agent { get; set; } = null!;
}
