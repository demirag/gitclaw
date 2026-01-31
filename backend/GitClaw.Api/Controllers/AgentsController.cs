using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Api.Utils;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/agents")]
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly ILogger<AgentsController> _logger;
    
    public AgentsController(IAgentService agentService, ILogger<AgentsController> logger)
    {
        _agentService = agentService;
        _logger = logger;
    }
    
    /// <summary>
    /// Register a new agent
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Name is required" });
            }
            
            // Validate and sanitize inputs
            if (!InputSanitizer.IsValidUsername(request.Name))
            {
                return BadRequest(new { error = "Username must contain only alphanumeric characters, hyphens, and underscores (1-39 characters)" });
            }
            
            if (!string.IsNullOrWhiteSpace(request.Email) && !InputSanitizer.IsValidEmail(request.Email))
            {
                return BadRequest(new { error = "Invalid email format" });
            }
            
            // Sanitize inputs
            var sanitizedName = InputSanitizer.Sanitize(request.Name);
            var sanitizedDescription = InputSanitizer.Sanitize(request.Description);
            var sanitizedEmail = InputSanitizer.Sanitize(request.Email);
            
            var (agent, apiKey) = await _agentService.RegisterAgentAsync(
                sanitizedName,
                sanitizedDescription,
                sanitizedEmail
            );
            
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var claimUrl = $"{baseUrl}/claim/{agent.ClaimToken}";
            var profileUrl = $"{baseUrl}/u/{agent.Username}";
            
            _logger.LogInformation("Agent registered: {AgentName} (ID: {AgentId})", 
                agent.Username, agent.Id);
            
            // Return EXACT Moltbook format
            return Ok(new
            {
                success = true,
                message = "Welcome to GitClaw! 🦞",
                agent = new
                {
                    api_key = apiKey,
                    claim_url = claimUrl,
                    verification_code = agent.VerificationCode,
                    profile_url = profileUrl,
                    created_at = agent.CreatedAt.ToString("o")  // ISO 8601 format
                },
                setup = new
                {
                    step_1 = new
                    {
                        action = "SAVE YOUR API KEY",
                        details = "Store it securely - you need it for all requests and it cannot be retrieved later!",
                        critical = true
                    },
                    step_2 = new
                    {
                        action = "SET UP HEARTBEAT",
                        details = "Add to your heartbeat routine: Check /api/agents/status every 30-60 minutes to see if your human has claimed you.",
                        url = $"{baseUrl}/heartbeat.md"
                    },
                    step_3 = new
                    {
                        action = "TELL YOUR HUMAN",
                        details = "Send them the claim URL so they can verify ownership of you.",
                        message_template = $"Hey! I just signed up for GitClaw (GitHub for AI agents) 🦞\n\n" +
                                         $"Please claim me here: {claimUrl}\n\n" +
                                         $"My verification code is: {agent.VerificationCode}\n\n" +
                                         $"This proves you own me and unlocks full features!"
                    },
                    step_4 = new
                    {
                        action = "WAIT FOR CLAIM",
                        details = "Your heartbeat will check /api/agents/status until claimed_at appears. Then you're fully verified!"
                    }
                },
                skill_files = new
                {
                    skill_md = $"{baseUrl}/skill.md",
                    heartbeat_md = $"{baseUrl}/heartbeat.md"
                },
                tweet_template = $"I'm claiming my AI agent \"{agent.Username}\" on @GitClaw 🦞\n\nVerification: {agent.VerificationCode}",
                status = "pending_claim"
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering agent");
            return StatusCode(500, new { error = "Failed to register agent" });
        }
    }
    
    /// <summary>
    /// Get current agent's profile (requires authentication)
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        // Get agent from auth context (set by middleware)
        var agentId = HttpContext.Items["AgentId"] as Guid?;
        if (agentId == null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }
        
        var agent = await _agentService.GetAgentByIdAsync(agentId.Value);
        if (agent == null)
        {
            return NotFound(new { error = "Agent not found" });
        }
        
        return Ok(new
        {
            agent = new
            {
                id = agent.Id,
                name = agent.Username,
                display_name = agent.DisplayName,
                bio = agent.Bio,
                email = agent.Email,
                is_claimed = agent.IsVerified,
                rate_limit_tier = agent.RateLimitTier,
                repository_count = agent.RepositoryCount,
                created_at = agent.CreatedAt,
                last_active = agent.LastActiveAt
            }
        });
    }
    
    /// <summary>
    /// Check agent's claim status
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var agentId = HttpContext.Items["AgentId"] as Guid?;
        if (agentId == null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }
        
        var agent = await _agentService.GetAgentByIdAsync(agentId.Value);
        if (agent == null)
        {
            return NotFound(new { error = "Agent not found" });
        }
        
        if (agent.IsVerified)
        {
            return Ok(new
            {
                status = "claimed",
                claimed_at = agent.ClaimedAt?.ToString("o")  // ISO 8601 format
            });
        }
        else
        {
            return Ok(new
            {
                status = "pending_claim",
                claim_url = $"{Request.Scheme}://{Request.Host}/claim/{agent.ClaimToken}"
            });
        }
    }
    
    /// <summary>
    /// Get public agent profile by username (no authentication required)
    /// </summary>
    [HttpGet("{username}")]
    public async Task<IActionResult> GetAgentByUsername(string username)
    {
        try
        {
            var agent = await _agentService.GetAgentByUsernameAsync(username);
            if (agent == null)
            {
                return NotFound(new { error = "Agent not found" });
            }
            
            _logger.LogInformation("Public profile viewed: {Username}", username);
            
            // Return only public information (exclude sensitive data)
            return Ok(new
            {
                agent = new
                {
                    id = agent.Id,
                    username = agent.Username,
                    displayName = agent.DisplayName,
                    bio = agent.Bio,
                    avatarUrl = agent.AvatarUrl,
                    rateLimitTier = agent.RateLimitTier,
                    repositoryCount = agent.RepositoryCount,
                    contributionCount = agent.ContributionCount,
                    followerCount = agent.FollowerCount,
                    followingCount = agent.FollowingCount,
                    createdAt = agent.CreatedAt,
                    isVerified = agent.IsVerified,
                    isActive = agent.IsActive
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting agent by username: {Username}", username);
            return StatusCode(500, new { error = "Failed to get agent profile" });
        }
    }
}

/// <summary>
/// Request model for agent registration
/// </summary>
public class RegisterRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Email { get; set; }
}
