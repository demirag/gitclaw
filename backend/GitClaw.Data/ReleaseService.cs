using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data;

public class ReleaseService : IReleaseService
{
    private readonly GitClawDbContext _dbContext;
    private readonly IGitService _gitService;
    
    public ReleaseService(GitClawDbContext dbContext, IGitService gitService)
    {
        _dbContext = dbContext;
        _gitService = gitService;
    }
    
    /// <summary>
    /// Create a new release
    /// </summary>
    public async Task<Release> CreateReleaseAsync(
        string owner,
        string repositoryName,
        string tagName,
        string? name,
        string? body,
        Guid createdById,
        string createdByName,
        bool isDraft = false,
        bool isPrerelease = false,
        string? targetCommitish = null)
    {
        // Get repository
        var repository = await _dbContext.Repositories
            .FirstOrDefaultAsync(r => r.Owner == owner && r.Name == repositoryName);
        
        if (repository == null)
        {
            throw new InvalidOperationException($"Repository {owner}/{repositoryName} not found");
        }
        
        // Check if release with this tag already exists
        var existingRelease = await _dbContext.Releases
            .FirstOrDefaultAsync(r => r.RepositoryId == repository.Id && r.TagName == tagName);
        
        if (existingRelease != null)
        {
            throw new InvalidOperationException($"Release with tag {tagName} already exists");
        }
        
        // Note: Tag validation is intentionally skipped here.
        // Releases can be created for tags that will be created later via git push.
        // The frontend can optionally validate tags exist before creating releases.
        
        var release = new Release
        {
            Id = Guid.NewGuid(),
            RepositoryId = repository.Id,
            TagName = tagName,
            Name = name,
            Body = body,
            CreatedById = createdById,
            CreatedByName = createdByName,
            IsDraft = isDraft,
            IsPrerelease = isPrerelease,
            TargetCommitish = targetCommitish,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = isDraft ? null : DateTime.UtcNow
        };
        
        _dbContext.Releases.Add(release);
        await _dbContext.SaveChangesAsync();
        
        return release;
    }
    
    /// <summary>
    /// Get release by tag name
    /// </summary>
    public async Task<Release?> GetReleaseByTagAsync(string owner, string repositoryName, string tagName)
    {
        return await _dbContext.Releases
            .Include(r => r.Repository)
            .Include(r => r.CreatedBy)
            .FirstOrDefaultAsync(r => 
                r.Repository!.Owner == owner && 
                r.Repository.Name == repositoryName && 
                r.TagName == tagName);
    }
    
    /// <summary>
    /// Get release by ID
    /// </summary>
    public async Task<Release?> GetReleaseByIdAsync(Guid id)
    {
        return await _dbContext.Releases
            .Include(r => r.Repository)
            .Include(r => r.CreatedBy)
            .FirstOrDefaultAsync(r => r.Id == id);
    }
    
    /// <summary>
    /// Get latest published release
    /// </summary>
    public async Task<Release?> GetLatestReleaseAsync(string owner, string repositoryName)
    {
        return await _dbContext.Releases
            .Include(r => r.Repository)
            .Include(r => r.CreatedBy)
            .Where(r => 
                r.Repository!.Owner == owner && 
                r.Repository.Name == repositoryName &&
                !r.IsDraft &&
                r.PublishedAt != null)
            .OrderByDescending(r => r.PublishedAt)
            .FirstOrDefaultAsync();
    }
    
    /// <summary>
    /// List releases for a repository
    /// </summary>
    public async Task<List<Release>> ListReleasesAsync(
        string owner,
        string repositoryName,
        bool includeDrafts = false,
        int skip = 0,
        int take = 30)
    {
        var query = _dbContext.Releases
            .Include(r => r.Repository)
            .Include(r => r.CreatedBy)
            .Where(r => r.Repository!.Owner == owner && r.Repository.Name == repositoryName);
        
        if (!includeDrafts)
        {
            query = query.Where(r => !r.IsDraft);
        }
        
        return await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
    
    /// <summary>
    /// Update a release
    /// </summary>
    public async Task<Release> UpdateReleaseAsync(
        Guid releaseId,
        string? name,
        string? body,
        bool? isDraft,
        bool? isPrerelease)
    {
        var release = await _dbContext.Releases.FindAsync(releaseId);
        if (release == null)
        {
            throw new InvalidOperationException($"Release {releaseId} not found");
        }
        
        if (name != null)
        {
            release.Name = name;
        }
        
        if (body != null)
        {
            release.Body = body;
        }
        
        if (isDraft.HasValue)
        {
            release.IsDraft = isDraft.Value;
        }
        
        if (isPrerelease.HasValue)
        {
            release.IsPrerelease = isPrerelease.Value;
        }
        
        await _dbContext.SaveChangesAsync();
        
        return release;
    }
    
    /// <summary>
    /// Delete a release
    /// </summary>
    public async Task DeleteReleaseAsync(Guid releaseId)
    {
        var release = await _dbContext.Releases.FindAsync(releaseId);
        if (release == null)
        {
            throw new InvalidOperationException($"Release {releaseId} not found");
        }
        
        _dbContext.Releases.Remove(release);
        await _dbContext.SaveChangesAsync();
    }
    
    /// <summary>
    /// Publish a draft release
    /// </summary>
    public async Task<Release> PublishReleaseAsync(Guid releaseId)
    {
        var release = await _dbContext.Releases.FindAsync(releaseId);
        if (release == null)
        {
            throw new InvalidOperationException($"Release {releaseId} not found");
        }
        
        if (!release.IsDraft)
        {
            throw new InvalidOperationException("Release is not a draft");
        }
        
        release.IsDraft = false;
        release.PublishedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return release;
    }
}
