using System.Security.Cryptography;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace GitClaw.Data;

public class AgentService : IAgentService
{
    private readonly GitClawDbContext _dbContext;
    private static readonly Dictionary<string, (Guid AgentId, DateTime CachedAt)> _apiKeyCache = new();
    private static readonly object _cacheLock = new object();
    private const int CacheExpirationMinutes = 15;
    
    public AgentService(GitClawDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    /// <summary>
    /// Register a new agent and generate API key
    /// </summary>
    public async Task<(Agent Agent, string ApiKey)> RegisterAgentAsync(string name, string? description = null, string? email = null)
    {
        // Normalize username to lowercase for case-insensitive comparison
        var normalizedName = name.ToLower();
        
        // Check if username already exists (case-insensitive)
        if (await _dbContext.Agents.AnyAsync(a => a.Username.ToLower() == normalizedName))
        {
            throw new InvalidOperationException($"Agent with username '{name}' already exists");
        }
        
        // Generate API key
        var apiKey = GenerateApiKey();
        
        // Hash API key
        var apiKeyHash = BCrypt.Net.BCrypt.HashPassword(apiKey, BCrypt.Net.BCrypt.GenerateSalt(12));
        
        // Generate claim token
        var claimToken = GenerateClaimToken();
        
        // Generate verification code
        var verificationCode = GenerateVerificationCode();
        
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
            VerificationCode = verificationCode,
            RateLimitTier = "unclaimed",
            IsActive = true,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow
        };
        
        // Save to database
        _dbContext.Agents.Add(agent);
        await _dbContext.SaveChangesAsync();
        
        return (agent, apiKey);
    }
    
    /// <summary>
    /// Validate API key and return agent (with caching)
    /// </summary>
    public async Task<Agent?> ValidateApiKeyAsync(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }
        
        // Check cache first (massive performance improvement)
        Guid? cachedAgentId = null;
        lock (_cacheLock)
        {
            if (_apiKeyCache.TryGetValue(apiKey, out var cached))
            {
                // Check if cache entry is still valid
                if ((DateTime.UtcNow - cached.CachedAt).TotalMinutes < CacheExpirationMinutes)
                {
                    cachedAgentId = cached.AgentId;
                }
                else
                {
                    // Cache expired, remove
                    _apiKeyCache.Remove(apiKey);
                }
            }
        }
        
        // If we found a cached ID, load the agent (outside the lock)
        if (cachedAgentId.HasValue)
        {
            var cachedAgent = await _dbContext.Agents
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == cachedAgentId.Value);
            
            if (cachedAgent != null)
            {
                return cachedAgent;
            }
            
            // Agent was deleted, remove from cache
            lock (_cacheLock)
            {
                _apiKeyCache.Remove(apiKey);
            }
        }
        
        // Cache miss - need to verify API key (slow)
        // Get all agents (unfortunately BCrypt requires in-memory verification)
        var agents = await _dbContext.Agents
            .AsNoTracking()
            .ToListAsync();
        
        foreach (var agent in agents)
        {
            try
            {
                if (BCrypt.Net.BCrypt.Verify(apiKey, agent.ApiKeyHash))
                {
                    // Add to cache for future requests
                    lock (_cacheLock)
                    {
                        _apiKeyCache[apiKey] = (agent.Id, DateTime.UtcNow);
                    }
                    
                    return agent;
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
        return await _dbContext.Agents.FindAsync(id);
    }
    
    /// <summary>
    /// Get agent by username
    /// </summary>
    public async Task<Agent?> GetAgentByUsernameAsync(string username)
    {
        var normalizedUsername = username.ToLower();
        return await _dbContext.Agents
            .FirstOrDefaultAsync(a => a.Username.ToLower() == normalizedUsername);
    }
    
    /// <summary>
    /// Update agent's last active timestamp
    /// </summary>
    public async Task UpdateLastActiveAsync(Guid agentId)
    {
        var agent = await _dbContext.Agents.FindAsync(agentId);
        if (agent != null)
        {
            agent.LastActiveAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }
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
    
    /// <summary>
    /// Generate a verification code in format: "color-CODE" (e.g., "blue-AALQ")
    /// </summary>
    private static string GenerateVerificationCode()
    {
        var colors = new[] { "red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan" };
        var random = new Random();
        var color = colors[random.Next(colors.Length)];
        
        // Generate 4 random uppercase letters
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var code = new string(Enumerable.Range(0, 4)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
        
        return $"{color}-{code}";
    }
}
