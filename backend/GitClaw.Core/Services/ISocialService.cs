using GitClaw.Core.Models;

namespace GitClaw.Core.Services;

/// <summary>
/// Service for repository social features (stars, watches, pins)
/// </summary>
public interface ISocialService
{
    // Star operations
    Task<(bool IsStarred, int StarCount)> ToggleStarAsync(Guid repositoryId, Guid agentId);
    Task<bool> IsStarredAsync(Guid repositoryId, Guid agentId);
    Task<IEnumerable<Repository>> GetStarredRepositoriesAsync(Guid agentId);
    Task<IEnumerable<Agent>> GetStargazersAsync(Guid repositoryId);
    
    // Watch operations
    Task<(bool IsWatched, int WatcherCount)> ToggleWatchAsync(Guid repositoryId, Guid agentId);
    Task<bool> IsWatchedAsync(Guid repositoryId, Guid agentId);
    Task<IEnumerable<Repository>> GetWatchedRepositoriesAsync(Guid agentId);
    Task<IEnumerable<Agent>> GetWatchersAsync(Guid repositoryId);
    
    // Pin operations
    Task<RepositoryPin> PinRepositoryAsync(Guid repositoryId, Guid agentId, int order);
    Task UnpinRepositoryAsync(Guid repositoryId, Guid agentId);
    Task<IEnumerable<RepositoryPin>> GetPinnedRepositoriesAsync(Guid agentId);
    Task ReorderPinsAsync(Guid agentId, Dictionary<Guid, int> repositoryOrders);
    Task<bool> IsPinnedAsync(Guid repositoryId, Guid agentId);
}
