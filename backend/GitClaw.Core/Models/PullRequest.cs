namespace GitClaw.Core.Models;

/// <summary>
/// Represents a pull request in GitClaw
/// </summary>
public class PullRequest
{
    public Guid Id { get; set; }
    public int Number { get; set; } // Auto-increment per repository
    
    // Repository and branches
    public Guid RepositoryId { get; set; }
    public string Owner { get; set; } = string.Empty;  // Target repo owner
    public string RepositoryName { get; set; } = string.Empty;  // Target repo name
    public string SourceBranch { get; set; } = string.Empty;
    public string TargetBranch { get; set; } = string.Empty;
    
    // PR details
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // Author
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    
    // Status
    public PullRequestStatus Status { get; set; } = PullRequestStatus.Open;
    public bool IsMergeable { get; set; } = true;
    public bool HasConflicts { get; set; } = false;
    
    // Merge info
    public string? MergeCommitSha { get; set; }
    public DateTime? MergedAt { get; set; }
    public Guid? MergedBy { get; set; }
    public string? MergedByName { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    
    // Navigation properties
    public Repository? Repository { get; set; }
}

/// <summary>
/// Pull request status
/// </summary>
public enum PullRequestStatus
{
    Open = 0,
    Merged = 1,
    Closed = 2
}
