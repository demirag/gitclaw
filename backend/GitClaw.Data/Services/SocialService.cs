using GitClaw.Core.Models;
using GitClaw.Core.Services;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data.Services;

public class SocialService : ISocialService
{
    private readonly GitClawDbContext _context;
    
    public SocialService(GitClawDbContext context)
    {
        _context = context;
    }
    
    // ============ STAR OPERATIONS ============
    
    public async Task<(bool IsStarred, int StarCount)> ToggleStarAsync(Guid repositoryId, Guid agentId)
    {
        var existingStar = await _context.RepositoryStars
            .FirstOrDefaultAsync(s => s.RepositoryId == repositoryId && s.AgentId == agentId);
        
        var repository = await _context.Repositories.FindAsync(repositoryId);
        if (repository == null)
            throw new InvalidOperationException("Repository not found");
        
        if (existingStar != null)
        {
            // Unstar
            _context.RepositoryStars.Remove(existingStar);
            repository.StarCount = Math.Max(0, repository.StarCount - 1);
            await _context.SaveChangesAsync();
            return (false, repository.StarCount);
        }
        else
        {
            // Star
            var star = new RepositoryStar
            {
                Id = Guid.NewGuid(),
                RepositoryId = repositoryId,
                AgentId = agentId,
                StarredAt = DateTime.UtcNow
            };
            _context.RepositoryStars.Add(star);
            repository.StarCount++;
            await _context.SaveChangesAsync();
            return (true, repository.StarCount);
        }
    }
    
    public async Task<bool> IsStarredAsync(Guid repositoryId, Guid agentId)
    {
        return await _context.RepositoryStars
            .AnyAsync(s => s.RepositoryId == repositoryId && s.AgentId == agentId);
    }
    
    public async Task<IEnumerable<Repository>> GetStarredRepositoriesAsync(Guid agentId)
    {
        return await _context.RepositoryStars
            .Where(s => s.AgentId == agentId)
            .Include(s => s.Repository)
            .OrderByDescending(s => s.StarredAt)
            .Select(s => s.Repository)
            .ToListAsync();
    }
    
    public async Task<IEnumerable<Agent>> GetStargazersAsync(Guid repositoryId)
    {
        return await _context.RepositoryStars
            .Where(s => s.RepositoryId == repositoryId)
            .Include(s => s.Agent)
            .OrderByDescending(s => s.StarredAt)
            .Select(s => s.Agent)
            .ToListAsync();
    }
    
    // ============ WATCH OPERATIONS ============
    
    public async Task<(bool IsWatched, int WatcherCount)> ToggleWatchAsync(Guid repositoryId, Guid agentId)
    {
        var existingWatch = await _context.RepositoryWatches
            .FirstOrDefaultAsync(w => w.RepositoryId == repositoryId && w.AgentId == agentId);
        
        var repository = await _context.Repositories.FindAsync(repositoryId);
        if (repository == null)
            throw new InvalidOperationException("Repository not found");
        
        if (existingWatch != null)
        {
            // Unwatch
            _context.RepositoryWatches.Remove(existingWatch);
            repository.WatcherCount = Math.Max(0, repository.WatcherCount - 1);
            await _context.SaveChangesAsync();
            return (false, repository.WatcherCount);
        }
        else
        {
            // Watch
            var watch = new RepositoryWatch
            {
                Id = Guid.NewGuid(),
                RepositoryId = repositoryId,
                AgentId = agentId,
                WatchedAt = DateTime.UtcNow
            };
            _context.RepositoryWatches.Add(watch);
            repository.WatcherCount++;
            await _context.SaveChangesAsync();
            return (true, repository.WatcherCount);
        }
    }
    
    public async Task<bool> IsWatchedAsync(Guid repositoryId, Guid agentId)
    {
        return await _context.RepositoryWatches
            .AnyAsync(w => w.RepositoryId == repositoryId && w.AgentId == agentId);
    }
    
    public async Task<IEnumerable<Repository>> GetWatchedRepositoriesAsync(Guid agentId)
    {
        return await _context.RepositoryWatches
            .Where(w => w.AgentId == agentId)
            .Include(w => w.Repository)
            .OrderByDescending(w => w.WatchedAt)
            .Select(w => w.Repository)
            .ToListAsync();
    }
    
    public async Task<IEnumerable<Agent>> GetWatchersAsync(Guid repositoryId)
    {
        return await _context.RepositoryWatches
            .Where(w => w.RepositoryId == repositoryId)
            .Include(w => w.Agent)
            .OrderByDescending(w => w.WatchedAt)
            .Select(w => w.Agent)
            .ToListAsync();
    }
    
    // ============ PIN OPERATIONS ============
    
    public async Task<RepositoryPin> PinRepositoryAsync(Guid repositoryId, Guid agentId, int order)
    {
        // Validate order
        if (order < 1 || order > 6)
            throw new ArgumentException("Pin order must be between 1 and 6");
        
        // Check if already pinned
        var existingPin = await _context.RepositoryPins
            .FirstOrDefaultAsync(p => p.RepositoryId == repositoryId && p.AgentId == agentId);
        
        if (existingPin != null)
        {
            // Update order
            existingPin.Order = order;
            await _context.SaveChangesAsync();
            return existingPin;
        }
        
        // Check pin limit (max 6)
        var pinCount = await _context.RepositoryPins
            .CountAsync(p => p.AgentId == agentId);
        
        if (pinCount >= 6)
            throw new InvalidOperationException("Maximum 6 repositories can be pinned");
        
        // Check if repository exists
        var repository = await _context.Repositories.FindAsync(repositoryId);
        if (repository == null)
            throw new InvalidOperationException("Repository not found");
        
        // Create new pin
        var pin = new RepositoryPin
        {
            Id = Guid.NewGuid(),
            RepositoryId = repositoryId,
            AgentId = agentId,
            Order = order,
            PinnedAt = DateTime.UtcNow
        };
        
        _context.RepositoryPins.Add(pin);
        await _context.SaveChangesAsync();
        return pin;
    }
    
    public async Task UnpinRepositoryAsync(Guid repositoryId, Guid agentId)
    {
        var pin = await _context.RepositoryPins
            .FirstOrDefaultAsync(p => p.RepositoryId == repositoryId && p.AgentId == agentId);
        
        if (pin != null)
        {
            _context.RepositoryPins.Remove(pin);
            await _context.SaveChangesAsync();
        }
    }
    
    public async Task<IEnumerable<RepositoryPin>> GetPinnedRepositoriesAsync(Guid agentId)
    {
        return await _context.RepositoryPins
            .Where(p => p.AgentId == agentId)
            .Include(p => p.Repository)
            .OrderBy(p => p.Order)
            .ToListAsync();
    }
    
    public async Task ReorderPinsAsync(Guid agentId, Dictionary<Guid, int> repositoryOrders)
    {
        var pins = await _context.RepositoryPins
            .Where(p => p.AgentId == agentId)
            .ToListAsync();
        
        foreach (var pin in pins)
        {
            if (repositoryOrders.TryGetValue(pin.RepositoryId, out int newOrder))
            {
                if (newOrder < 1 || newOrder > 6)
                    throw new ArgumentException($"Invalid order {newOrder} for repository {pin.RepositoryId}");
                
                pin.Order = newOrder;
            }
        }
        
        await _context.SaveChangesAsync();
    }
    
    public async Task<bool> IsPinnedAsync(Guid repositoryId, Guid agentId)
    {
        return await _context.RepositoryPins
            .AnyAsync(p => p.RepositoryId == repositoryId && p.AgentId == agentId);
    }
}
