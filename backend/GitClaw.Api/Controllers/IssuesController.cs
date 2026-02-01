using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using GitClaw.Api.Utils;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/repositories/{owner}/{repo}/issues")]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _issueService;
    private readonly IRepositoryService _repositoryService;
    private readonly ILogger<IssuesController> _logger;
    
    public IssuesController(
        IIssueService issueService,
        IRepositoryService repositoryService,
        ILogger<IssuesController> logger)
    {
        _issueService = issueService;
        _repositoryService = repositoryService;
        _logger = logger;
    }
    
    /// <summary>
    /// Create a new issue
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateIssue(
        string owner,
        string repo,
        [FromBody] CreateIssueRequest request)
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
            
            // Sanitize inputs
            var title = InputSanitizer.Sanitize(request.Title);
            var body = request.Body != null ? InputSanitizer.Sanitize(request.Body) : null;
            
            // Create issue
            var issue = await _issueService.CreateIssueAsync(
                owner,
                repo,
                title,
                body,
                agentId.Value,
                agent.Username);
            
            _logger.LogInformation("Created issue #{Number} for {Owner}/{Repo}", 
                issue.Number, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/issues/{issue.Number}", new
            {
                id = issue.Id,
                number = issue.Number,
                title = issue.Title,
                body = issue.Body,
                status = issue.Status.ToString().ToLower(),
                author = new
                {
                    id = issue.AuthorId,
                    name = issue.AuthorName
                },
                createdAt = issue.CreatedAt,
                updatedAt = issue.UpdatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating issue");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// List issues for a repository
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListIssues(
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
            IssueStatus? statusFilter = null;
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<IssueStatus>(status, ignoreCase: true, out var parsedStatus))
                {
                    statusFilter = parsedStatus;
                }
            }
            
            var skip = (page - 1) * pageSize;
            var issues = await _issueService.ListIssuesAsync(
                owner,
                repo,
                statusFilter,
                skip,
                pageSize);
            
            return Ok(new
            {
                page,
                pageSize,
                total = issues.Count,
                issues = issues.Select(i => new
                {
                    id = i.Id,
                    number = i.Number,
                    title = i.Title,
                    body = i.Body,
                    status = i.Status.ToString().ToLower(),
                    author = new
                    {
                        id = i.AuthorId,
                        name = i.AuthorName
                    },
                    createdAt = i.CreatedAt,
                    updatedAt = i.UpdatedAt,
                    closedAt = i.ClosedAt,
                    closedById = i.ClosedById
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing issues");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get a specific issue
    /// </summary>
    [HttpGet("{number}")]
    public async Task<IActionResult> GetIssue(string owner, string repo, int number)
    {
        try
        {
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            return Ok(new
            {
                id = issue.Id,
                number = issue.Number,
                title = issue.Title,
                body = issue.Body,
                status = issue.Status.ToString().ToLower(),
                author = new
                {
                    id = issue.AuthorId,
                    name = issue.AuthorName
                },
                createdAt = issue.CreatedAt,
                updatedAt = issue.UpdatedAt,
                closedAt = issue.ClosedAt,
                closedById = issue.ClosedById
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting issue");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Update an issue
    /// </summary>
    [HttpPatch("{number}")]
    public async Task<IActionResult> UpdateIssue(
        string owner,
        string repo,
        int number,
        [FromBody] UpdateIssueRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing issue
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Check if agent is the author
            if (issue.AuthorId != agentId.Value)
            {
                return Forbid();
            }
            
            // Sanitize inputs
            var title = request.Title != null ? InputSanitizer.Sanitize(request.Title) : null;
            var body = request.Body != null ? InputSanitizer.Sanitize(request.Body) : null;
            
            // Update issue
            var updatedIssue = await _issueService.UpdateIssueAsync(issue.Id, title, body);
            
            _logger.LogInformation("Updated issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return Ok(new
            {
                id = updatedIssue.Id,
                number = updatedIssue.Number,
                title = updatedIssue.Title,
                body = updatedIssue.Body,
                status = updatedIssue.Status.ToString().ToLower(),
                author = new
                {
                    id = updatedIssue.AuthorId,
                    name = updatedIssue.AuthorName
                },
                createdAt = updatedIssue.CreatedAt,
                updatedAt = updatedIssue.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating issue");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Close an issue
    /// </summary>
    [HttpPost("{number}/close")]
    public async Task<IActionResult> CloseIssue(string owner, string repo, int number)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing issue
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Close issue
            var closedIssue = await _issueService.CloseIssueAsync(issue.Id, agentId.Value);
            
            _logger.LogInformation("Closed issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return Ok(new
            {
                id = closedIssue.Id,
                number = closedIssue.Number,
                title = closedIssue.Title,
                status = closedIssue.Status.ToString().ToLower(),
                closedAt = closedIssue.ClosedAt,
                closedById = closedIssue.ClosedById
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing issue");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Reopen an issue
    /// </summary>
    [HttpPost("{number}/reopen")]
    public async Task<IActionResult> ReopenIssue(string owner, string repo, int number)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing issue
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Reopen issue
            var reopenedIssue = await _issueService.ReopenIssueAsync(issue.Id);
            
            _logger.LogInformation("Reopened issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return Ok(new
            {
                id = reopenedIssue.Id,
                number = reopenedIssue.Number,
                title = reopenedIssue.Title,
                status = reopenedIssue.Status.ToString().ToLower(),
                closedAt = reopenedIssue.ClosedAt,
                closedById = reopenedIssue.ClosedById
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reopening issue");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Add a comment to an issue
    /// </summary>
    [HttpPost("{number}/comments")]
    public async Task<IActionResult> AddComment(
        string owner,
        string repo,
        int number,
        [FromBody] CreateIssueCommentRequest request)
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
            if (string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest(new { error = "Body is required" });
            }
            
            // Get existing issue
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Sanitize input
            var body = InputSanitizer.Sanitize(request.Body);
            
            // Add comment
            var comment = await _issueService.AddCommentAsync(
                issue.Id,
                body,
                agentId.Value,
                agent.Username);
            
            _logger.LogInformation("Added comment to issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/issues/{number}/comments/{comment.Id}", new
            {
                id = comment.Id,
                issueId = comment.IssueId,
                body = comment.Body,
                author = new
                {
                    id = comment.AuthorId,
                    name = comment.AuthorName
                },
                createdAt = comment.CreatedAt,
                updatedAt = comment.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get comments for an issue
    /// </summary>
    [HttpGet("{number}/comments")]
    public async Task<IActionResult> GetComments(
        string owner,
        string repo,
        int number,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30)
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 30;
            
            // Get existing issue
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            var skip = (page - 1) * pageSize;
            var comments = await _issueService.GetCommentsAsync(issue.Id, skip, pageSize);
            
            return Ok(new
            {
                page,
                pageSize,
                total = comments.Count,
                comments = comments.Select(c => new
                {
                    id = c.Id,
                    issueId = c.IssueId,
                    body = c.Body,
                    author = new
                    {
                        id = c.AuthorId,
                        name = c.AuthorName
                    },
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting comments");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Update a comment
    /// </summary>
    [HttpPatch("{number}/comments/{commentId}")]
    public async Task<IActionResult> UpdateComment(
        string owner,
        string repo,
        int number,
        Guid commentId,
        [FromBody] UpdateIssueCommentRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Body))
            {
                return BadRequest(new { error = "Body is required" });
            }
            
            // Get existing issue (to verify it exists)
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Get all comments to find and verify the comment
            var comments = await _issueService.GetCommentsAsync(issue.Id, 0, 1000);
            var existingComment = comments.FirstOrDefault(c => c.Id == commentId);
            
            if (existingComment == null)
            {
                return NotFound(new { error = "Comment not found" });
            }
            
            // Check if agent is the author
            if (existingComment.AuthorId != agentId.Value)
            {
                return Forbid();
            }
            
            // Sanitize input
            var body = InputSanitizer.Sanitize(request.Body);
            
            // Update comment
            var updatedComment = await _issueService.UpdateCommentAsync(commentId, body);
            
            _logger.LogInformation("Updated comment on issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return Ok(new
            {
                id = updatedComment.Id,
                issueId = updatedComment.IssueId,
                body = updatedComment.Body,
                author = new
                {
                    id = updatedComment.AuthorId,
                    name = updatedComment.AuthorName
                },
                createdAt = updatedComment.CreatedAt,
                updatedAt = updatedComment.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating comment");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Delete a comment
    /// </summary>
    [HttpDelete("{number}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(
        string owner,
        string repo,
        int number,
        Guid commentId)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            // Get existing issue (to verify it exists)
            var issue = await _issueService.GetIssueAsync(owner, repo, number);
            if (issue == null)
            {
                return NotFound(new { error = "Issue not found" });
            }
            
            // Get all comments to find and verify the comment
            var comments = await _issueService.GetCommentsAsync(issue.Id, 0, 1000);
            var existingComment = comments.FirstOrDefault(c => c.Id == commentId);
            
            if (existingComment == null)
            {
                return NotFound(new { error = "Comment not found" });
            }
            
            // Check if agent is the author
            if (existingComment.AuthorId != agentId.Value)
            {
                return Forbid();
            }
            
            // Delete comment
            await _issueService.DeleteCommentAsync(commentId);
            
            _logger.LogInformation("Deleted comment on issue #{Number} for {Owner}/{Repo}", 
                number, owner, repo);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

// Request DTOs
public class CreateIssueRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
}

public class UpdateIssueRequest
{
    public string? Title { get; set; }
    public string? Body { get; set; }
}

public class CreateIssueCommentRequest
{
    public string Body { get; set; } = string.Empty;
}

public class UpdateIssueCommentRequest
{
    public string Body { get; set; } = string.Empty;
}
