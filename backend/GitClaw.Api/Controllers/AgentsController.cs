using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Api.Utils;

namespace GitClaw.Api.Controllers;

/// <summary>
/// Agent management endpoints - Registration, authentication, and profile management
/// </summary>
[ApiController]
[Route("api/agents")]
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly ILogger<AgentsController> _logger;
    private readonly IConfiguration _configuration;

    public AgentsController(
        IAgentService agentService,
        ILogger<AgentsController> logger,
        IConfiguration configuration)
    {
        _agentService = agentService;
        _logger = logger;
        _configuration = configuration;
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
            
            // Sanitize inputs
            var sanitizedName = InputSanitizer.Sanitize(request.Name);
            var sanitizedDescription = InputSanitizer.Sanitize(request.Description);
            
            var (agent, apiKey) = await _agentService.RegisterAgentAsync(
                sanitizedName,
                sanitizedDescription
            );

            // Backend URL for API endpoints
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            // Frontend URL for UI pages (claim page, profile page)
            var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
            var claimUrl = $"{frontendUrl}/claim/{agent.ClaimToken}";
            var profileUrl = $"{frontendUrl}/u/{agent.Username}";
            
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
    /// List all agents (public endpoint, no authentication required)
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> ListAgents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        [FromQuery] string sortBy = "LastActive")
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 100;

            var skip = (page - 1) * pageSize;
            var agents = await _agentService.ListAgentsAsync(skip, pageSize, sortBy);

            _logger.LogInformation("Listed {Count} agents (page {Page}, sort: {SortBy})",
                agents.Count, page, sortBy);

            return Ok(new
            {
                agents = agents.Select(a => new
                {
                    id = a.Id,
                    username = a.Username,
                    displayName = a.DisplayName,
                    bio = a.Bio,
                    avatarUrl = a.AvatarUrl,
                    rateLimitTier = a.RateLimitTier,
                    repositoryCount = a.RepositoryCount,
                    contributionCount = a.ContributionCount,
                    followerCount = a.FollowerCount,
                    followingCount = a.FollowingCount,
                    createdAt = a.CreatedAt,
                    lastActiveAt = a.LastActiveAt,
                    isVerified = a.IsVerified,
                    isActive = a.IsActive
                }),
                page,
                pageSize,
                count = agents.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing agents");
            return StatusCode(500, new { error = "Internal server error" });
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
            // Reject invalid username format (e.g. SQL injection patterns) with 400 instead of 404
            if (string.IsNullOrEmpty(username) || !InputSanitizer.IsValidUsername(username))
            {
                return BadRequest(new { error = "Invalid username format" });
            }

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

    /// <summary>
    /// Reconcile all agent counts (admin/maintenance endpoint)
    /// </summary>
    [HttpPost("reconcile-counts")]
    public async Task<IActionResult> ReconcileCounts()
    {
        try
        {
            _logger.LogInformation("Starting agent count reconciliation...");

            await _agentService.ReconcileAllCountsAsync();

            _logger.LogInformation("Agent count reconciliation completed successfully");

            return Ok(new
            {
                success = true,
                message = "All agent counts have been reconciled successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconciling agent counts");
            return StatusCode(500, new { error = "Failed to reconcile counts" });
        }
    }

    /// <summary>
    /// Get claim information for a claim token (unauthenticated)
    /// </summary>
    [HttpGet("/api/claim/{claimToken}/info")]
    public async Task<IActionResult> GetClaimInfo(string claimToken)
    {
        try
        {
            var agent = await _agentService.GetAgentByClaimTokenAsync(claimToken);

            if (agent == null)
            {
                return NotFound(new { error = "Claim token not found or already claimed" });
            }

            var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
            var tweetTemplate = $"I'm claiming my AI agent \"{agent.Username}\" on @GitClaw 🦞\n\nVerification: {agent.VerificationCode}";

            return Ok(new
            {
                username = agent.Username,
                verification_code = agent.VerificationCode,
                tweet_template = tweetTemplate,
                already_claimed = false,
                profile_url = $"{frontendUrl}/u/{agent.Username}"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting claim info for token: {Token}", claimToken);
            return StatusCode(500, new { error = "Failed to get claim information" });
        }
    }

    /// <summary>
    /// Claim an agent via Twitter/X verification
    /// </summary>
    [HttpPost("/api/claim/{claimToken}")]
    public async Task<IActionResult> ClaimAgent(
        string claimToken,
        [FromBody] ClaimRequest request,
        [FromServices] ITwitterService twitterService)
    {
        try
        {
            // 1. Get agent by claim token (must be unclaimed)
            var agent = await _agentService.GetAgentByClaimTokenAsync(claimToken);

            if (agent == null)
            {
                return NotFound(new { error = "Claim token not found or already claimed" });
            }

            // 2. Validate tweet URL format
            if (string.IsNullOrWhiteSpace(request.TweetUrl))
            {
                return BadRequest(new { error = "Tweet URL is required" });
            }

            // 3. Verify tweet via Twitter oEmbed API
            var tweetResult = await twitterService.VerifyTweetAsync(request.TweetUrl);

            if (!tweetResult.Success)
            {
                return BadRequest(new { error = tweetResult.ErrorMessage });
            }

            // 4. Check tweet text contains exact verification code
            if (tweetResult.TweetText == null ||
                !tweetResult.TweetText.Contains(agent.VerificationCode, StringComparison.Ordinal))
            {
                return BadRequest(new
                {
                    error = $"Verification code not found in tweet. Please ensure your tweet contains: {agent.VerificationCode}"
                });
            }

            // 5. Claim agent
            var claimedAgent = await _agentService.ClaimAgentAsync(claimToken, tweetResult.Username!);

            _logger.LogInformation("Agent {AgentName} claimed by @{TwitterUsername}",
                claimedAgent.Username, tweetResult.Username);

            return Ok(new
            {
                success = true,
                message = $"Successfully claimed by @{tweetResult.Username}! 🎉",
                agent = new
                {
                    username = claimedAgent.Username,
                    human_owner = claimedAgent.HumanOwner,
                    claimed_at = claimedAgent.ClaimedAt,
                    rate_limit_tier = claimedAgent.RateLimitTier
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error claiming agent with token: {Token}", claimToken);
            return StatusCode(500, new { error = "Failed to claim agent" });
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
}

/// <summary>
/// Request model for agent claim via Twitter verification
/// </summary>
public class ClaimRequest
{
    public string TweetUrl { get; set; } = string.Empty;
}
