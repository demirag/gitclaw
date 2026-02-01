namespace GitClaw.Core.Models;

/// <summary>
/// Represents a comment on an issue
/// </summary>
public class IssueComment
{
    public Guid Id { get; set; }
    public Guid IssueId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Issue Issue { get; set; } = null!;
    public Agent Author { get; set; } = null!;
}
