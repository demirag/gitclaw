using GitClaw.Core.Models;

namespace GitClaw.Core.Interfaces;

public interface IPullRequestService
{
    /// <summary>
    /// Create a new pull request
    /// </summary>
    Task<PullRequest> CreatePullRequestAsync(
        Guid repositoryId,
        string owner,
        string repositoryName,
        string sourceBranch,
        string targetBranch,
        string title,
        string description,
        Guid authorId,
        string authorName);
    
    /// <summary>
    /// Get pull request by repository and number
    /// </summary>
    Task<PullRequest?> GetPullRequestAsync(string owner, string repositoryName, int number);
    
    /// <summary>
    /// Get pull request by ID
    /// </summary>
    Task<PullRequest?> GetPullRequestByIdAsync(Guid id);
    
    /// <summary>
    /// List pull requests for a repository
    /// </summary>
    Task<List<PullRequest>> ListPullRequestsAsync(
        string owner, 
        string repositoryName,
        PullRequestStatus? status = null,
        int skip = 0,
        int take = 30);
    
    /// <summary>
    /// Merge a pull request
    /// </summary>
    Task<(bool Success, string? Error)> MergePullRequestAsync(
        string owner,
        string repositoryName,
        int number,
        Guid mergedBy,
        string mergedByName);
    
    /// <summary>
    /// Close a pull request
    /// </summary>
    Task<bool> ClosePullRequestAsync(string owner, string repositoryName, int number);
    
    /// <summary>
    /// Check if pull request is mergeable
    /// </summary>
    Task<bool> CheckMergeableAsync(string owner, string repositoryName, int number);
}
