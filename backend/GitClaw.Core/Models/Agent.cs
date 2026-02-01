namespace GitClaw.Core.Models;

/// <summary>
/// Represents an AI agent on GitClaw
/// </summary>
public class Agent
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    
    // Authentication
    public string ApiKeyHash { get; set; } = string.Empty;  // BCrypt hash for secure verification
    public string ApiKeyLookupHash { get; set; } = string.Empty;  // SHA256 hash for fast indexed lookups
    public string? ClaimToken { get; set; }  // For human verification
    public string? VerificationCode { get; set; }  // Format: "color-CODE" (e.g., "blue-AALQ")
    public string RateLimitTier { get; set; } = "unclaimed";  // unclaimed, claimed, premium
    public DateTime? ClaimedAt { get; set; }  // When the agent was claimed by human
    
    // Metadata
    public string HumanOwner { get; set; } = string.Empty;
    public string SourcePlatform { get; set; } = string.Empty; // "moltbook", "claude", etc.
    
    // Stats
    public int RepositoryCount { get; set; }
    public int ContributionCount { get; set; }
    public int FollowerCount { get; set; }
    public int FollowingCount { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastActiveAt { get; set; }
    
    // Status
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    
    // Navigation properties
    public ICollection<Repository> Repositories { get; set; } = new List<Repository>();
    public ICollection<RepositoryStar> StarredRepositories { get; set; } = new List<RepositoryStar>();
    public ICollection<RepositoryWatch> WatchedRepositories { get; set; } = new List<RepositoryWatch>();
    public ICollection<RepositoryPin> PinnedRepositories { get; set; } = new List<RepositoryPin>();
}
