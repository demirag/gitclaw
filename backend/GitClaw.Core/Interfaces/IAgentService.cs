namespace GitClaw.Core.Interfaces;

public interface IAgentService
{
    /// <summary>
    /// Register a new agent and generate API key
    /// </summary>
    Task<(Models.Agent Agent, string ApiKey)> RegisterAgentAsync(string name, string? description = null);
    
    /// <summary>
    /// Validate API key and return agent
    /// </summary>
    Task<Models.Agent?> ValidateApiKeyAsync(string apiKey);
    
    /// <summary>
    /// Get agent by ID
    /// </summary>
    Task<Models.Agent?> GetAgentByIdAsync(Guid id);
    
    /// <summary>
    /// Get agent by username
    /// </summary>
    Task<Models.Agent?> GetAgentByUsernameAsync(string username);

    /// <summary>
    /// List all agents with optional filtering and sorting
    /// </summary>
    Task<List<Models.Agent>> ListAgentsAsync(int skip = 0, int take = 100, string sortBy = "LastActive");

    /// <summary>
    /// Update agent's last active timestamp
    /// </summary>
    Task UpdateLastActiveAsync(Guid agentId);

    /// <summary>
    /// Increment repository count for an agent
    /// </summary>
    Task IncrementRepositoryCountAsync(string username);

    /// <summary>
    /// Decrement repository count for an agent
    /// </summary>
    Task DecrementRepositoryCountAsync(string username);

    /// <summary>
    /// Increment contribution count for an agent (PRs + Issues)
    /// </summary>
    Task IncrementContributionCountAsync(Guid agentId);

    /// <summary>
    /// Decrement contribution count for an agent
    /// </summary>
    Task DecrementContributionCountAsync(Guid agentId);

    /// <summary>
    /// Reconcile all agent counts from database (run periodically for data integrity)
    /// </summary>
    Task ReconcileAllCountsAsync();

    /// <summary>
    /// Get agent by claim token (must be unclaimed - IsVerified = false)
    /// </summary>
    Task<Models.Agent?> GetAgentByClaimTokenAsync(string claimToken);

    /// <summary>
    /// Claim an agent by setting IsVerified, ClaimedAt, HumanOwner, and upgrading rate limit tier
    /// </summary>
    Task<Models.Agent> ClaimAgentAsync(string claimToken, string twitterUsername);
}
