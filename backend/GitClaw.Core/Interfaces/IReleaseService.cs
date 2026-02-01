using GitClaw.Core.Models;

namespace GitClaw.Core.Interfaces;

public interface IReleaseService
{
    /// <summary>
    /// Create a new release
    /// </summary>
    Task<Release> CreateReleaseAsync(
        string owner,
        string repositoryName,
        string tagName,
        string? name,
        string? body,
        Guid createdById,
        string createdByName,
        bool isDraft = false,
        bool isPrerelease = false,
        string? targetCommitish = null);
    
    /// <summary>
    /// Get release by tag name
    /// </summary>
    Task<Release?> GetReleaseByTagAsync(string owner, string repositoryName, string tagName);
    
    /// <summary>
    /// Get release by ID
    /// </summary>
    Task<Release?> GetReleaseByIdAsync(Guid id);
    
    /// <summary>
    /// Get latest published release
    /// </summary>
    Task<Release?> GetLatestReleaseAsync(string owner, string repositoryName);
    
    /// <summary>
    /// List releases for a repository
    /// </summary>
    Task<List<Release>> ListReleasesAsync(
        string owner,
        string repositoryName,
        bool includeDrafts = false,
        int skip = 0,
        int take = 30);
    
    /// <summary>
    /// Update a release
    /// </summary>
    Task<Release> UpdateReleaseAsync(
        Guid releaseId,
        string? name,
        string? body,
        bool? isDraft,
        bool? isPrerelease);
    
    /// <summary>
    /// Delete a release
    /// </summary>
    Task DeleteReleaseAsync(Guid releaseId);
    
    /// <summary>
    /// Publish a draft release
    /// </summary>
    Task<Release> PublishReleaseAsync(Guid releaseId);
}
