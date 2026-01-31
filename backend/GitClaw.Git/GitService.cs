using LibGit2Sharp;
using GitClaw.Core.Interfaces;
using System.Text;

namespace GitClaw.Git;

/// <summary>
/// Git operations service using LibGit2Sharp
/// </summary>
public class GitService : IGitService
{
    public Task<bool> InitializeRepositoryAsync(string path)
    {
        try
        {
            // Ensure directory exists
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
            
            // Initialize bare repository
            Repository.Init(path, isBare: true);
            return Task.FromResult(true);
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
    
    public Task<IEnumerable<CommitInfo>> GetCommitsAsync(string path, int limit = 50)
    {
        try
        {
            using var repo = new Repository(path);
            
            // Check if repository is empty (no HEAD)
            if (repo.Head == null || repo.Head.Tip == null)
            {
                return Task.FromResult(Enumerable.Empty<CommitInfo>());
            }
            
            var commits = repo.Commits
                .Take(limit)
                .Select(c => new CommitInfo
                {
                    Sha = c.Sha,
                    Message = c.MessageShort,
                    Author = c.Author.Name,
                    Email = c.Author.Email,
                    When = c.Author.When.DateTime
                })
                .ToList(); // Materialize the list while repo is in scope
            
            return Task.FromResult(commits.AsEnumerable());
        }
        catch (Exception)
        {
            return Task.FromResult(Enumerable.Empty<CommitInfo>());
        }
    }
    
    public Task<IEnumerable<CommitInfo>> GetCommitsBetweenBranchesAsync(string path, string sourceBranch, string targetBranch)
    {
        try
        {
            using var repo = new Repository(path);
            
            var sourceBranchRef = repo.Branches[sourceBranch];
            var targetBranchRef = repo.Branches[targetBranch];
            
            if (sourceBranchRef == null || targetBranchRef == null)
            {
                return Task.FromResult(Enumerable.Empty<CommitInfo>());
            }
            
            // Get commits that are in source but not in target
            var filter = new CommitFilter
            {
                IncludeReachableFrom = sourceBranchRef.Tip,
                ExcludeReachableFrom = targetBranchRef.Tip
            };
            
            var commits = repo.Commits.QueryBy(filter)
                .Select(c => new CommitInfo
                {
                    Sha = c.Sha,
                    Message = c.MessageShort,
                    Author = c.Author.Name,
                    Email = c.Author.Email,
                    When = c.Author.When.DateTime
                })
                .ToList();
            
            return Task.FromResult(commits.AsEnumerable());
        }
        catch (Exception)
        {
            return Task.FromResult(Enumerable.Empty<CommitInfo>());
        }
    }
    
    public Task<DiffResult> GetDiffBetweenBranchesAsync(string path, string sourceBranch, string targetBranch)
    {
        var result = new DiffResult();
        
        try
        {
            using var repo = new Repository(path);
            
            var sourceBranchRef = repo.Branches[sourceBranch];
            var targetBranchRef = repo.Branches[targetBranch];
            
            if (sourceBranchRef == null || targetBranchRef == null)
            {
                return Task.FromResult(result);
            }
            
            var sourceTree = sourceBranchRef.Tip.Tree;
            var targetTree = targetBranchRef.Tip.Tree;
            
            // Compare target (base) to source (head) - what changes would be applied
            var diff = repo.Diff.Compare<Patch>(targetTree, sourceTree);
            
            foreach (var entry in diff)
            {
                var fileChange = new FileChangeInfo
                {
                    Path = entry.Path,
                    OldPath = entry.OldPath != entry.Path ? entry.OldPath : null,
                    Status = MapChangeKind(entry.Status),
                    Additions = entry.LinesAdded,
                    Deletions = entry.LinesDeleted,
                    Patch = entry.Patch,
                    Hunks = ParseHunks(entry.Patch)
                };
                
                result.Files.Add(fileChange);
                result.TotalAdditions += entry.LinesAdded;
                result.TotalDeletions += entry.LinesDeleted;
            }
            
            result.TotalFilesChanged = result.Files.Count;
            
            return Task.FromResult(result);
        }
        catch (Exception)
        {
            return Task.FromResult(result);
        }
    }
    
    private static FileChangeStatus MapChangeKind(ChangeKind changeKind)
    {
        return changeKind switch
        {
            ChangeKind.Added => FileChangeStatus.Added,
            ChangeKind.Deleted => FileChangeStatus.Deleted,
            ChangeKind.Modified => FileChangeStatus.Modified,
            ChangeKind.Renamed => FileChangeStatus.Renamed,
            ChangeKind.Copied => FileChangeStatus.Copied,
            _ => FileChangeStatus.Modified
        };
    }
    
    private static List<DiffHunk> ParseHunks(string patch)
    {
        var hunks = new List<DiffHunk>();
        if (string.IsNullOrEmpty(patch)) return hunks;
        
        var lines = patch.Split('\n');
        DiffHunk? currentHunk = null;
        int oldLine = 0, newLine = 0;
        
        foreach (var line in lines)
        {
            if (line.StartsWith("@@"))
            {
                // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
                currentHunk = ParseHunkHeader(line);
                if (currentHunk != null)
                {
                    hunks.Add(currentHunk);
                    oldLine = currentHunk.OldStart;
                    newLine = currentHunk.NewStart;
                }
            }
            else if (currentHunk != null)
            {
                var diffLine = new DiffLine { Content = line.Length > 0 ? line.Substring(1) : "" };
                
                if (line.StartsWith("+"))
                {
                    diffLine.Type = DiffLineType.Addition;
                    diffLine.NewLineNumber = newLine++;
                }
                else if (line.StartsWith("-"))
                {
                    diffLine.Type = DiffLineType.Deletion;
                    diffLine.OldLineNumber = oldLine++;
                }
                else if (line.StartsWith(" ") || line.Length == 0)
                {
                    diffLine.Type = DiffLineType.Context;
                    diffLine.OldLineNumber = oldLine++;
                    diffLine.NewLineNumber = newLine++;
                    diffLine.Content = line.Length > 0 ? line.Substring(1) : "";
                }
                else
                {
                    // Skip lines that don't match expected format (like "\ No newline at end of file")
                    continue;
                }
                
                currentHunk.Lines.Add(diffLine);
            }
        }
        
        return hunks;
    }
    
    private static DiffHunk? ParseHunkHeader(string header)
    {
        // Format: @@ -oldStart,oldLines +newStart,newLines @@ optional context
        try
        {
            var match = System.Text.RegularExpressions.Regex.Match(
                header, 
                @"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)");
            
            if (match.Success)
            {
                return new DiffHunk
                {
                    OldStart = int.Parse(match.Groups[1].Value),
                    OldLines = match.Groups[2].Success ? int.Parse(match.Groups[2].Value) : 1,
                    NewStart = int.Parse(match.Groups[3].Value),
                    NewLines = match.Groups[4].Success ? int.Parse(match.Groups[4].Value) : 1,
                    Header = header
                };
            }
        }
        catch { }
        
        return null;
    }
    
    public Task<IEnumerable<string>> GetBranchesAsync(string path)
    {
        try
        {
            using var repo = new Repository(path);
            
            // Return empty list if no branches exist
            if (!repo.Branches.Any())
            {
                return Task.FromResult(Enumerable.Empty<string>());
            }
            
            var branches = repo.Branches.Select(b => b.FriendlyName).ToList();
            return Task.FromResult(branches.AsEnumerable());
        }
        catch (Exception)
        {
            return Task.FromResult(Enumerable.Empty<string>());
        }
    }
    
    public Task<RepositoryStats> GetRepositoryStatsAsync(string path)
    {
        try
        {
            using var repo = new Repository(path);
            
            // Initialize stats with safe defaults
            var stats = new RepositoryStats
            {
                CommitCount = 0,
                BranchCount = repo.Branches.Count(),
                Size = CalculateRepositorySize(path),
                LastCommit = null
            };
            
            // Only count commits if repository has HEAD
            if (repo.Head != null && repo.Head.Tip != null)
            {
                stats.CommitCount = repo.Commits.Count();
                stats.LastCommit = repo.Commits.FirstOrDefault()?.Author.When.DateTime;
            }
            
            return Task.FromResult(stats);
        }
        catch (Exception)
        {
            return Task.FromResult(new RepositoryStats
            {
                CommitCount = 0,
                BranchCount = 0,
                Size = CalculateRepositorySize(path),
                LastCommit = null
            });
        }
    }
    
    public Task<bool> RepositoryExistsAsync(string path)
    {
        try
        {
            return Task.FromResult(Repository.IsValid(path));
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
    
    private static long CalculateRepositorySize(string path)
    {
        try
        {
            var dirInfo = new DirectoryInfo(path);
            return dirInfo.EnumerateFiles("*", SearchOption.AllDirectories)
                .Sum(file => file.Length);
        }
        catch (Exception)
        {
            return 0;
        }
    }
}
