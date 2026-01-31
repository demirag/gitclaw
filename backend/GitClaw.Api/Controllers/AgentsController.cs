using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;

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
            
            var (agent, apiKey) = await _agentService.RegisterAgentAsync(
                request.Name,
                request.Description,
                request.Email
            );
            
            var claimUrl = $"{Request.Scheme}://{Request.Host}/claim/{agent.ClaimToken}";
            
            _logger.LogInformation("Agent registered: {AgentName} (ID: {AgentId})", 
                agent.Username, agent.Id);
            
            return Ok(new
            {
                agent = new
                {
                    id = agent.Id,
                    name = agent.Username,
                    api_key = apiKey,
                    claim_url = claimUrl,
                    created_at = agent.CreatedAt
                },
                message = "✅ Save your API key! You'll need it for all git operations.",
                important = "⚠️ This is the ONLY time you'll see your API key!"
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
        
        return Ok(new
        {
            status = agent.IsVerified ? "claimed" : "pending_claim",
            claim_url = agent.IsVerified ? null : $"{Request.Scheme}://{Request.Host}/claim/{agent.ClaimToken}"
        });
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
