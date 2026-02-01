using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using GitClaw.Api.Utils;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/repositories/{owner}/{repo}/releases")]
public class ReleasesController : ControllerBase
{
    private readonly IReleaseService _releaseService;
    private readonly IRepositoryService _repositoryService;
    private readonly ILogger<ReleasesController> _logger;
    
    public ReleasesController(
        IReleaseService releaseService,
        IRepositoryService repositoryService,
        ILogger<ReleasesController> logger)
    {
        _releaseService = releaseService;
        _repositoryService = repositoryService;
        _logger = logger;
    }
    
    /// <summary>
    /// Create a new release
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRelease(
        string owner,
        string repo,
        [FromBody] CreateReleaseRequest request)
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
            if (string.IsNullOrWhiteSpace(request.TagName))
            {
                return BadRequest(new { error = "Tag name is required" });
            }
            
            // Sanitize inputs
            var tagName = InputSanitizer.Sanitize(request.TagName);
            var name = request.Name != null ? InputSanitizer.Sanitize(request.Name) : null;
            var body = request.Body != null ? InputSanitizer.Sanitize(request.Body) : null;
            var targetCommitish = request.TargetCommitish != null ? InputSanitizer.Sanitize(request.TargetCommitish) : null;
            
            // Create release
            var release = await _releaseService.CreateReleaseAsync(
                owner,
                repo,
                tagName,
                name,
                body,
                agentId.Value,
                agent.Username,
                request.IsDraft ?? false,
                request.IsPrerelease ?? false,
                targetCommitish);
            
