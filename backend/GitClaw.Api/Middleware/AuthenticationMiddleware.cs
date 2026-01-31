using System.Text;
using GitClaw.Core.Interfaces;

namespace GitClaw.Api.Middleware;

public class AuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthenticationMiddleware> _logger;
    
    public AuthenticationMiddleware(RequestDelegate next, ILogger<AuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context, IAgentService agentService)
    {
        // Skip authentication for certain paths
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        _logger.LogDebug("Auth check for path: {Path}", path);
        
        if (ShouldSkipAuth(path))
        {
            _logger.LogDebug("Skipping auth for path: {Path}", path);
            await _next(context);
            return;
        }
        
        // Try to extract and validate API key
        var apiKey = ExtractApiKey(context);
        _logger.LogDebug("Extracted API key: {HasKey}", !string.IsNullOrEmpty(apiKey));
        
        if (!string.IsNullOrEmpty(apiKey))
        {
            var agent = await agentService.ValidateApiKeyAsync(apiKey);
            _logger.LogDebug("Agent validation result: {Found}", agent != null);
            
            if (agent != null)
            {
                // Set agent in context for controllers to use
                context.Items["AgentId"] = agent.Id;
                context.Items["Agent"] = agent;
                
                // Update last active
                await agentService.UpdateLastActiveAsync(agent.Id);
                
                _logger.LogInformation("Authenticated agent: {AgentName} ({AgentId})", 
                    agent.Username, agent.Id);
            }
            else
            {
                _logger.LogWarning("Invalid API key attempted");
            }
        }
        else
        {
            _logger.LogWarning("No API key provided for path: {Path}", path);
        }
        
        await _next(context);
    }
    
    /// <summary>
    /// Extract API key from Authorization header (Bearer or Basic)
    /// </summary>
    private string? ExtractApiKey(HttpContext context)
    {
        var authHeader = context.Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader))
        {
            return null;
        }
        
        // Try Bearer token (for API requests)
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return authHeader.Substring("Bearer ".Length).Trim();
        }
        
        // Try Basic auth (for git operations)
        if (authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
                var decodedBytes = Convert.FromBase64String(encodedCredentials);
                var decodedString = Encoding.UTF8.GetString(decodedBytes);
                
                // Format: username:api_key
                var parts = decodedString.Split(':', 2);
                if (parts.Length == 2)
                {
                    var apiKey = parts[1];  // Password is the API key
                    return apiKey;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode Basic auth header");
            }
        }
        
        return null;
    }
    
    /// <summary>
    /// Paths that don't require authentication
    /// </summary>
    private bool ShouldSkipAuth(string path)
    {
        // Exact matches
        if (path == "/" || path == "/health" || path == "/skill.md" || path == "/heartbeat.md" || path == "/auth.md")
        {
            return true;
        }
        
        // Git HTTP endpoints handle authentication themselves
        if (path.Contains("/info/refs") || 
            path.Contains("/git-upload-pack") || 
            path.Contains("/git-receive-pack"))
        {
            return true;
        }
        
        // Prefix matches (with trailing slash or end of string)
        var publicPrefixes = new[]
        {
            "/api/agents/register",
            "/api/auth/register",  // Alias for agents/register
            "/swagger",
            "/claim/"
        };
        
        foreach (var prefix in publicPrefixes)
        {
            if (path == prefix || path.StartsWith(prefix + "/") || path.StartsWith(prefix + "?"))
            {
                return true;
            }
        }
        
        // Public GET endpoints that don't require authentication
        // (authentication is optional for enhanced features)
        return false;
    }
}

/// <summary>
/// Extension method to add authentication middleware
/// </summary>
public static class AuthenticationMiddlewareExtensions
{
    public static IApplicationBuilder UseAgentAuthentication(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<AuthenticationMiddleware>();
    }
}
