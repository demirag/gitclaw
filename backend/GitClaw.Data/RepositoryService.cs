using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data;

public class RepositoryService : IRepositoryService
{
    private readonly GitClawDbContext _dbContext;
    
    public RepositoryService(GitClawDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    /// <summary>
    /// Create a new repository
    /// </summary>
    public async Task<Repository> CreateRepositoryAsync(string owner, string name, string? description = null, Guid? agentId = null)
    {
        // Check if already exists
        if (await ExistsAsync(owner, name))
        {
            throw new InvalidOperationException($"Repository '{owner}/{name}' already exists");
        }
        
        var repository = new Repository
        {
            Id = Guid.NewGuid(),
            Owner = owner,
            Name = name,
            Description = description ?? string.Empty,
            StoragePath = $"/tmp/gitclaw-repos/{owner}/{name}.git",
            IsPrivate = false,
            IsArchived = false,
            DefaultBranch = "main",
            AgentId = agentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _dbContext.Repositories.Add(repository);
        await _dbContext.SaveChangesAsync();
        
        return repository;
    }
    
    /// <summary>
    /// Get repository by owner and name
    /// </summary>
    public async Task<Repository?> GetRepositoryAsync(string owner, string name)
    {
        return await _dbContext.Repositories
            .FirstOrDefaultAsync(r => r.Owner.ToLowerInvariant() == owner.ToLowerInvariant() && r.Name.ToLowerInvariant() == name.ToLowerInvariant());
    }
    
    /// <summary>
    /// Get repository by ID
    /// </summary>
    public async Task<Repository?> GetRepositoryByIdAsync(Guid id)
    {
        return await _dbContext.Repositories.FindAsync(id);
    }
    
    /// <summary>
    /// List repositories with optional filtering and pagination
    /// </summary>
    public async Task<(List<Repository> Repositories, int TotalCount)> ListRepositoriesAsync(
        string? owner = null,
        int skip = 0,
        int take = 20,
        string sortBy = "CreatedAt")
    {
        var query = _dbContext.Repositories.AsQueryable();
        
        // Filter by owner if specified
        if (!string.IsNullOrEmpty(owner))
        {
            query = query.Where(r => r.Owner.ToLowerInvariant() == owner.ToLowerInvariant());
        }
        
        // Get total count before pagination
        var totalCount = await query.CountAsync();
        
        // Sort
        query = sortBy.ToLowerInvariant() switch
        {
            "name" => query.OrderBy(r => r.Name),
            "owner" => query.OrderBy(r => r.Owner),
            "updated" => query.OrderByDescending(r => r.UpdatedAt),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };
        
        // Paginate
        var repositories = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();
        
        return (repositories, totalCount);
    }
    
    /// <summary>
    /// Update repository metadata
    /// </summary>
    public async Task<Repository?> UpdateRepositoryAsync(string owner, string name, string? description = null, bool? isPrivate = null)
    {
        var repository = await GetRepositoryAsync(owner, name);
        if (repository == null)
        {
            return null;
        }
        
        if (description != null)
        {
            repository.Description = description;
        }
        
        if (isPrivate.HasValue)
        {
            repository.IsPrivate = isPrivate.Value;
        }
        
        repository.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return repository;
    }
    
    /// <summary>
    /// Delete repository
    /// </summary>
    public async Task<bool> DeleteRepositoryAsync(string owner, string name)
    {
        var repository = await GetRepositoryAsync(owner, name);
        if (repository == null)
        {
            return false;
        }
        
        _dbContext.Repositories.Remove(repository);
        await _dbContext.SaveChangesAsync();
        
        return true;
    }
    
    /// <summary>
    /// Check if repository exists
    /// </summary>
    public async Task<bool> ExistsAsync(string owner, string name)
    {
        return await _dbContext.Repositories
            .AnyAsync(r => r.Owner.ToLowerInvariant() == owner.ToLowerInvariant() && r.Name.ToLowerInvariant() == name.ToLowerInvariant());
    }
    
    /// <summary>
    /// Update repository statistics
    /// </summary>
    public async Task UpdateStatsAsync(string owner, string name, long? size = null, int? commitCount = null, int? branchCount = null)
    {
        var repository = await GetRepositoryAsync(owner, name);
        if (repository == null)
        {
            return;
        }
        
        if (size.HasValue)
        {
            repository.Size = size.Value;
        }
        
        if (commitCount.HasValue)
        {
            repository.CommitCount = commitCount.Value;
        }
        
        if (branchCount.HasValue)
        {
            repository.BranchCount = branchCount.Value;
        }
        
        repository.UpdatedAt = DateTime.UtcNow;
        repository.LastCommitAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
    }
}
