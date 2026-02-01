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
    /// Update agent's last active timestamp
    /// </summary>
    Task UpdateLastActiveAsync(Guid agentId);
}
