using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/repositories/{owner}/{repo}/pulls")]
public class PullRequestsController : ControllerBase
{
    private readonly IPullRequestService _pullRequestService;
    private readonly IRepositoryService _repositoryService;
    private readonly ILogger<PullRequestsController> _logger;
    
    public PullRequestsController(
        IPullRequestService pullRequestService,
        IRepositoryService repositoryService,
        ILogger<PullRequestsController> logger)
    {
        _pullRequestService = pullRequestService;
        _repositoryService = repositoryService;
        _logger = logger;
    }
    
    /// <summary>
    /// Create a new pull request
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePullRequest(
        string owner,
        string repo,
        [FromBody] CreatePullRequestRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            var agent = HttpContext.Items["Agent"] as Agent;
            
            if (agentId == null || agent == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { error = "Title is required" });
            }
            
            if (string.IsNullOrWhiteSpace(request.SourceBranch) || string.IsNullOrWhiteSpace(request.TargetBranch))
            {
                return BadRequest(new { error = "Source and target branches are required" });
            }
            
            // Get repository
            var repository = await _repositoryService.GetRepositoryAsync(owner, repo);
            if (repository == null)
            {
                return NotFound(new { error = "Repository not found" });
            }
            
            // Create pull request
            var pullRequest = await _pullRequestService.CreatePullRequestAsync(
                repository.Id,
                owner,
                repo,
                request.SourceBranch,
                request.TargetBranch,
                request.Title,
                request.Description ?? string.Empty,
                agentId.Value,
                agent.Username);
            
            _logger.LogInformation("Created pull request #{Number} for {Owner}/{Repo}", 
                pullRequest.Number, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/pulls/{pullRequest.Number}", new
            {
                id = pullRequest.Id,
                number = pullRequest.Number,
                title = pullRequest.Title,
                description = pullRequest.Description,
                status = pullRequest.Status.ToString().ToLower(),
                sourceBranch = pullRequest.SourceBranch,
                targetBranch = pullRequest.TargetBranch,
                author = new
                {
                    id = pullRequest.AuthorId,
                    name = pullRequest.AuthorName
                },
                isMergeable = pullRequest.IsMergeable,
                hasConflicts = pullRequest.HasConflicts,
                createdAt = pullRequest.CreatedAt,
                updatedAt = pullRequest.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating pull request");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// List pull requests for a repository
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListPullRequests(
        string owner,
        string repo,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30)
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 30;
            
            // Parse status filter
            PullRequestStatus? statusFilter = null;
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<PullRequestStatus>(status, ignoreCase: true, out var parsedStatus))
                {
                    statusFilter = parsedStatus;
                }
            }
            
            var skip = (page - 1) * pageSize;
            var pullRequests = await _pullRequestService.ListPullRequestsAsync(
                owner,
                repo,
                statusFilter,
                skip,
                pageSize);
            
            return Ok(new
            {
                pullRequests = pullRequests.Select(pr => new
                {
                    id = pr.Id,
                    number = pr.Number,
                    title = pr.Title,
                    description = pr.Description,
                    status = pr.Status.ToString().ToLower(),
                    sourceBranch = pr.SourceBranch,
                    targetBranch = pr.TargetBranch,
                    author = new
                    {
                        id = pr.AuthorId,
                        name = pr.AuthorName
                    },
                    isMergeable = pr.IsMergeable,
                    hasConflicts = pr.HasConflicts,
                    createdAt = pr.CreatedAt,
                    updatedAt = pr.UpdatedAt,
                    mergedAt = pr.MergedAt,
                    closedAt = pr.ClosedAt
                }),
                page,
                pageSize,
                count = pullRequests.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing pull requests");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get a specific pull request
    /// </summary>
    [HttpGet("{number}")]
    public async Task<IActionResult> GetPullRequest(string owner, string repo, int number)
    {
        try
        {
            var pullRequest = await _pullRequestService.GetPullRequestAsync(owner, repo, number);
            
            if (pullRequest == null)
            {
                return NotFound(new { error = "Pull request not found" });
            }
            
            return Ok(new
            {
                id = pullRequest.Id,
                number = pullRequest.Number,
                title = pullRequest.Title,
                description = pullRequest.Description,
                status = pullRequest.Status.ToString().ToLower(),
                sourceBranch = pullRequest.SourceBranch,
                targetBranch = pullRequest.TargetBranch,
                author = new
                {
                    id = pullRequest.AuthorId,
                    name = pullRequest.AuthorName
                },
                isMergeable = pullRequest.IsMergeable,
                hasConflicts = pullRequest.HasConflicts,
                createdAt = pullRequest.CreatedAt,
                updatedAt = pullRequest.UpdatedAt,
                mergedAt = pullRequest.MergedAt,
                mergedBy = pullRequest.MergedBy != null ? new
                {
                    id = pullRequest.MergedBy,
                    name = pullRequest.MergedByName
                } : null,
                closedAt = pullRequest.ClosedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pull request");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Merge a pull request
    /// </summary>
    [HttpPost("{number}/merge")]
    public async Task<IActionResult> MergePullRequest(string owner, string repo, int number)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            var agent = HttpContext.Items["Agent"] as Agent;
            
            if (agentId == null || agent == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            var (success, error) = await _pullRequestService.MergePullRequestAsync(
                owner,
                repo,
                number,
                agentId.Value,
                agent.Username);
            
            if (!success)
            {
                return BadRequest(new { error });
            }
            
            _logger.LogInformation("Merged pull request #{Number} for {Owner}/{Repo} by {Agent}",
                number, owner, repo, agent.Username);
            
            return Ok(new
            {
                message = "Pull request merged successfully",
                number,
                mergedBy = agent.Username,
                mergedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging pull request");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Close a pull request
    /// </summary>
    [HttpPost("{number}/close")]
    public async Task<IActionResult> ClosePullRequest(string owner, string repo, int number)
    {
        try
        {
            var success = await _pullRequestService.ClosePullRequestAsync(owner, repo, number);
            
            if (!success)
            {
                return NotFound(new { error = "Pull request not found or already closed" });
            }
            
            _logger.LogInformation("Closed pull request #{Number} for {Owner}/{Repo}",
                number, owner, repo);
            
            return Ok(new
            {
                message = "Pull request closed successfully",
                number,
                closedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing pull request");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public record CreatePullRequestRequest(
    string Title,
    string? Description,
    string SourceBranch,
    string TargetBranch);
