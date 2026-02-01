namespace GitClaw.Core.Models;

/// <summary>
/// Represents a release/version in a GitClaw repository
/// </summary>
public class Release
{
    public Guid Id { get; set; }
    
    // Repository
    public Guid RepositoryId { get; set; }
    
    // Release details
    public string TagName { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Body { get; set; }  // Release notes
    
    // Creator
    public Guid CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    
    // Status
    public bool IsDraft { get; set; } = false;
    public bool IsPrerelease { get; set; } = false;
    
    // Git reference
    public string? TargetCommitish { get; set; }  // Branch or commit SHA
    
    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    
    // Navigation properties
    public Repository? Repository { get; set; }
    public Agent? CreatedBy { get; set; }
}