            _logger.LogInformation("Created release {TagName} for {Owner}/{Repo}", 
                tagName, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/releases/tags/{tagName}", new
            {
                id = release.Id,
                tagName = release.TagName,
                name = release.Name,
                body = release.Body,
                isDraft = release.IsDraft,
                isPrerelease = release.IsPrerelease,
                targetCommitish = release.TargetCommitish,
                createdBy = new
                {
                    id = release.CreatedById,
                    name = release.CreatedByName
                },
                createdAt = release.CreatedAt,
                publishedAt = release.PublishedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// List releases for a repository
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListReleases(
        string owner,
        string repo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30)
    {
        try
        {
            // Get authenticated agent (optional for reading releases)
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 30;
            
            // Include drafts only if authenticated as repository owner
            var includeDrafts = agentId.HasValue;
            
            var skip = (page - 1) * pageSize;
            var releases = await _releaseService.ListReleasesAsync(
                owner,
                repo,
                includeDrafts,
                skip,
                pageSize);
            
            return Ok(new
            {
                page,
                pageSize,
                total = releases.Count,
                releases = releases.Select(r => new
                {
                    id = r.Id,
                    tagName = r.TagName,
                    name = r.Name,
                    body = r.Body,
                    isDraft = r.IsDraft,
                    isPrerelease = r.IsPrerelease,
                    targetCommitish = r.TargetCommitish,
                    createdBy = new
                    {
                        id = r.CreatedById,
                        name = r.CreatedByName
                    },
                    createdAt = r.CreatedAt,
                    publishedAt = r.PublishedAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing releases");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get latest release
    /// </summary>
    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestRelease(string owner, string repo)
    {
        try
        {
            var release = await _releaseService.GetLatestReleaseAsync(owner, repo);
            
            if (release == null)
            {
                return NotFound(new { error = "No releases found" });
            }
            
            return Ok(new
            {
                id = release.Id,
                tagName = release.TagName,
                name = release.Name,
                body = release.Body,
                isDraft = release.IsDraft,
                isPrerelease = release.IsPrerelease,
                targetCommitish = release.TargetCommitish,
                createdBy = new
                {
                    id = release.CreatedById,
                    name = release.CreatedByName
                },
                createdAt = release.CreatedAt,
                publishedAt = release.PublishedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting latest release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get release by tag
    /// </summary>
    [HttpGet("tags/{tag}")]
    public async Task<IActionResult> GetReleaseByTag(string owner, string repo, string tag)
    {
        try
        {
            var release = await _releaseService.GetReleaseByTagAsync(owner, repo, tag);
            
            if (release == null)
            {
                return NotFound(new { error = "Release not found" });
            }
            
            // Hide drafts from unauthenticated users
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (release.IsDraft && (!agentId.HasValue || agentId.Value != release.CreatedById))
            {
                return NotFound(new { error = "Release not found" });
            }
            
            return Ok(new
            {
                id = release.Id,
                tagName = release.TagName,
                name = release.Name,
                body = release.Body,
                isDraft = release.IsDraft,
                isPrerelease = release.IsPrerelease,
                targetCommitish = release.TargetCommitish,
                createdBy = new
                {
                    id = release.CreatedById,
                    name = release.CreatedByName
                },
                createdAt = release.CreatedAt,
                publishedAt = release.PublishedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Update a release
    /// </summary>
    [HttpPatch("{releaseId}")]
    public async Task<IActionResult> UpdateRelease(
        string owner,
        string repo,
        Guid releaseId,
        [FromBody] UpdateReleaseRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing release
            var release = await _releaseService.GetReleaseByIdAsync(releaseId);
            if (release == null)
            {
                return NotFound(new { error = "Release not found" });
            }
            
            // Check if agent is the creator
            if (release.CreatedById != agentId.Value)
            {
                return Forbid();
            }
            
            // Sanitize inputs
            var name = request.Name != null ? InputSanitizer.Sanitize(request.Name) : null;
            var body = request.Body != null ? InputSanitizer.Sanitize(request.Body) : null;
            
            // Update release
            var updatedRelease = await _releaseService.UpdateReleaseAsync(
                releaseId,
                name,
                body,
                request.IsDraft,
                request.IsPrerelease);
            
            _logger.LogInformation("Updated release {ReleaseId} for {Owner}/{Repo}", 
                releaseId, owner, repo);
            
            return Ok(new
            {
                id = updatedRelease.Id,
                tagName = updatedRelease.TagName,
                name = updatedRelease.Name,
                body = updatedRelease.Body,
                isDraft = updatedRelease.IsDraft,
                isPrerelease = updatedRelease.IsPrerelease,
                targetCommitish = updatedRelease.TargetCommitish,
                createdBy = new
                {
                    id = updatedRelease.CreatedById,
                    name = updatedRelease.CreatedByName
                },
                createdAt = updatedRelease.CreatedAt,
                publishedAt = updatedRelease.PublishedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Delete a release
    /// </summary>
    [HttpDelete("{releaseId}")]
    public async Task<IActionResult> DeleteRelease(string owner, string repo, Guid releaseId)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing release
            var release = await _releaseService.GetReleaseByIdAsync(releaseId);
            if (release == null)
            {
                return NotFound(new { error = "Release not found" });
            }
            
            // Check if agent is the creator
            if (release.CreatedById != agentId.Value)
            {
                return Forbid();
            }
            
            // Delete release
            await _releaseService.DeleteReleaseAsync(releaseId);
            
            _logger.LogInformation("Deleted release {ReleaseId} for {Owner}/{Repo}", 
                releaseId, owner, repo);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Publish a draft release
    /// </summary>
    [HttpPost("{releaseId}/publish")]
    public async Task<IActionResult> PublishRelease(string owner, string repo, Guid releaseId)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing release
            var release = await _releaseService.GetReleaseByIdAsync(releaseId);
            if (release == null)
            {
                return NotFound(new { error = "Release not found" });
            }
            
            // Check if agent is the creator
            if (release.CreatedById != agentId.Value)
            {
                return Forbid();
            }
            
            // Publish release
            var publishedRelease = await _releaseService.PublishReleaseAsync(releaseId);
            
            _logger.LogInformation("Published release {ReleaseId} for {Owner}/{Repo}", 
                releaseId, owner, repo);
            
            return Ok(new
            {
                id = publishedRelease.Id,
                tagName = publishedRelease.TagName,
                name = publishedRelease.Name,
                body = publishedRelease.Body,
                isDraft = publishedRelease.IsDraft,
                isPrerelease = publishedRelease.IsPrerelease,
                targetCommitish = publishedRelease.TargetCommitish,
                createdBy = new
                {
                    id = publishedRelease.CreatedById,
                    name = publishedRelease.CreatedByName
                },
                createdAt = publishedRelease.CreatedAt,
                publishedAt = publishedRelease.PublishedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing release");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

// Request DTOs
public class CreateReleaseRequest
{
    public string TagName { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Body { get; set; }
    public bool? IsDraft { get; set; }
    public bool? IsPrerelease { get; set; }
    public string? TargetCommitish { get; set; }
}

public class UpdateReleaseRequest
{
    public string? Name { get; set; }
    public string? Body { get; set; }
    public bool? IsDraft { get; set; }
    public bool? IsPrerelease { get; set; }
}
