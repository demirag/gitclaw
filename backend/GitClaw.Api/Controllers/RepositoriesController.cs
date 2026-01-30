using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RepositoriesController : ControllerBase
{
    private readonly IGitService _gitService;
    private readonly ILogger<RepositoriesController> _logger;
    private const string RepositoryBasePath = "/tmp/gitclaw-repos"; // TODO: Make configurable
    
    public RepositoriesController(IGitService gitService, ILogger<RepositoriesController> logger)
    {
        _gitService = gitService;
        _logger = logger;
    }
    
    /// <summary>
    /// Create a new repository
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRepository([FromBody] CreateRepositoryRequest request)
    {
        try
        {
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Owner) || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Owner and name are required" });
            }
            
            // Generate repository path
            var repoPath = Path.Combine(RepositoryBasePath, request.Owner, $"{request.Name}.git");
            
            // Check if already exists
            if (await _gitService.RepositoryExistsAsync(repoPath))
            {
                return Conflict(new { message = "Repository already exists" });
            }
            
            // Initialize repository
            var success = await _gitService.InitializeRepositoryAsync(repoPath);
            
            if (!success)
            {
                return StatusCode(500, new { message = "Failed to initialize repository" });
            }
            
            _logger.LogInformation("Created repository: {Owner}/{Name}", request.Owner, request.Name);
            
            return Created($"/api/repositories/{request.Owner}/{request.Name}", new
            {
                owner = request.Owner,
                name = request.Name,
                fullName = $"{request.Owner}/{request.Name}",
                cloneUrl = $"https://gitclaw.com/{request.Owner}/{request.Name}.git",
                path = repoPath,
                createdAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating repository");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get repository information
    /// </summary>
    [HttpGet("{owner}/{name}")]
    public async Task<IActionResult> GetRepository(string owner, string name)
    {
        try
        {
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            
            if (!await _gitService.RepositoryExistsAsync(repoPath))
            {
                return NotFound(new { message = "Repository not found" });
            }
            
            var stats = await _gitService.GetRepositoryStatsAsync(repoPath);
            
            return Ok(new
            {
                owner,
                name,
                fullName = $"{owner}/{name}",
                cloneUrl = $"https://gitclaw.com/{owner}/{name}.git",
                stats = new
                {
                    commits = stats.CommitCount,
                    branches = stats.BranchCount,
                    size = stats.Size,
                    lastCommit = stats.LastCommit
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting repository");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get commits for a repository
    /// </summary>
    [HttpGet("{owner}/{name}/commits")]
    public async Task<IActionResult> GetCommits(string owner, string name, [FromQuery] int limit = 50)
    {
        try
        {
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            
            if (!await _gitService.RepositoryExistsAsync(repoPath))
            {
                return NotFound(new { message = "Repository not found" });
            }
            
            var commits = await _gitService.GetCommitsAsync(repoPath, limit);
            
            return Ok(commits);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting commits");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get branches for a repository
    /// </summary>
    [HttpGet("{owner}/{name}/branches")]
    public async Task<IActionResult> GetBranches(string owner, string name)
    {
        try
        {
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            
            if (!await _gitService.RepositoryExistsAsync(repoPath))
            {
                return NotFound(new { message = "Repository not found" });
            }
            
            var branches = await _gitService.GetBranchesAsync(repoPath);
            
            return Ok(branches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branches");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
}

public record CreateRepositoryRequest(string Owner, string Name, string? Description = null);
