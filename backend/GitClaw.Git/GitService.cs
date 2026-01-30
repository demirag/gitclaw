using LibGit2Sharp;
using GitClaw.Core.Interfaces;

namespace GitClaw.Git;

/// <summary>
/// Git operations service using LibGit2Sharp
/// </summary>
public class GitService : IGitService
{
    public Task<bool> InitializeRepositoryAsync(string path)
    {
        try
        {
            // Ensure directory exists
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
            
            // Initialize bare repository
            Repository.Init(path, isBare: true);
            return Task.FromResult(true);
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
    
    public Task<IEnumerable<CommitInfo>> GetCommitsAsync(string path, int limit = 50)
    {
        try
        {
            using var repo = new Repository(path);
            
            var commits = repo.Commits
                .Take(limit)
                .Select(c => new CommitInfo
                {
                    Sha = c.Sha,
                    Message = c.MessageShort,
                    Author = c.Author.Name,
                    Email = c.Author.Email,
                    When = c.Author.When.DateTime
                });
            
            return Task.FromResult(commits.AsEnumerable());
        }
        catch (Exception)
        {
            return Task.FromResult(Enumerable.Empty<CommitInfo>());
        }
    }
    
    public Task<IEnumerable<string>> GetBranchesAsync(string path)
    {
        try
        {
            using var repo = new Repository(path);
            var branches = repo.Branches.Select(b => b.FriendlyName);
            return Task.FromResult(branches.AsEnumerable());
        }
        catch (Exception)
        {
            return Task.FromResult(Enumerable.Empty<string>());
        }
    }
    
    public Task<RepositoryStats> GetRepositoryStatsAsync(string path)
    {
        try
        {
            using var repo = new Repository(path);
            
            var stats = new RepositoryStats
            {
                CommitCount = repo.Commits.Count(),
                BranchCount = repo.Branches.Count(),
                Size = CalculateRepositorySize(path),
                LastCommit = repo.Commits.FirstOrDefault()?.Author.When.DateTime
            };
            
            return Task.FromResult(stats);
        }
        catch (Exception)
        {
            return Task.FromResult(new RepositoryStats());
        }
    }
    
    public Task<bool> RepositoryExistsAsync(string path)
    {
        try
        {
            return Task.FromResult(Repository.IsValid(path));
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
    
    private static long CalculateRepositorySize(string path)
    {
        try
        {
            var dirInfo = new DirectoryInfo(path);
            return dirInfo.EnumerateFiles("*", SearchOption.AllDirectories)
                .Sum(file => file.Length);
        }
        catch (Exception)
        {
            return 0;
        }
    }
}
