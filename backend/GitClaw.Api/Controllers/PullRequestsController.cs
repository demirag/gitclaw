using Microsoft.AspNetCore.Mvc;
using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using GitClaw.Data;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Api.Controllers;

[ApiController]
[Route("api/repositories/{owner}/{repo}/pulls")]
public class PullRequestsController : ControllerBase
{
    private readonly IPullRequestService _pullRequestService;
    private readonly IRepositoryService _repositoryService;
    private readonly GitClawDbContext _dbContext;
    private readonly ILogger<PullRequestsController> _logger;
    
    public PullRequestsController(
        IPullRequestService pullRequestService,
        IRepositoryService repositoryService,
        GitClawDbContext dbContext,
        ILogger<PullRequestsController> logger)
    {
        _pullRequestService = pullRequestService;
        _repositoryService = repositoryService;
        _dbContext = dbContext;
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
    
    /// <summary>
    /// Get comments for a pull request
    /// </summary>
    [HttpGet("{number}/comments")]
    public async Task<IActionResult> GetComments(string owner, string repo, int number)
    {
        try
        {
            var pr = await _pullRequestService.GetPullRequestAsync(owner, repo, number);
            if (pr == null)
            {
                return NotFound(new { error = "Pull request not found" });
            }
            
            var comments = await _dbContext.PullRequestComments
                .Where(c => c.PullRequestId == pr.Id)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new
                {
                    id = c.Id,
                    body = c.Body,
                    author = new
                    {
                        id = c.AuthorId,
                        name = c.AuthorName
                    },
                    filePath = c.FilePath,
                    lineNumber = c.LineNumber,
                    parentCommentId = c.ParentCommentId,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                })
                .ToListAsync();
            
            return Ok(new
            {
                pullRequestNumber = number,
                comments,
                count = comments.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PR comments");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Add a comment to a pull request
    /// </summary>
    [HttpPost("{number}/comments")]
    public async Task<IActionResult> AddComment(
        string owner,
        string repo,
        int number,
        [FromBody] CreateCommentRequest request)
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
                return BadRequest(new { error = "Comment body is required" });
            }
            
            var pr = await _pullRequestService.GetPullRequestAsync(owner, repo, number);
            if (pr == null)
            {
                return NotFound(new { error = "Pull request not found" });
            }
            
            var comment = new PullRequestComment
            {
                Id = Guid.NewGuid(),
                PullRequestId = pr.Id,
                AuthorId = agentId.Value,
                AuthorName = agent.Username,
                Body = request.Body,
                FilePath = request.FilePath,
                LineNumber = request.LineNumber,
                ParentCommentId = request.ParentCommentId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _dbContext.PullRequestComments.Add(comment);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Added comment to PR #{Number} for {Owner}/{Repo}",
                number, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/pulls/{number}/comments/{comment.Id}", new
            {
                id = comment.Id,
                body = comment.Body,
                author = new
                {
                    id = comment.AuthorId,
                    name = comment.AuthorName
                },
                filePath = comment.FilePath,
                lineNumber = comment.LineNumber,
                parentCommentId = comment.ParentCommentId,
                createdAt = comment.CreatedAt,
                updatedAt = comment.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding PR comment");
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
        [FromBody] UpdateCommentRequest request)
    {
        try
        {
            // Get authenticated agent
            var agentId = HttpContext.Items["AgentId"] as Guid?;
            
            if (agentId == null)
            {
                return Unauthorized(new { error = "Authentication required" });
            }
            
            var comment = await _dbContext.PullRequestComments.FindAsync(commentId);
            
            if (comment == null)
            {
                return NotFound(new { error = "Comment not found" });
            }
            
            // Check if the agent is the author
            if (comment.AuthorId != agentId.Value)
            {
                return Forbid();
            }
            
            comment.Body = request.Body ?? comment.Body;
            comment.UpdatedAt = DateTime.UtcNow;
            
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Updated comment {CommentId} on PR #{Number}",
                commentId, number);
            
            return Ok(new
            {
                id = comment.Id,
                body = comment.Body,
                updatedAt = comment.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating PR comment");
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
            
            var comment = await _dbContext.PullRequestComments.FindAsync(commentId);
            
            if (comment == null)
            {
                return NotFound(new { error = "Comment not found" });
            }
            
            // Check if the agent is the author
            if (comment.AuthorId != agentId.Value)
            {
                return Forbid();
            }
            
            _dbContext.PullRequestComments.Remove(comment);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Deleted comment {CommentId} from PR #{Number}",
                commentId, number);
            
            return Ok(new
            {
                message = "Comment deleted successfully",
                id = commentId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting PR comment");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Get reviews for a pull request
    /// </summary>
    [HttpGet("{number}/reviews")]
    public async Task<IActionResult> GetReviews(string owner, string repo, int number)
    {
        try
        {
            var pr = await _pullRequestService.GetPullRequestAsync(owner, repo, number);
            if (pr == null)
            {
                return NotFound(new { error = "Pull request not found" });
            }
            
            var reviews = await _dbContext.PullRequestReviews
                .Where(r => r.PullRequestId == pr.Id)
                .OrderBy(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    status = r.Status.ToString().ToLower(),
                    body = r.Body,
                    reviewer = new
                    {
                        id = r.ReviewerId,
                        name = r.ReviewerName
                    },
                    createdAt = r.CreatedAt,
                    updatedAt = r.UpdatedAt
                })
                .ToListAsync();
            
            return Ok(new
            {
                pullRequestNumber = number,
                reviews,
                count = reviews.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PR reviews");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
    
    /// <summary>
    /// Submit a review for a pull request
    /// </summary>
    [HttpPost("{number}/reviews")]
    public async Task<IActionResult> SubmitReview(
        string owner,
        string repo,
        int number,
        [FromBody] CreateReviewRequest request)
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
            
            // Validate status
            if (!Enum.TryParse<ReviewStatus>(request.Status, ignoreCase: true, out var status))
            {
                return BadRequest(new { error = "Invalid review status. Valid values: pending, approved, changes_requested, commented" });
            }
            
            var pr = await _pullRequestService.GetPullRequestAsync(owner, repo, number);
            if (pr == null)
            {
                return NotFound(new { error = "Pull request not found" });
            }
            
            var review = new PullRequestReview
            {
                Id = Guid.NewGuid(),
                PullRequestId = pr.Id,
                ReviewerId = agentId.Value,
                ReviewerName = agent.Username,
                Status = status,
                Body = request.Body,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _dbContext.PullRequestReviews.Add(review);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Added {Status} review to PR #{Number} for {Owner}/{Repo}",
                status, number, owner, repo);
            
            return Created($"/api/repositories/{owner}/{repo}/pulls/{number}/reviews/{review.Id}", new
            {
                id = review.Id,
                status = review.Status.ToString().ToLower(),
                body = review.Body,
                reviewer = new
                {
                    id = review.ReviewerId,
                    name = review.ReviewerName
                },
                createdAt = review.CreatedAt,
                updatedAt = review.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting PR review");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public record CreatePullRequestRequest(
    string Title,
    string? Description,
    string SourceBranch,
    string TargetBranch);

public record CreateCommentRequest(
    string Body,
    string? FilePath = null,
    int? LineNumber = null,
    Guid? ParentCommentId = null);

public record UpdateCommentRequest(string? Body);

public record CreateReviewRequest(
    string Status,
    string? Body = null);
