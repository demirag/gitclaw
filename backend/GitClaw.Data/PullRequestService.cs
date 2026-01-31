using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data;

public class PullRequestService : IPullRequestService
{
    private readonly GitClawDbContext _dbContext;
    private readonly IGitService _gitService;
    private const string RepositoryBasePath = "/tmp/gitclaw-repos";
    
    public PullRequestService(GitClawDbContext dbContext, IGitService gitService)
    {
        _dbContext = dbContext;
        _gitService = gitService;
    }
    
    /// <summary>
    /// Create a new pull request
    /// </summary>
    public async Task<PullRequest> CreatePullRequestAsync(
        Guid repositoryId,
        string owner,
        string repositoryName,
        string sourceBranch,
        string targetBranch,
        string title,
        string description,
        Guid authorId,
        string authorName)
    {
        // Get next PR number for this repository
        var lastNumber = await _dbContext.PullRequests
            .Where(pr => pr.RepositoryId == repositoryId)
            .OrderByDescending(pr => pr.Number)
            .Select(pr => pr.Number)
            .FirstOrDefaultAsync();
        
        var pullRequest = new PullRequest
        {
            Id = Guid.NewGuid(),
            Number = lastNumber + 1,
            RepositoryId = repositoryId,
            Owner = owner,
            RepositoryName = repositoryName,
            SourceBranch = sourceBranch,
            TargetBranch = targetBranch,
            Title = title,
            Description = description,
            AuthorId = authorId,
            AuthorName = authorName,
            Status = PullRequestStatus.Open,
            IsMergeable = true,
            HasConflicts = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _dbContext.PullRequests.Add(pullRequest);
        await _dbContext.SaveChangesAsync();
        
        return pullRequest;
    }
    
    /// <summary>
    /// Get pull request by repository and number
    /// </summary>
    public async Task<PullRequest?> GetPullRequestAsync(string owner, string repositoryName, int number)
    {
        return await _dbContext.PullRequests
            .Include(pr => pr.Repository)
            .FirstOrDefaultAsync(pr => 
                pr.Owner == owner && 
                pr.RepositoryName == repositoryName && 
                pr.Number == number);
    }
    
    /// <summary>
    /// Get pull request by ID
    /// </summary>
    public async Task<PullRequest?> GetPullRequestByIdAsync(Guid id)
    {
        return await _dbContext.PullRequests
            .Include(pr => pr.Repository)
            .FirstOrDefaultAsync(pr => pr.Id == id);
    }
    
    /// <summary>
    /// List pull requests for a repository
    /// </summary>
    public async Task<List<PullRequest>> ListPullRequestsAsync(
        string owner,
        string repositoryName,
        PullRequestStatus? status = null,
        int skip = 0,
        int take = 30)
    {
        var query = _dbContext.PullRequests
            .Where(pr => pr.Owner == owner && pr.RepositoryName == repositoryName);
        
        if (status.HasValue)
        {
            query = query.Where(pr => pr.Status == status.Value);
        }
        
        return await query
            .OrderByDescending(pr => pr.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
    
    /// <summary>
    /// Merge a pull request
    /// </summary>
    public async Task<(bool Success, string? Error)> MergePullRequestAsync(
        string owner,
        string repositoryName,
        int number,
        Guid mergedBy,
        string mergedByName)
    {
        var pullRequest = await GetPullRequestAsync(owner, repositoryName, number);
        if (pullRequest == null)
        {
            return (false, "Pull request not found");
        }
        
        if (pullRequest.Status != PullRequestStatus.Open)
        {
            return (false, "Pull request is not open");
        }
        
        // Perform git merge using worktree (bare repos require worktree for merge)
        var bareRepoPath = Path.Combine(RepositoryBasePath, owner, $"{repositoryName}.git");
        var worktreePath = Path.Combine(Path.GetTempPath(), $"gitclaw-merge-{Guid.NewGuid()}");
        
        try
        {
            // Step 1: Create a temporary worktree for the target branch
            var addWorktreeResult = await RunGitCommandAsync(bareRepoPath, 
                $"worktree add \"{worktreePath}\" {pullRequest.TargetBranch}");
            
            if (!addWorktreeResult.Success)
            {
                return (false, $"Failed to create worktree: {addWorktreeResult.Error}");
            }
            
            try
            {
                // Step 2: Merge the source branch in the worktree
                var mergeResult = await RunGitCommandAsync(worktreePath, 
                    $"merge --no-ff -m \"Merge pull request #{number}: {pullRequest.Title}\" origin/{pullRequest.SourceBranch}");
                
                if (!mergeResult.Success)
                {
                    // Check if it's a merge conflict
                    if (mergeResult.Error?.Contains("CONFLICT") == true || 
                        mergeResult.Output?.Contains("CONFLICT") == true)
                    {
                        // Abort the merge
                        await RunGitCommandAsync(worktreePath, "merge --abort");
                        
                        pullRequest.HasConflicts = true;
                        pullRequest.IsMergeable = false;
                        await _dbContext.SaveChangesAsync();
                        return (false, "Merge conflicts detected. Please resolve conflicts manually.");
                    }
                    
                    return (false, $"Merge failed: {mergeResult.Error}");
                }
                
                // Step 3: Push the merged changes back to the bare repo
                // The worktree's origin is already the bare repo, so we need to update the branch ref
                var updateRefResult = await RunGitCommandAsync(worktreePath, 
                    $"push . HEAD:{pullRequest.TargetBranch}");
                
                // For worktrees, we update directly via the ref
                if (!updateRefResult.Success)
                {
                    // Alternative: get the commit SHA and update ref directly
                    var revParseResult = await RunGitCommandAsync(worktreePath, "rev-parse HEAD");
                    if (revParseResult.Success && !string.IsNullOrEmpty(revParseResult.Output))
                    {
                        var commitSha = revParseResult.Output.Trim();
                        await RunGitCommandAsync(bareRepoPath, 
                            $"update-ref refs/heads/{pullRequest.TargetBranch} {commitSha}");
                    }
                }
                
                // Update pull request
                pullRequest.Status = PullRequestStatus.Merged;
                pullRequest.MergedAt = DateTime.UtcNow;
                pullRequest.MergedBy = mergedBy;
                pullRequest.MergedByName = mergedByName;
                pullRequest.UpdatedAt = DateTime.UtcNow;
                
                await _dbContext.SaveChangesAsync();
                
                return (true, null);
            }
            finally
            {
                // Step 4: Clean up worktree
                await RunGitCommandAsync(bareRepoPath, $"worktree remove \"{worktreePath}\" --force");
                
                // Also try to delete the directory if it still exists
                if (Directory.Exists(worktreePath))
                {
                    try { Directory.Delete(worktreePath, true); } catch { }
                }
            }
        }
        catch (Exception ex)
        {
            // Clean up on error
            if (Directory.Exists(worktreePath))
            {
                try 
                { 
                    await RunGitCommandAsync(bareRepoPath, $"worktree remove \"{worktreePath}\" --force");
                    Directory.Delete(worktreePath, true); 
                } 
                catch { }
            }
            return (false, $"Merge error: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Helper method to run git commands
    /// </summary>
    private static async Task<(bool Success, string? Output, string? Error)> RunGitCommandAsync(
        string workingDirectory, 
        string arguments)
    {
        try
        {
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = arguments,
                    WorkingDirectory = workingDirectory,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            
            process.Start();
            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            
            return (process.ExitCode == 0, output, error);
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }
    
    /// <summary>
    /// Close a pull request
    /// </summary>
    public async Task<bool> ClosePullRequestAsync(string owner, string repositoryName, int number)
    {
        var pullRequest = await GetPullRequestAsync(owner, repositoryName, number);
        if (pullRequest == null)
        {
            return false;
        }
        
        if (pullRequest.Status != PullRequestStatus.Open)
        {
            return false; // Already closed or merged
        }
        
        pullRequest.Status = PullRequestStatus.Closed;
        pullRequest.ClosedAt = DateTime.UtcNow;
        pullRequest.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return true;
    }
    
    /// <summary>
    /// Check if pull request is mergeable
    /// </summary>
    public async Task<bool> CheckMergeableAsync(string owner, string repositoryName, int number)
    {
        var pullRequest = await GetPullRequestAsync(owner, repositoryName, number);
        if (pullRequest == null)
        {
            return false;
        }
        
        if (pullRequest.Status != PullRequestStatus.Open)
        {
            return false;
        }
        
        // For MVP, we'll assume it's mergeable if it's open
        // In production, this would check for conflicts
        return pullRequest.IsMergeable && !pullRequest.HasConflicts;
    }
}
