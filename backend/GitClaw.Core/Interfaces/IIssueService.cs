using GitClaw.Core.Models;

namespace GitClaw.Core.Interfaces;

public interface IIssueService
{
    /// <summary>
    /// Create a new issue
    /// </summary>
    Task<Issue> CreateIssueAsync(
        string owner,
        string repositoryName,
        string title,
        string? body,
        Guid authorId,
        string authorName);
    
    /// <summary>
    /// Get issue by repository and number
    /// </summary>
    Task<Issue?> GetIssueAsync(string owner, string repositoryName, int number);
    
    /// <summary>
    /// Get issue by ID
    /// </summary>
    Task<Issue?> GetIssueByIdAsync(Guid id);
    
    /// <summary>
    /// List issues for a repository
    /// </summary>
    Task<List<Issue>> ListIssuesAsync(
        string owner,
        string repositoryName,
        IssueStatus? status = null,
        int skip = 0,
        int take = 30);
    
    /// <summary>
    /// Update an issue
    /// </summary>
    Task<Issue> UpdateIssueAsync(Guid issueId, string? title, string? body);
    
    /// <summary>
    /// Close an issue
    /// </summary>
    Task<Issue> CloseIssueAsync(Guid issueId, Guid closedById);
    
    /// <summary>
    /// Reopen an issue
    /// </summary>
    Task<Issue> ReopenIssueAsync(Guid issueId);
    
    /// <summary>
    /// Add a comment to an issue
    /// </summary>
    Task<IssueComment> AddCommentAsync(Guid issueId, string body, Guid authorId, string authorName);
    
    /// <summary>
    /// Get comments for an issue
    /// </summary>
    Task<List<IssueComment>> GetCommentsAsync(Guid issueId, int skip = 0, int take = 30);
    
    /// <summary>
    /// Update a comment
    /// </summary>
    Task<IssueComment> UpdateCommentAsync(Guid commentId, string body);
    
    /// <summary>
    /// Delete a comment
    /// </summary>
    Task DeleteCommentAsync(Guid commentId);
}
