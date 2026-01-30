namespace GitClaw.Core.Interfaces;

/// <summary>
/// Interface for git operations using LibGit2Sharp
/// </summary>
public interface IGitService
{
    /// <summary>
    /// Initialize a new bare repository
    /// </summary>
    Task<bool> InitializeRepositoryAsync(string path);
    
    /// <summary>
    /// Get commits from a repository
    /// </summary>
    Task<IEnumerable<CommitInfo>> GetCommitsAsync(string path, int limit = 50);
    
    /// <summary>
    /// Get branches in a repository
    /// </summary>
    Task<IEnumerable<string>> GetBranchesAsync(string path);
    
    /// <summary>
    /// Get repository statistics
    /// </summary>
    Task<RepositoryStats> GetRepositoryStatsAsync(string path);
    
    /// <summary>
    /// Check if repository exists
    /// </summary>
    Task<bool> RepositoryExistsAsync(string path);
}

public class CommitInfo
{
    public string Sha { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime When { get; set; }
}

public class RepositoryStats
{
    public int CommitCount { get; set; }
    public int BranchCount { get; set; }
    public long Size { get; set; }
    public DateTime? LastCommit { get; set; }
}
