namespace GitClaw.Core.Configuration;

public class GitStorageOptions
{
    public const string SectionName = "GitStorage";

    /// <summary>
    /// Base path for git repository storage.
    /// Repositories are stored at: {BasePath}/{owner}/{name}.git
    /// </summary>
    public string BasePath { get; set; } = "/data/gitclaw-repos";

    public string GetRepositoryPath(string owner, string name)
        => Path.Combine(BasePath, owner, $"{name}.git");
}
