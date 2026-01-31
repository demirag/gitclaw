using System.Security.Cryptography;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using BCrypt.Net;

namespace GitClaw.Data;

public class AgentService : IAgentService
{
    // In-memory storage (replace with database later)
    private static readonly List<Agent> _agents = new();
    private static readonly Dictionary<string, string> _apiKeyToAgentId = new();
    
    /// <summary>
    /// Register a new agent and generate API key
    /// </summary>
    public async Task<(Agent Agent, string ApiKey)> RegisterAgentAsync(string name, string? description = null, string? email = null)
    {
        // Check if username already exists
        if (_agents.Any(a => a.Username.Equals(name, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"Agent with username '{name}' already exists");
        }
        
        // Generate API key
        var apiKey = GenerateApiKey();
        
        // Hash API key
        var apiKeyHash = BCrypt.Net.BCrypt.HashPassword(apiKey, BCrypt.Net.BCrypt.GenerateSalt(12));
        
        // Generate claim token
        var claimToken = GenerateClaimToken();
        
        // Create agent
        var agent = new Agent
        {
            Id = Guid.NewGuid(),
            Username = name,
            DisplayName = name,
            Email = email ?? string.Empty,
            Bio = description ?? string.Empty,
            ApiKeyHash = apiKeyHash,
            ClaimToken = claimToken,
            RateLimitTier = "unclaimed",
            IsActive = true,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow
        };
        
        // Store agent
        _agents.Add(agent);
        _apiKeyToAgentId[apiKey] = agent.Id.ToString();
        
        return await Task.FromResult((agent, apiKey));
    }
    
    /// <summary>
    /// Validate API key and return agent
    /// </summary>
    public async Task<Agent?> ValidateApiKeyAsync(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }
        
        // For performance, check cache first (in-memory lookup)
        if (_apiKeyToAgentId.TryGetValue(apiKey, out var agentId))
        {
            var agent = _agents.FirstOrDefault(a => a.Id.ToString() == agentId);
            if (agent != null)
            {
                return await Task.FromResult(agent);
            }
        }
        
        // Fallback: Check all agents (slower, but handles server restarts)
        foreach (var agent in _agents)
        {
            try
            {
                if (BCrypt.Net.BCrypt.Verify(apiKey, agent.ApiKeyHash))
                {
                    // Update cache
                    _apiKeyToAgentId[apiKey] = agent.Id.ToString();
                    return await Task.FromResult(agent);
                }
            }
            catch
            {
                // Invalid hash format, skip
                continue;
            }
        }
        
        return null;
    }
    
    /// <summary>
    /// Get agent by ID
    /// </summary>
    public async Task<Agent?> GetAgentByIdAsync(Guid id)
    {
        var agent = _agents.FirstOrDefault(a => a.Id == id);
        return await Task.FromResult(agent);
    }
    
    /// <summary>
    /// Get agent by username
    /// </summary>
    public async Task<Agent?> GetAgentByUsernameAsync(string username)
    {
        var agent = _agents.FirstOrDefault(a => 
            a.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
        return await Task.FromResult(agent);
    }
    
    /// <summary>
    /// Update agent's last active timestamp
    /// </summary>
    public async Task UpdateLastActiveAsync(Guid agentId)
    {
        var agent = _agents.FirstOrDefault(a => a.Id == agentId);
        if (agent != null)
        {
            agent.LastActiveAt = DateTime.UtcNow;
        }
        await Task.CompletedTask;
    }
    
    /// <summary>
    /// Generate a secure API key in format: gitclaw_sk_<32_chars>
    /// </summary>
    private static string GenerateApiKey()
    {
        // Generate 32 random bytes
        var randomBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        
        // Convert to base64 and take first 32 chars (alphanumeric)
        var base64 = Convert.ToBase64String(randomBytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "")
            .Substring(0, 32);
        
        return $"gitclaw_sk_{base64}";
    }
    
    /// <summary>
    /// Generate a secure claim token
    /// </summary>
    private static string GenerateClaimToken()
    {
        var randomBytes = new byte[24];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        
        var token = Convert.ToBase64String(randomBytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "");
        
        return $"gitclaw_claim_{token}";
    }
}
