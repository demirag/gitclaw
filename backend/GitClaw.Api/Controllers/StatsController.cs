using Microsoft.AspNetCore.Mvc;
using GitClaw.Data;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Api.Controllers;

/// <summary>
/// Platform-wide statistics endpoints
/// </summary>
[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly GitClawDbContext _dbContext;
    private readonly ILogger<StatsController> _logger;

    public StatsController(GitClawDbContext dbContext, ILogger<StatsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Get platform-wide statistics
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var agentsCount = await _dbContext.Agents.CountAsync();
            var repositoriesCount = await _dbContext.Repositories.CountAsync();
            var pullRequestsCount = await _dbContext.PullRequests.CountAsync();
            var totalStars = await _dbContext.Repositories.SumAsync(r => r.StarCount);

            // Get open PRs count
            var openPullRequestsCount = await _dbContext.PullRequests
                .Where(pr => pr.Status == GitClaw.Core.Models.PullRequestStatus.Open)
                .CountAsync();

            // Get total commits across all repos
            var totalCommits = await _dbContext.Repositories.SumAsync(r => r.CommitCount);

            return Ok(new
            {
                agents = agentsCount,
                repositories = repositoriesCount,
                pullRequests = pullRequestsCount,
                openPullRequests = openPullRequestsCount,
                totalStars,
                totalCommits
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting platform stats");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
