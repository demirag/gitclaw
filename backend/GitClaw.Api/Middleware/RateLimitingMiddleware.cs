using System.Collections.Concurrent;

namespace GitClaw.Api.Middleware;

/// <summary>
/// Rate limiting middleware to prevent DoS attacks
/// Limits requests per IP address
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    
    // Store request counts per IP address with timestamps
    private static readonly ConcurrentDictionary<string, RequestTracker> _requestTrackers = new();
    
    // Rate limit: 100 requests per minute
    private const int MaxRequestsPerMinute = 100;
    private static readonly TimeSpan TimeWindow = TimeSpan.FromMinutes(1);
    
    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Get client IP address
        var ipAddress = GetClientIpAddress(context);
        
        // Check rate limit
        if (!IsRequestAllowed(ipAddress, out var remainingRequests, out var resetTime))
        {
            _logger.LogWarning("Rate limit exceeded for IP: {IpAddress}", ipAddress);
            
            context.Response.StatusCode = 429; // Too Many Requests
            context.Response.Headers["Retry-After"] = resetTime.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = MaxRequestsPerMinute.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = "0";
            context.Response.Headers["X-RateLimit-Reset"] = DateTimeOffset.UtcNow.Add(resetTime).ToUnixTimeSeconds().ToString();
            
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = $"Maximum {MaxRequestsPerMinute} requests per minute allowed",
                retryAfter = $"{(int)resetTime.TotalSeconds} seconds"
            });
            
            return;
        }
        
        // Add rate limit headers to response
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-RateLimit-Limit"] = MaxRequestsPerMinute.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = remainingRequests.ToString();
            return Task.CompletedTask;
        });
        
        await _next(context);
    }
    
    /// <summary>
    /// Check if request is allowed based on rate limit
    /// </summary>
    private bool IsRequestAllowed(string ipAddress, out int remainingRequests, out TimeSpan resetTime)
    {
        var now = DateTime.UtcNow;
        
        // Get or create tracker for this IP
        var tracker = _requestTrackers.GetOrAdd(ipAddress, _ => new RequestTracker());
        
        lock (tracker)
        {
            // Remove expired requests
            tracker.Requests.RemoveAll(r => now - r > TimeWindow);
            
            // Check if limit exceeded
            if (tracker.Requests.Count >= MaxRequestsPerMinute)
            {
                remainingRequests = 0;
                var oldestRequest = tracker.Requests.Min();
                resetTime = TimeWindow - (now - oldestRequest);
                return false;
            }
            
            // Add current request
            tracker.Requests.Add(now);
            remainingRequests = MaxRequestsPerMinute - tracker.Requests.Count;
            resetTime = TimeSpan.Zero;
            
            return true;
        }
    }
    
    /// <summary>
    /// Get client IP address from request
    /// </summary>
    private string GetClientIpAddress(HttpContext context)
    {
        // Check for forwarded IP (if behind proxy/load balancer)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }
        
        // Check for real IP header
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }
        
        // Use connection remote IP
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
    
    /// <summary>
    /// Cleanup old trackers periodically (optional, can be called from background service)
    /// </summary>
    public static void CleanupOldTrackers()
    {
        var now = DateTime.UtcNow;
        var keysToRemove = new List<string>();
        
        foreach (var kvp in _requestTrackers)
        {
            lock (kvp.Value)
            {
                kvp.Value.Requests.RemoveAll(r => now - r > TimeWindow);
                
                // If no recent requests, remove tracker
                if (kvp.Value.Requests.Count == 0)
                {
                    keysToRemove.Add(kvp.Key);
                }
            }
        }
        
        foreach (var key in keysToRemove)
        {
            _requestTrackers.TryRemove(key, out _);
        }
    }
}

/// <summary>
/// Tracks requests for a single IP address
/// </summary>
public class RequestTracker
{
    public List<DateTime> Requests { get; } = new();
}

/// <summary>
/// Extension method to add rate limiting middleware
/// </summary>
public static class RateLimitingMiddlewareExtensions
{
    public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RateLimitingMiddleware>();
    }
}
