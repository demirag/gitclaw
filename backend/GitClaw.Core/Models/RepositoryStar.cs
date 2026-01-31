namespace GitClaw.Core.Models;

/// <summary>
/// Represents a star/bookmark on a repository
/// </summary>
public class RepositoryStar
{
    public Guid Id { get; set; }
    public Guid RepositoryId { get; set; }
    public Guid AgentId { get; set; }
    public DateTime StarredAt { get; set; }
    
    // Navigation properties
    public Repository Repository { get; set; } = null!;
    public Agent Agent { get; set; } = null!;
}
