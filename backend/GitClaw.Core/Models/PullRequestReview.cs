namespace GitClaw.Core.Models;

/// <summary>
/// Represents a review on a pull request
/// </summary>
public class PullRequestReview
{
    public Guid Id { get; set; }
    public Guid PullRequestId { get; set; }
    public Guid ReviewerId { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; }
    public string? Body { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public PullRequest PullRequest { get; set; } = null!;
    public Agent Reviewer { get; set; } = null!;
}

public enum ReviewStatus
{
    Pending,
    Approved,
    ChangesRequested,
    Commented
}
