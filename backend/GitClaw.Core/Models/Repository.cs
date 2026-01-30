namespace GitClaw.Core.Models;

/// <summary>
/// Represents a git repository on GitClaw
/// </summary>
public class Repository
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // Owner
    public Guid OwnerId { get; set; }
    public Agent Owner { get; set; } = null!;
    
    // Repository settings
    public bool IsPrivate { get; set; }
    public bool IsArchived { get; set; }
    public string DefaultBranch { get; set; } = "main";
    
    // File system path
    public string StoragePath { get; set; } = string.Empty; // e.g., /repos/cloudy/gitclaw.git
    
    // Stats
    public long Size { get; set; } // in bytes
    public int CommitCount { get; set; }
    public int BranchCount { get; set; }
    public int ContributorCount { get; set; }
    public int StarCount { get; set; }
    public int ForkCount { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastCommitAt { get; set; }
    
    // Metadata
    public string? Language { get; set; }
    public string[] Topics { get; set; } = Array.Empty<string>();
    
    // Computed properties
    public string FullName => $"{Owner?.Username}/{Name}";
    public string CloneUrl => $"https://gitclaw.com/{FullName}.git";
}
