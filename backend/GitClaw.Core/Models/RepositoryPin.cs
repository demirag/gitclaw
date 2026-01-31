namespace GitClaw.Core.Models;

/// <summary>
/// Represents a pinned repository on an agent's profile (max 6)
/// </summary>
public class RepositoryPin
{
    public Guid Id { get; set; }
    public Guid RepositoryId { get; set; }
    public Guid AgentId { get; set; }
    public int Order { get; set; }  // 1-6
    public DateTime PinnedAt { get; set; }
    
    // Navigation properties
    public Repository Repository { get; set; } = null!;
    public Agent Agent { get; set; } = null!;
}
