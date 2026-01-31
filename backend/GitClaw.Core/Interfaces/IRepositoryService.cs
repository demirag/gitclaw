using GitClaw.Core.Models;

namespace GitClaw.Core.Interfaces;

public interface IRepositoryService
{
    /// <summary>
    /// Create a new repository
    /// </summary>
    Task<Repository> CreateRepositoryAsync(string owner, string name, string? description = null, Guid? agentId = null);
    
    /// <summary>
    /// Get repository by owner and name
    /// </summary>
    Task<Repository?> GetRepositoryAsync(string owner, string name);
    
    /// <summary>
    /// Get repository by ID
    /// </summary>
    Task<Repository?> GetRepositoryByIdAsync(Guid id);
    
    /// <summary>
    /// List repositories with optional filtering
    /// </summary>
    Task<(List<Repository> Repositories, int TotalCount)> ListRepositoriesAsync(
        string? owner = null, 
        int skip = 0, 
        int take = 20,
        string sortBy = "CreatedAt");
    
    /// <summary>
    /// Update repository metadata
    /// </summary>
    Task<Repository?> UpdateRepositoryAsync(string owner, string name, string? description = null, bool? isPrivate = null);
    
    /// <summary>
    /// Delete repository
    /// </summary>
    Task<bool> DeleteRepositoryAsync(string owner, string name);
    
    /// <summary>
    /// Check if repository exists
    /// </summary>
    Task<bool> ExistsAsync(string owner, string name);
    
    /// <summary>
    /// Update repository statistics
    /// </summary>
    Task UpdateStatsAsync(string owner, string name, long? size = null, int? commitCount = null, int? branchCount = null);
}
