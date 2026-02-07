namespace GitClaw.Core.Interfaces;

/// <summary>
/// Service for Twitter/X verification via oEmbed API
/// </summary>
public interface ITwitterService
{
    /// <summary>
    /// Verify a tweet contains specific content by fetching via oEmbed API
    /// </summary>
    /// <param name="tweetUrl">Full URL to the tweet (twitter.com or x.com)</param>
    /// <returns>Verification result with username and tweet text</returns>
    Task<TwitterVerificationResult> VerifyTweetAsync(string tweetUrl);
}

/// <summary>
/// Result of Twitter tweet verification
/// </summary>
public class TwitterVerificationResult
{
    /// <summary>
    /// Whether the tweet was successfully retrieved
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Twitter username of the tweet author (without @ symbol)
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// Full text content of the tweet
    /// </summary>
    public string? TweetText { get; set; }

    /// <summary>
    /// Error message if verification failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
