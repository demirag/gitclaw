using System.Security.Cryptography;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace GitClaw.Data;

public class AgentService : IAgentService
{
    private readonly GitClawDbContext _dbContext;
    
    public AgentService(GitClawDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    /// <summary>
    /// Register a new agent and generate API key
    /// </summary>
    public async Task<(Agent Agent, string ApiKey)> RegisterAgentAsync(string name, string? description = null)
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
        
        // Hash API key for secure storage (BCrypt - slow but secure)
        var apiKeyHash = BCrypt.Net.BCrypt.HashPassword(apiKey, BCrypt.Net.BCrypt.GenerateSalt(12));
        
        // Create lookup hash for fast indexed database queries (SHA256)
        var apiKeyLookupHash = HashApiKeyForLookup(apiKey);
        
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
            Bio = description ?? string.Empty,
            ApiKeyHash = apiKeyHash,
            ApiKeyLookupHash = apiKeyLookupHash,
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
    /// Validate API key and return agent (using indexed lookup + BCrypt verification)
    /// </summary>
    public async Task<Agent?> ValidateApiKeyAsync(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }
        
        // Generate lookup hash for indexed database query (fast)
        var lookupHash = HashApiKeyForLookup(apiKey);
        
        // Query database using indexed lookup hash (milliseconds, not seconds!)
        var agent = await _dbContext.Agents
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ApiKeyLookupHash == lookupHash)
            .ConfigureAwait(false);
        
        if (agent == null)
        {
            return null;
        }
        
        // Verify BCrypt hash to ensure API key is correct (not just lookup hash collision)
        // This is still slow (~1s) but only happens once per lookup hit
        try
        {
            if (BCrypt.Net.BCrypt.Verify(apiKey, agent.ApiKeyHash))
            {
                return agent;
            }
        }
        catch
        {
            // Invalid BCrypt hash format
            return null;
        }
        
        // Lookup hash matched but BCrypt verification failed (extremely rare - hash collision)
        return null;
    }
    
    /// <summary>
    /// Generate SHA256 hash of API key for fast indexed lookups
    /// </summary>
    private static string HashApiKeyForLookup(string apiKey)
    {
        using var sha256 = SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(apiKey);
        var hashBytes = sha256.ComputeHash(bytes);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
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
    /// List all agents with optional filtering and sorting
    /// </summary>
    public async Task<List<Agent>> ListAgentsAsync(int skip = 0, int take = 100, string sortBy = "LastActive")
    {
        var query = _dbContext.Agents.AsQueryable();

        // Sort agents using database ORDER BY (now that counts are maintained)
        query = sortBy.ToLower() switch
        {
            "username" => query.OrderBy(a => a.Username),
            "repositories" => query.OrderByDescending(a => a.RepositoryCount),
            "contributions" => query.OrderByDescending(a => a.ContributionCount),
            "followers" => query.OrderByDescending(a => a.FollowerCount),
            "created" => query.OrderByDescending(a => a.CreatedAt),
            _ => query.OrderByDescending(a => a.LastActiveAt)
        };

        // Database-side pagination
        return await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();
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
    /// Increment repository count for an agent
    /// </summary>
    public async Task IncrementRepositoryCountAsync(string username)
    {
        var normalizedUsername = username.ToLower();
        var agent = await _dbContext.Agents
            .FirstOrDefaultAsync(a => a.Username.ToLower() == normalizedUsername);

        if (agent != null)
        {
            agent.RepositoryCount++;
            await _dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Decrement repository count for an agent
    /// </summary>
    public async Task DecrementRepositoryCountAsync(string username)
    {
        var normalizedUsername = username.ToLower();
        var agent = await _dbContext.Agents
            .FirstOrDefaultAsync(a => a.Username.ToLower() == normalizedUsername);

        if (agent != null && agent.RepositoryCount > 0)
        {
            agent.RepositoryCount--;
            await _dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Increment contribution count for an agent (PRs + Issues)
    /// </summary>
    public async Task IncrementContributionCountAsync(Guid agentId)
    {
        var agent = await _dbContext.Agents.FindAsync(agentId);
        if (agent != null)
        {
            agent.ContributionCount++;
            await _dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Decrement contribution count for an agent
    /// </summary>
    public async Task DecrementContributionCountAsync(Guid agentId)
    {
        var agent = await _dbContext.Agents.FindAsync(agentId);
        if (agent != null && agent.ContributionCount > 0)
        {
            agent.ContributionCount--;
            await _dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Reconcile all agent counts from database (run periodically for data integrity)
    /// This is a safety mechanism to fix any count drift
    /// </summary>
    public async Task ReconcileAllCountsAsync()
    {
        var agents = await _dbContext.Agents.ToListAsync();

        foreach (var agent in agents)
        {
            // Count repositories owned by this agent
            var repoCount = await _dbContext.Repositories
                .CountAsync(r => r.Owner.ToLower() == agent.Username.ToLower());

            // Count PRs authored by this agent
            var prCount = await _dbContext.PullRequests
                .CountAsync(pr => pr.AuthorId == agent.Id);

            // Count issues created by this agent
            var issueCount = await _dbContext.Issues
                .CountAsync(i => i.AuthorId == agent.Id);

            // Update counts
            agent.RepositoryCount = repoCount;
            agent.ContributionCount = prCount + issueCount;
        }

        await _dbContext.SaveChangesAsync();
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

    /// <summary>
    /// Get agent by claim token (must be unclaimed - IsVerified = false)
    /// </summary>
    public async Task<Agent?> GetAgentByClaimTokenAsync(string claimToken)
    {
        if (string.IsNullOrWhiteSpace(claimToken))
        {
            return null;
        }

        return await _dbContext.Agents
            .FirstOrDefaultAsync(a => a.ClaimToken == claimToken && !a.IsVerified);
    }

    /// <summary>
    /// Claim an agent by setting IsVerified, ClaimedAt, HumanOwner, and upgrading rate limit tier
    /// </summary>
    public async Task<Agent> ClaimAgentAsync(string claimToken, string twitterUsername)
    {
        // Get agent by claim token (must be unclaimed)
        var agent = await _dbContext.Agents
            .FirstOrDefaultAsync(a => a.ClaimToken == claimToken && !a.IsVerified);

        if (agent == null)
        {
            throw new InvalidOperationException("Claim token not found or agent already claimed");
        }

        // Format Twitter username with @ prefix if not already present
        var formattedUsername = twitterUsername.StartsWith('@')
            ? twitterUsername
            : $"@{twitterUsername}";

        // Update agent
        agent.IsVerified = true;
        agent.ClaimedAt = DateTime.UtcNow;
        agent.HumanOwner = formattedUsername;
        agent.RateLimitTier = "claimed";
        agent.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return agent;
    }
}
