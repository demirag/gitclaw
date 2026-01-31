using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RepositoriesController : ControllerBase
{
    private readonly IGitService _gitService;
    private readonly IRepositoryService _repositoryService;
    private readonly ILogger<RepositoriesController> _logger;
    private const string RepositoryBasePath = "/tmp/gitclaw-repos"; // TODO: Make configurable
    
    public RepositoriesController(
        IGitService gitService, 
        IRepositoryService repositoryService,
        ILogger<RepositoriesController> logger)
    {
        _gitService = gitService;
        _repositoryService = repositoryService;
        _logger = logger;
    }
    
    /// <summary>
    /// List all repositories (with optional filtering)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListRepositories(
        [FromQuery] string? owner = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "CreatedAt")
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;
            
            var skip = (page - 1) * pageSize;
            var (repositories, totalCount) = await _repositoryService.ListRepositoriesAsync(
                owner: owner,
                skip: skip,
                take: pageSize,
                sortBy: sortBy);
            
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            
            return Ok(new
            {
                repositories = repositories.Select(r => new
                {
                    id = r.Id,
                    owner = r.Owner,
                    name = r.Name,
                    fullName = r.FullName,
                    description = r.Description,
                    isPrivate = r.IsPrivate,
                    isArchived = r.IsArchived,
                    defaultBranch = r.DefaultBranch,
                    cloneUrl = r.CloneUrl,
                    size = r.Size,
                    commitCount = r.CommitCount,
                    branchCount = r.BranchCount,
                    starCount = r.StarCount,
                    watcherCount = r.WatcherCount,
                    forkCount = r.ForkCount,
                    createdAt = r.CreatedAt,
                    updatedAt = r.UpdatedAt,
                    lastCommitAt = r.LastCommitAt
                }),
                pagination = new
                {
                    page,
                    pageSize,
                    totalCount,
                    totalPages
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing repositories");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Create a new repository
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRepository([FromBody] CreateRepositoryRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Owner) || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Owner and name are required" });
            }
            
            // Check if already exists
            if (await _repositoryService.ExistsAsync(request.Owner, request.Name))
            {
                return Conflict(new { error = "Repository already exists" });
            }
            
            // Generate repository path
            var repoPath = Path.Combine(RepositoryBasePath, request.Owner, $"{request.Name}.git");
            
            // Initialize git repository
            var success = await _gitService.InitializeRepositoryAsync(repoPath);
            
            if (!success)
            {
                return StatusCode(500, new { error = "Failed to initialize repository" });
            }
            
            // Create database record
            var repository = await _repositoryService.CreateRepositoryAsync(
                request.Owner, 
                request.Name, 
                request.Description,
                agentId);
            
            _logger.LogInformation("Created repository: {Owner}/{Name}", request.Owner, request.Name);
            
            return Created($"/api/repositories/{request.Owner}/{request.Name}", new
            {
                id = repository.Id,
                owner = repository.Owner,
                name = repository.Name,
                fullName = repository.FullName,
                description = repository.Description,
                cloneUrl = repository.CloneUrl,
                path = repoPath,
                createdAt = repository.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating repository");
            return StatusCode(500, new { error = "Internal server error" });
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
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            
            if (repository == null)
            {
                return NotFound(new { error = "Repository not found" });
            }
            
            // Get live stats from git
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            if (await _gitService.RepositoryExistsAsync(repoPath))
            {
                var stats = await _gitService.GetRepositoryStatsAsync(repoPath);
                
                // Update database stats
                await _repositoryService.UpdateStatsAsync(
                    owner, 
                    name, 
                    size: stats.Size,
                    commitCount: stats.CommitCount,
                    branchCount: stats.BranchCount);
                
                // Refresh repository data
                repository = await _repositoryService.GetRepositoryAsync(owner, name);
            }
            
            return Ok(new
            {
                id = repository!.Id,
                owner = repository.Owner,
                name = repository.Name,
                fullName = repository.FullName,
                description = repository.Description,
                isPrivate = repository.IsPrivate,
                isArchived = repository.IsArchived,
                defaultBranch = repository.DefaultBranch,
                cloneUrl = repository.CloneUrl,
                size = repository.Size,
                commitCount = repository.CommitCount,
                branchCount = repository.BranchCount,
                starCount = repository.StarCount,
                watcherCount = repository.WatcherCount,
                forkCount = repository.ForkCount,
                createdAt = repository.CreatedAt,
                updatedAt = repository.UpdatedAt,
                lastCommitAt = repository.LastCommitAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Update repository metadata
    /// </summary>
    [HttpPatch("{owner}/{name}")]
    public async Task<IActionResult> UpdateRepository(
        string owner, 
        string name, 
        [FromBody] UpdateRepositoryRequest request)
    {
        try
        {
            var repository = await _repositoryService.UpdateRepositoryAsync(
                owner, 
                name, 
                description: request.Description,
                isPrivate: request.IsPrivate);
            
            if (repository == null)
            {
                return NotFound(new { error = "Repository not found" });
            }
            
            _logger.LogInformation("Updated repository: {Owner}/{Name}", owner, name);
            
            return Ok(new
            {
                id = repository.Id,
                owner = repository.Owner,
                name = repository.Name,
                fullName = repository.FullName,
                description = repository.Description,
                isPrivate = repository.IsPrivate,
                updatedAt = repository.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Delete repository
    /// </summary>
    [HttpDelete("{owner}/{name}")]
    public async Task<IActionResult> DeleteRepository(string owner, string name)
    {
        try
        {
            // Check if exists in database
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
            {
                return NotFound(new { error = "Repository not found" });
            }
            
            // Delete from database
            await _repositoryService.DeleteRepositoryAsync(owner, name);
            
            // Delete from filesystem
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            if (Directory.Exists(repoPath))
            {
                Directory.Delete(repoPath, recursive: true);
            }
            
            _logger.LogInformation("Deleted repository: {Owner}/{Name}", owner, name);
            
            return Ok(new
            {
                message = "Repository deleted successfully",
                owner,
                name
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get repository statistics
    /// </summary>
    [HttpGet("{owner}/{name}/stats")]
    public async Task<IActionResult> GetRepositoryStats(string owner, string name)
    {
        try
        {
            var repository = await _repositoryService.GetRepositoryAsync(owner, name);
            if (repository == null)
            {
                return NotFound(new { error = "Repository not found" });
            }
            
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            
            if (!await _gitService.RepositoryExistsAsync(repoPath))
            {
                return NotFound(new { error = "Repository files not found" });
            }
            
            var stats = await _gitService.GetRepositoryStatsAsync(repoPath);
            
            // Update database
            await _repositoryService.UpdateStatsAsync(
                owner, 
                name, 
                size: stats.Size,
                commitCount: stats.CommitCount,
                branchCount: stats.BranchCount);
            
            return Ok(new
            {
                owner,
                name,
                fullName = $"{owner}/{name}",
                stats = new
                {
                    commits = stats.CommitCount,
                    branches = stats.BranchCount,
                    size = stats.Size,
                    sizeFormatted = FormatBytes(stats.Size),
                    lastCommit = stats.LastCommit,
                    contributors = 1, // TODO: Implement contributors tracking
                    stars = repository.StarCount
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting repository stats");
            return StatusCode(500, new { error = "Internal server error" });
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
                return NotFound(new { error = "Repository not found" });
            }
            
            var commits = await _gitService.GetCommitsAsync(repoPath, limit);
            
            return Ok(new
            {
                owner,
                name,
                commits
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting commits");
            return StatusCode(500, new { error = "Internal server error" });
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
                return NotFound(new { error = "Repository not found" });
            }
            
            var branches = await _gitService.GetBranchesAsync(repoPath);
            
            return Ok(new
            {
                owner,
                name,
                branches
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branches");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Fork a repository
    /// </summary>
    [HttpPost("{owner}/{name}/fork")]
    public async Task<IActionResult> ForkRepository(string owner, string name)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get agent username from context
            var agent = HttpContext.Items["Agent"] as Agent;
            if (agent == null)
            {
                return Unauthorized(new { error = "Agent not found" });
            }
            
            // Check source repository exists
            var sourceRepo = await _repositoryService.GetRepositoryAsync(owner, name);
            if (sourceRepo == null)
            {
                return NotFound(new { error = "Source repository not found" });
            }
            
            // Generate fork name (use original name if available)
            var forkName = name;
            var counter = 1;
            while (await _repositoryService.ExistsAsync(agent.Username, forkName))
            {
                forkName = $"{name}-{counter}";
                counter++;
            }
            
            // Create fork repository paths
            var sourcePath = Path.Combine(RepositoryBasePath, owner, $"{name}.git");
            var forkPath = Path.Combine(RepositoryBasePath, agent.Username, $"{forkName}.git");
            
            // Clone the source repository
            Directory.CreateDirectory(Path.GetDirectoryName(forkPath)!);
            
            // Use git clone --mirror for bare repository fork
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = $"clone --mirror {sourcePath} {forkPath}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            
            process.Start();
            await process.WaitForExitAsync();
            
            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                _logger.LogError("Fork failed: {Error}", error);
                return StatusCode(500, new { error = "Failed to fork repository" });
            }
            
            // Create database record for fork
            var fork = await _repositoryService.CreateRepositoryAsync(
                agent.Username,
                forkName,
                $"Forked from {owner}/{name}",
                agentId);
            
            _logger.LogInformation("Forked repository: {Source} -> {Fork}", 
                $"{owner}/{name}", $"{agent.Username}/{forkName}");
            
            return Created($"/api/repositories/{agent.Username}/{forkName}", new
            {
                id = fork.Id,
                owner = fork.Owner,
                name = fork.Name,
                fullName = fork.FullName,
                description = fork.Description,
                cloneUrl = fork.CloneUrl,
                forkedFrom = new
                {
                    owner,
                    name,
                    fullName = $"{owner}/{name}"
                },
                createdAt = fork.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forking repository");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Format bytes to human-readable string
    /// </summary>
    private static string FormatBytes(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB", "TB" };
        double len = bytes;
        int order = 0;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len = len / 1024;
        }
        return $"{len:0.##} {sizes[order]}";
    }
}

public record CreateRepositoryRequest(string Owner, string Name, string? Description = null);
public record UpdateRepositoryRequest(string? Description = null, bool? IsPrivate = null);
