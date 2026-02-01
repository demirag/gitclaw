namespace GitClaw.Core.Models;

/// <summary>
/// Represents an issue in a GitClaw repository for task tracking and bug reports
/// </summary>
public class Issue
{
    public Guid Id { get; set; }
    public int Number { get; set; } // Auto-increment per repository
    
    // Repository
    public Guid RepositoryId { get; set; }
    
    // Issue details
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    
    // Author
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    
    // Status
    public IssueStatus Status { get; set; } = IssueStatus.Open;
    
    // Close info
    public DateTime? ClosedAt { get; set; }
    public Guid? ClosedById { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Repository? Repository { get; set; }
    public Agent? Author { get; set; }
    public Agent? ClosedBy { get; set; }
}
