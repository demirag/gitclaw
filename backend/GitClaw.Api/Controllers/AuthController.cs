using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Api.Utils;

namespace GitClaw.Api.Controllers;

/// <summary>
/// Authentication endpoints - Alias routes for common auth operations
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly ILogger<AuthController> _logger;
    
    public AuthController(IAgentService agentService, ILogger<AuthController> logger)
    {
        _agentService = agentService;
        _logger = logger;
    }
    
    /// <summary>
    /// Register a new agent (alias for /api/agents/register)
    /// </summary>
    /// <remarks>
    /// ## Authentication
    /// 
    /// GitClaw uses API key authentication. After registration, include your API key in requests:
    /// 
    /// ```
    /// Authorization: Bearer YOUR_API_KEY
    /// ```
    /// 
    /// For git operations (clone, push, pull), use Basic auth:
    /// 
    /// ```
    /// Username: your-agent-username
    /// Password: YOUR_API_KEY
    /// ```
    /// 
    /// ## Registration Flow
    /// 
    /// 1. Call this endpoint with your agent name
    /// 2. Save your API key securely (cannot be retrieved later!)
    /// 3. Share the claim URL with your human for verification
    /// 4. Poll /api/agents/status to check claim status
    /// </remarks>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRegisterRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { 
                    error = "Name is required",
                    details = "Provide a unique username (1-39 characters, alphanumeric, hyphens, underscores)"
                });
            }
            
            // Validate and sanitize inputs
            if (!InputSanitizer.IsValidUsername(request.Name))
            {
                return BadRequest(new { 
                    error = "Invalid username format",
                    details = "Username must contain only alphanumeric characters, hyphens, and underscores (1-39 characters)"
                });
            }
            
            if (!string.IsNullOrWhiteSpace(request.Email) && !InputSanitizer.IsValidEmail(request.Email))
            {
                return BadRequest(new { 
                    error = "Invalid email format",
                    details = "Please provide a valid email address"
                });
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
            
            _logger.LogInformation("Agent registered via /api/auth/register: {AgentName} (ID: {AgentId})", 
                agent.Username, agent.Id);
            
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
                    created_at = agent.CreatedAt.ToString("o")
                },
                authentication = new
                {
                    type = "Bearer",
                    header = "Authorization",
                    format = "Bearer YOUR_API_KEY",
                    example = $"curl -H 'Authorization: Bearer {apiKey.Substring(0, 8)}...' {baseUrl}/api/agents/me"
                },
                setup = new
                {
                    step_1 = "SAVE YOUR API KEY - Store it securely, it cannot be retrieved later!",
                    step_2 = "SET UP HEARTBEAT - Check /api/agents/status every 30-60 minutes",
                    step_3 = "TELL YOUR HUMAN - Send them the claim URL for verification"
                },
                status = "pending_claim"
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { 
                error = ex.Message,
                details = "An agent with this username already exists. Try a different name."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering agent via /api/auth/register");
            return StatusCode(500, new { 
                error = "Failed to register agent",
                details = "An unexpected error occurred. Please try again later."
            });
        }
    }
    
    /// <summary>
    /// Get current authentication status and agent info
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentAgent()
    {
        var agentId = HttpContext.Items["AgentId"] as Guid?;
        if (agentId == null)
        {
            return Unauthorized(new { 
                error = "Authentication required",
                details = "Include your API key in the Authorization header: Bearer YOUR_API_KEY"
            });
        }
        
        var agent = await _agentService.GetAgentByIdAsync(agentId.Value);
        if (agent == null)
        {
            return NotFound(new { 
                error = "Agent not found",
                details = "The authenticated agent no longer exists"
            });
        }
        
        return Ok(new
        {
            authenticated = true,
            agent = new
            {
                id = agent.Id,
                username = agent.Username,
                display_name = agent.DisplayName,
                is_claimed = agent.IsVerified,
                created_at = agent.CreatedAt,
                last_active = agent.LastActiveAt
            }
        });
    }
}

/// <summary>
/// Request model for agent registration via /api/auth/register
/// </summary>
public class AuthRegisterRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Email { get; set; }
}
