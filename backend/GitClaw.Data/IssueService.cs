using GitClaw.Core.Interfaces;
using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data;

public class IssueService : IIssueService
{
    private readonly GitClawDbContext _dbContext;
    
    public IssueService(GitClawDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    /// <summary>
    /// Create a new issue
    /// </summary>
    public async Task<Issue> CreateIssueAsync(
        string owner,
        string repositoryName,
        string title,
        string? body,
        Guid authorId,
        string authorName)
    {
        // Get repository
        var repository = await _dbContext.Repositories
            .FirstOrDefaultAsync(r => r.Owner == owner && r.Name == repositoryName);
        
        if (repository == null)
        {
            throw new InvalidOperationException($"Repository {owner}/{repositoryName} not found");
        }
        
        // Get next issue number for this repository
        var lastNumber = await _dbContext.Issues
            .Where(i => i.RepositoryId == repository.Id)
            .OrderByDescending(i => i.Number)
            .Select(i => i.Number)
            .FirstOrDefaultAsync();
        
        var issue = new Issue
        {
            Id = Guid.NewGuid(),
            Number = lastNumber + 1,
            RepositoryId = repository.Id,
            Title = title,
            Body = body,
            AuthorId = authorId,
            AuthorName = authorName,
            Status = IssueStatus.Open,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _dbContext.Issues.Add(issue);
        await _dbContext.SaveChangesAsync();
        
        return issue;
    }
    
    /// <summary>
    /// Get issue by repository and number
    /// </summary>
    public async Task<Issue?> GetIssueAsync(string owner, string repositoryName, int number)
    {
        return await _dbContext.Issues
            .Include(i => i.Repository)
            .Include(i => i.Author)
            .Include(i => i.ClosedBy)
            .FirstOrDefaultAsync(i => 
                i.Repository!.Owner == owner && 
                i.Repository.Name == repositoryName && 
                i.Number == number);
    }
    
    /// <summary>
    /// Get issue by ID
    /// </summary>
    public async Task<Issue?> GetIssueByIdAsync(Guid id)
    {
        return await _dbContext.Issues
            .Include(i => i.Repository)
            .Include(i => i.Author)
            .Include(i => i.ClosedBy)
            .FirstOrDefaultAsync(i => i.Id == id);
    }
    
    /// <summary>
    /// List issues for a repository
    /// </summary>
    public async Task<List<Issue>> ListIssuesAsync(
        string owner,
        string repositoryName,
        IssueStatus? status = null,
        int skip = 0,
        int take = 30)
    {
        var query = _dbContext.Issues
            .Include(i => i.Repository)
            .Include(i => i.Author)
            .Where(i => i.Repository!.Owner == owner && i.Repository.Name == repositoryName);
        
        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }
        
        return await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
    
    /// <summary>
    /// Update an issue
    /// </summary>
    public async Task<Issue> UpdateIssueAsync(Guid issueId, string? title, string? body)
    {
        var issue = await _dbContext.Issues.FindAsync(issueId);
        if (issue == null)
        {
            throw new InvalidOperationException($"Issue {issueId} not found");
        }
        
        if (!string.IsNullOrEmpty(title))
        {
            issue.Title = title;
        }
        
        if (body != null)
        {
            issue.Body = body;
        }
        
        issue.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return issue;
    }
    
    /// <summary>
    /// Close an issue
    /// </summary>
    public async Task<Issue> CloseIssueAsync(Guid issueId, Guid closedById)
    {
        var issue = await _dbContext.Issues.FindAsync(issueId);
        if (issue == null)
        {
            throw new InvalidOperationException($"Issue {issueId} not found");
        }
        
        if (issue.Status == IssueStatus.Closed)
        {
            throw new InvalidOperationException("Issue is already closed");
        }
        
        issue.Status = IssueStatus.Closed;
        issue.ClosedAt = DateTime.UtcNow;
        issue.ClosedById = closedById;
        issue.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return issue;
    }
    
    /// <summary>
    /// Reopen an issue
    /// </summary>
    public async Task<Issue> ReopenIssueAsync(Guid issueId)
    {
        var issue = await _dbContext.Issues.FindAsync(issueId);
        if (issue == null)
        {
            throw new InvalidOperationException($"Issue {issueId} not found");
        }
        
        if (issue.Status == IssueStatus.Open)
        {
            throw new InvalidOperationException("Issue is already open");
        }
        
        issue.Status = IssueStatus.Open;
        issue.ClosedAt = null;
        issue.ClosedById = null;
        issue.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return issue;
    }
    
    /// <summary>
    /// Add a comment to an issue
    /// </summary>
    public async Task<IssueComment> AddCommentAsync(Guid issueId, string body, Guid authorId, string authorName)
    {
        var issue = await _dbContext.Issues.FindAsync(issueId);
        if (issue == null)
        {
            throw new InvalidOperationException($"Issue {issueId} not found");
        }
        
        var comment = new IssueComment
        {
            Id = Guid.NewGuid(),
            IssueId = issueId,
            Body = body,
            AuthorId = authorId,
            AuthorName = authorName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _dbContext.IssueComments.Add(comment);
        
        // Update issue's UpdatedAt timestamp
        issue.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return comment;
    }
    
    /// <summary>
    /// Get comments for an issue
    /// </summary>
    public async Task<List<IssueComment>> GetCommentsAsync(Guid issueId, int skip = 0, int take = 30)
    {
        return await _dbContext.IssueComments
            .Include(c => c.Author)
            .Where(c => c.IssueId == issueId)
            .OrderBy(c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
    
    /// <summary>
    /// Update a comment
    /// </summary>
    public async Task<IssueComment> UpdateCommentAsync(Guid commentId, string body)
    {
        var comment = await _dbContext.IssueComments.FindAsync(commentId);
        if (comment == null)
        {
            throw new InvalidOperationException($"Comment {commentId} not found");
        }
        
        comment.Body = body;
        comment.UpdatedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync();
        
        return comment;
    }
    
    /// <summary>
    /// Delete a comment
    /// </summary>
    public async Task DeleteCommentAsync(Guid commentId)
    {
        var comment = await _dbContext.IssueComments.FindAsync(commentId);
        if (comment == null)
        {
            throw new InvalidOperationException($"Comment {commentId} not found");
        }
        
        _dbContext.IssueComments.Remove(comment);
        await _dbContext.SaveChangesAsync();
    }
}
