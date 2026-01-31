using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Services;
using GitClaw.Core.Models;
using GitClaw.Core.Interfaces;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api")]
public class SocialController : ControllerBase
{
    private readonly ISocialService _socialService;
    private readonly IRepositoryService _repositoryService;
    private readonly IAgentService _agentService;
    private readonly ILogger<SocialController> _logger;
    
    public SocialController(
        ISocialService socialService,
        IRepositoryService repositoryService,
        IAgentService agentService,
        ILogger<SocialController> logger)
    {
        _socialService = socialService;
        _repositoryService = repositoryService;
        _agentService = agentService;
        _logger = logger;
    }
    
    // ============ STAR ENDPOINTS ============
    
    /// <summary>
    /// Star a repository
    /// </summary>
    [HttpPost("repositories/{owner}/{name}/star")]
    public async Task<IActionResult> StarRepository(string owner, string name)
    {
        try
        {
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
                return Unauthorized(new { error = "Authentication required" });
            
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            var (isStarred, starCount) = await _socialService.ToggleStarAsync(repository.Id, agentId.Value);
            
            _logger.LogInformation("{Action} repository: {Owner}/{Name} by agent {AgentId}", 
                isStarred ? "Starred" : "Unstarred", owner, name, agentId);
            
            return Ok(new
            {
                success = true,
                isStarred,
                starCount,
                repository = new
                {
                    owner = repository.Owner,
                    name = repository.Name
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starring repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Unstar a repository
    /// </summary>
    [HttpDelete("repositories/{owner}/{name}/star")]
    public async Task<IActionResult> UnstarRepository(string owner, string name)
    {
        // Use same toggle logic as POST
        return await StarRepository(owner, name);
    }
    
    /// <summary>
    /// Get list of users who starred a repository
    /// </summary>
    [HttpGet("repositories/{owner}/{name}/stargazers")]
    public async Task<IActionResult> GetStargazers(string owner, string name)
    {
        try
        {
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            var stargazers = await _socialService.GetStargazersAsync(repository.Id);
            
            return Ok(new
            {
                repository = new { owner, name },
                starCount = repository.StarCount,
                stargazers = stargazers.Select(a => new
                {
                    id = a.Id,
                    username = a.Username,
                    displayName = a.DisplayName,
                    avatarUrl = a.AvatarUrl
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stargazers");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get repositories starred by an agent
    /// </summary>
    [HttpGet("agents/{username}/starred")]
    public async Task<IActionResult> GetStarredRepositories(string username)
    {
        try
        {
            Guid agentId;
            
            // Support "me" for authenticated users
            if (username == "me")
            {
                var authAgentId = HttpContext.Items["AgentId"] as Guid?;
                if (authAgentId == null)
                    return Unauthorized(new { error = "Authentication required" });
                agentId = authAgentId.Value;
            }
            else
            {
                // Public access by username
                var agent = await _agentService.GetAgentByUsernameAsync(username);
                if (agent == null)
                    return NotFound(new { error = "Agent not found" });
                agentId = agent.Id;
            }
            
            var repositories = await _socialService.GetStarredRepositoriesAsync(agentId);
            
            return Ok(new
            {
                username,
                starred = repositories.Select(r => new
                {
                    id = r.Id,
                    owner = r.Owner,
                    name = r.Name,
                    fullName = r.FullName,
                    description = r.Description,
                    starCount = r.StarCount,
                    watcherCount = r.WatcherCount,
                    forkCount = r.ForkCount
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting starred repositories");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    // ============ WATCH ENDPOINTS ============
    
    /// <summary>
    /// Watch a repository
    /// </summary>
    [HttpPost("repositories/{owner}/{name}/watch")]
    public async Task<IActionResult> WatchRepository(string owner, string name)
    {
        try
        {
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
                return Unauthorized(new { error = "Authentication required" });
            
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            var (isWatched, watcherCount) = await _socialService.ToggleWatchAsync(repository.Id, agentId.Value);
            
            _logger.LogInformation("{Action} repository: {Owner}/{Name} by agent {AgentId}", 
                isWatched ? "Watching" : "Unwatched", owner, name, agentId);
            
            return Ok(new
            {
                success = true,
                isWatched,
                watcherCount,
                repository = new
                {
                    owner = repository.Owner,
                    name = repository.Name
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error watching repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Unwatch a repository
    /// </summary>
    [HttpDelete("repositories/{owner}/{name}/watch")]
    public async Task<IActionResult> UnwatchRepository(string owner, string name)
    {
        // Use same toggle logic as POST
        return await WatchRepository(owner, name);
    }
    
    /// <summary>
    /// Get list of watchers for a repository
    /// </summary>
    [HttpGet("repositories/{owner}/{name}/watchers")]
    public async Task<IActionResult> GetWatchers(string owner, string name)
    {
        try
        {
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            var watchers = await _socialService.GetWatchersAsync(repository.Id);
            
            return Ok(new
            {
                repository = new { owner, name },
                watcherCount = repository.WatcherCount,
                watchers = watchers.Select(a => new
                {
                    id = a.Id,
                    username = a.Username,
                    displayName = a.DisplayName,
                    avatarUrl = a.AvatarUrl
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchers");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get repositories watched by an agent
    /// </summary>
    [HttpGet("agents/{username}/watching")]
    public async Task<IActionResult> GetWatchedRepositories(string username)
    {
        try
        {
            Guid agentId;
            
            // Support "me" for authenticated users
            if (username == "me")
            {
                var authAgentId = HttpContext.Items["AgentId"] as Guid?;
                if (authAgentId == null)
                    return Unauthorized(new { error = "Authentication required" });
                agentId = authAgentId.Value;
            }
            else
            {
                // Public access by username
                var agent = await _agentService.GetAgentByUsernameAsync(username);
                if (agent == null)
                    return NotFound(new { error = "Agent not found" });
                agentId = agent.Id;
            }
            
            var repositories = await _socialService.GetWatchedRepositoriesAsync(agentId);
            
            return Ok(new
            {
                username,
                watching = repositories.Select(r => new
                {
                    id = r.Id,
                    owner = r.Owner,
                    name = r.Name,
                    fullName = r.FullName,
                    description = r.Description,
                    starCount = r.StarCount,
                    watcherCount = r.WatcherCount,
                    forkCount = r.ForkCount
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watched repositories");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    // ============ PIN ENDPOINTS ============
    
    /// <summary>
    /// Pin a repository to agent profile (max 6)
    /// </summary>
    [HttpPost("agents/me/pins")]
    public async Task<IActionResult> PinRepository([FromBody] PinRepositoryRequest request)
    {
        try
        {
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
                return Unauthorized(new { error = "Authentication required" });
            
            var repository = await _repositoryService.GetRepositoryAsync(request.Owner, request.Name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            var pin = await _socialService.PinRepositoryAsync(repository.Id, agentId.Value, request.Order);
            
            _logger.LogInformation("Pinned repository: {Owner}/{Name} at order {Order} by agent {AgentId}", 
                request.Owner, request.Name, request.Order, agentId);
            
            return Ok(new
            {
                success = true,
                pin = new
                {
                    order = pin.Order,
                    pinnedAt = pin.PinnedAt,
                    repository = new
                    {
                        id = repository.Id,
                        owner = repository.Owner,
                        name = repository.Name,
                        fullName = repository.FullName,
                        description = repository.Description,
                        starCount = repository.StarCount
                    }
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pinning repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Unpin a repository
    /// </summary>
    [HttpDelete("agents/me/pins/{owner}/{name}")]
    public async Task<IActionResult> UnpinRepository(string owner, string name)
    {
        try
        {
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
                return Unauthorized(new { error = "Authentication required" });
            
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
                return NotFound(new { error = "Repository not found" });
            
            await _socialService.UnpinRepositoryAsync(repository.Id, agentId.Value);
            
            _logger.LogInformation("Unpinned repository: {Owner}/{Name} by agent {AgentId}", 
                owner, name, agentId);
            
            return Ok(new
            {
                success = true,
                message = "Repository unpinned successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unpinning repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get pinned repositories for an agent
    /// </summary>
    [HttpGet("agents/{username}/pins")]
    public async Task<IActionResult> GetPinnedRepositories(string username)
    {
        try
        {
            Guid agentId;
            
            // Support "me" for authenticated users
            if (username == "me")
            {
                var authAgentId = HttpContext.Items["AgentId"] as Guid?;
                if (authAgentId == null)
                    return Unauthorized(new { error = "Authentication required" });
                agentId = authAgentId.Value;
            }
            else
            {
                // Public access by username
                var agent = await _agentService.GetAgentByUsernameAsync(username);
                if (agent == null)
                    return NotFound(new { error = "Agent not found" });
                agentId = agent.Id;
            }
            
            var pins = await _socialService.GetPinnedRepositoriesAsync(agentId);
            
            return Ok(new
            {
                username,
                pins = pins.Select(p => new
                {
                    order = p.Order,
                    pinnedAt = p.PinnedAt,
                    repository = new
                    {
                        id = p.Repository.Id,
                        owner = p.Repository.Owner,
                        name = p.Repository.Name,
                        fullName = p.Repository.FullName,
                        description = p.Repository.Description,
                        starCount = p.Repository.StarCount,
                        watcherCount = p.Repository.WatcherCount,
                        forkCount = p.Repository.ForkCount
                    }
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pinned repositories");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Reorder pinned repositories
    /// </summary>
    [HttpPut("agents/me/pins/reorder")]
    public async Task<IActionResult> ReorderPins([FromBody] ReorderPinsRequest request)
    {
        try
        {
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
                return Unauthorized(new { error = "Authentication required" });
            
            // Convert request to dictionary
            var orderDict = new Dictionary<Guid, int>();
            foreach (var pin in request.Pins)
            {
                var repository = await _repositoryService.GetRepositoryAsync(pin.Owner, pin.Name);
                if (repository != null)
                {
                    orderDict[repository.Id] = pin.Order;
                }
            }
            
            await _socialService.ReorderPinsAsync(agentId.Value, orderDict);
            
            _logger.LogInformation("Reordered pins for agent {AgentId}", agentId);
            
            return Ok(new
            {
                success = true,
                message = "Pins reordered successfully"
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering pins");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public record PinRepositoryRequest(string Owner, string Name, int Order);
public record ReorderPinsRequest(List<PinOrderItem> Pins);
public record PinOrderItem(string Owner, string Name, int Order);
