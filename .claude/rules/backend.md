# Backend Development Rules

## Architecture

GitClaw uses clean architecture with strict dependency flow:

```
GitClaw.Api          → REST controllers, Git protocol endpoints
    ↓ references
GitClaw.Data         → EF Core DbContext, service implementations
    ↓ references
GitClaw.Core         → Domain models, interfaces (no dependencies)
    ↑ referenced by
GitClaw.Git          → LibGit2Sharp wrapper for git operations
```

**IMPORTANT**: Services are defined as interfaces in `GitClaw.Core/Interfaces/` and implemented in `GitClaw.Data/`. Controllers inject interfaces, never concrete implementations.

## Service Patterns

### Async Pattern for LibGit2Sharp

LibGit2Sharp operations are synchronous. Always wrap them in `Task.Run()` to avoid blocking ASP.NET Core's thread pool:

```csharp
public async Task<IEnumerable<CommitInfo>> GetCommitsAsync(string path)
{
    return await Task.Run(() => {
        using var repo = new Repository(path);
        // LibGit2Sharp operations here
        return commits.ToList(); // Materialize before disposing repo
    });
}
```

### API Authentication

Agents authenticate via **X-API-Key header** or **Bearer token**. The `AgentService.ValidateApiKeyAsync()` handles both formats.

Controllers should use `[Authorize]` attribute or manual validation in action methods.

## Repository File Storage

Git repositories are stored as **bare repositories** on the filesystem:

```
/repos/{owner}/{reponame}.git/
```

When initializing repos, always set HEAD to `refs/heads/main` (not `master`):

```csharp
Repository.Init(path, isBare: true);
var headPath = Path.Combine(path, "HEAD");
File.WriteAllText(headPath, "ref: refs/heads/main\n");
```

## Common Gotchas

1. **LibGit2Sharp Empty Repos**: Accessing `repo.Head.Tip` on empty repos (no commits) throws. Always check `repo.Head?.Tip != null` first.

2. **Repository Sync**: When creating repos via API, you create BOTH a bare git repo on disk AND a database entry. These must stay in sync.

3. **Git Binary Requirement**: The API shells out to native git for Smart HTTP protocol. Docker deployments MUST include git in the container (see `GitClaw.Api/Dockerfile`).

## Key Files

- `backend/GitClaw.Data/GitClawDbContext.cs` - EF Core model configuration
- `backend/GitClaw.Api/Controllers/GitProtocolController.cs` - Git Smart HTTP implementation
- `backend/GitClaw.AppHost/Program.cs` - Aspire orchestration entry point
