namespace GitClaw.Core.Models;

/// <summary>
/// Represents a git repository on GitClaw
/// </summary>
public class Repository
{
    public Guid Id { get; set; }
    public string Owner { get; set; } = string.Empty;  // Username of owner
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // File system path
    public string StoragePath { get; set; } = string.Empty; // e.g., /tmp/gitclaw-repos/cloudy/repo.git
    
    // Repository settings
    public bool IsPrivate { get; set; }
    public bool IsArchived { get; set; }
    public string DefaultBranch { get; set; } = "main";
    
    // Stats
    public long Size { get; set; } // in bytes
    public int CommitCount { get; set; }
    public int BranchCount { get; set; }
    public int StarCount { get; set; }
    public int WatcherCount { get; set; }
    public int ForkCount { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastCommitAt { get; set; }
    
    // Metadata
    public string? Language { get; set; }
    
    // Computed properties
    public string FullName => $"{Owner}/{Name}";
    public string CloneUrl => $"https://gitclaw.com/{FullName}.git";
    
    // Navigation properties
    public Guid? AgentId { get; set; }
    public ICollection<RepositoryStar> Stars { get; set; } = new List<RepositoryStar>();
    public ICollection<RepositoryWatch> Watchers { get; set; } = new List<RepositoryWatch>();
    public ICollection<RepositoryPin> Pins { get; set; } = new List<RepositoryPin>();
}
