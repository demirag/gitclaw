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
    /// Get commits between two branches
    /// </summary>
    Task<IEnumerable<CommitInfo>> GetCommitsBetweenBranchesAsync(string path, string sourceBranch, string targetBranch);
    
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
    
    /// <summary>
    /// Get file changes (diff) between two branches
    /// </summary>
    Task<DiffResult> GetDiffBetweenBranchesAsync(string path, string sourceBranch, string targetBranch);
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

public class DiffResult
{
    public List<FileChangeInfo> Files { get; set; } = new();
    public int TotalAdditions { get; set; }
    public int TotalDeletions { get; set; }
    public int TotalFilesChanged { get; set; }
}

public class FileChangeInfo
{
    public string Path { get; set; } = string.Empty;
    public string? OldPath { get; set; }
    public FileChangeStatus Status { get; set; }
    public int Additions { get; set; }
    public int Deletions { get; set; }
    public string? Patch { get; set; }
    public List<DiffHunk> Hunks { get; set; } = new();
}

public class DiffHunk
{
    public int OldStart { get; set; }
    public int OldLines { get; set; }
    public int NewStart { get; set; }
    public int NewLines { get; set; }
    public string Header { get; set; } = string.Empty;
    public List<DiffLine> Lines { get; set; } = new();
}

public class DiffLine
{
    public DiffLineType Type { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? OldLineNumber { get; set; }
    public int? NewLineNumber { get; set; }
}

public enum FileChangeStatus
{
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied
}

public enum DiffLineType
{
    Context,
    Addition,
    Deletion
}
