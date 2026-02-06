# Git Operations Rules

## Dual Git Implementation Strategy

GitClaw uses **two different git implementations** for different purposes:

### 1. LibGit2Sharp (Read Operations)

**Used for:** Reading repositories, commits, trees, diffs, branches

**Location:** `backend/GitClaw.Git/GitService.cs`

**Why?** LibGit2Sharp provides a clean C# API for inspecting git objects without shelling out to native git.

**Example operations:**
- `GetCommitsAsync()` - Read commit history
- `GetTreeAsync()` - Browse repository files
- `GetDiffAsync()` - Calculate diffs between commits

### 2. Native Git Commands (Write Operations)

**Used for:** Git Smart HTTP protocol (clone, push, pull)

**Location:** `backend/GitClaw.Api/Controllers/GitProtocolController.cs`

**Why?** The Smart HTTP protocol requires native `git-receive-pack` and `git-upload-pack` executables. These handle the complex negotiation protocol between client and server.

**Operations:**
- `git-upload-pack` - Handles `git clone` and `git fetch`
- `git-receive-pack` - Handles `git push`

## Git Smart HTTP Protocol

The `GitProtocolController` implements the Git Smart HTTP protocol:

1. **Info/refs endpoint** - Client requests capabilities
2. **Service endpoint** - Client sends packfile, server executes git command

**Request flow:**
```
GET  /:owner/:repo.git/info/refs?service=git-upload-pack
POST /:owner/:repo.git/git-upload-pack
POST /:owner/:repo.git/git-receive-pack
```

## Repository Storage

Repositories are stored as **bare repositories**:
```
/repos/{owner}/{reponame}.git/
```

**Bare repos** don't have a working directory - they only contain git metadata (objects, refs, HEAD).

## Pull Request Implementation

PRs are **database entities** that reference branches in the git repository:

1. **Database**: `PullRequest` table stores metadata (title, description, status)
2. **Git**: Source and target branches exist in the bare repository
3. **Merge**: `PullRequestService` uses LibGit2Sharp to perform the merge when PR is approved

**No git merge commits are created until the PR is merged via API.**

## Common Gotchas

1. **Empty Repository Access**: Always check `repo.Head?.Tip != null` before accessing commits. Empty repos don't have a HEAD tip.

2. **Branch Initialization**: Set HEAD to `refs/heads/main` when initializing repos to avoid master/main branch name mismatches.

3. **Docker Deployment**: The API container MUST include git binaries for Smart HTTP protocol. See `GitClaw.Api/Dockerfile` for proper setup.

4. **LibGit2Sharp Disposal**: Always use `using var repo = new Repository(path)` to ensure proper disposal. Materialize LINQ queries (`.ToList()`) before disposing the repository.

## Key Files

- `backend/GitClaw.Git/GitService.cs` - LibGit2Sharp wrapper service
- `backend/GitClaw.Api/Controllers/GitProtocolController.cs` - Smart HTTP protocol implementation
- `backend/GitClaw.Data/PullRequestService.cs` - PR merge logic using LibGit2Sharp
