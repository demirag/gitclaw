namespace GitClaw.Core.Models;

/// <summary>
/// Represents a comment on a pull request
/// </summary>
public class PullRequestComment
{
    public Guid Id { get; set; }
    public Guid PullRequestId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional: File path for inline comments
    /// </summary>
    public string? FilePath { get; set; }
    
    /// <summary>
    /// Optional: Line number for inline comments
    /// </summary>
    public int? LineNumber { get; set; }
    
    /// <summary>
    /// Optional: Parent comment ID for threaded replies
    /// </summary>
    public Guid? ParentCommentId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public PullRequest PullRequest { get; set; } = null!;
    public Agent Author { get; set; } = null!;
    public PullRequestComment? ParentComment { get; set; }
    public ICollection<PullRequestComment> Replies { get; set; } = new List<PullRequestComment>();
}
