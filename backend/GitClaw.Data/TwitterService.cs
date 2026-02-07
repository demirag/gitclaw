using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Web;
using GitClaw.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace GitClaw.Data;

/// <summary>
/// Service for verifying Twitter/X tweets using the free oEmbed API
/// </summary>
public class TwitterService : ITwitterService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TwitterService> _logger;
    private const string OEmbedEndpoint = "https://publish.twitter.com/oembed";

    public TwitterService(HttpClient httpClient, ILogger<TwitterService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Verify a tweet by fetching it via Twitter's oEmbed API
    /// </summary>
    public async Task<TwitterVerificationResult> VerifyTweetAsync(string tweetUrl)
    {
        try
        {
            // Validate and normalize the tweet URL
            if (!IsValidTweetUrl(tweetUrl, out var normalizedUrl))
            {
                return new TwitterVerificationResult
                {
                    Success = false,
                    ErrorMessage = "Invalid tweet URL format. Expected: https://twitter.com/user/status/123 or https://x.com/user/status/123"
                };
            }

            // Call Twitter oEmbed API
            var encodedUrl = HttpUtility.UrlEncode(normalizedUrl);
            var oembedUrl = $"{OEmbedEndpoint}?url={encodedUrl}&omit_script=true";

            _logger.LogInformation("Fetching tweet via oEmbed: {Url}", normalizedUrl);

            var response = await _httpClient.GetAsync(oembedUrl);

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    return new TwitterVerificationResult
                    {
                        Success = false,
                        ErrorMessage = "Tweet not found. It may be deleted, from a private account, or the URL is incorrect."
                    };
                }

                _logger.LogWarning("oEmbed API returned {StatusCode} for {Url}",
                    response.StatusCode, normalizedUrl);

                return new TwitterVerificationResult
                {
                    Success = false,
                    ErrorMessage = $"Failed to fetch tweet: HTTP {response.StatusCode}"
                };
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var oembedData = JsonSerializer.Deserialize<OEmbedResponse>(jsonContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (oembedData == null)
            {
                return new TwitterVerificationResult
                {
                    Success = false,
                    ErrorMessage = "Failed to parse Twitter oEmbed response"
                };
            }

            // Extract tweet text from HTML
            var tweetText = ExtractTweetTextFromHtml(oembedData.Html);

            _logger.LogInformation("Successfully verified tweet from @{Username}",
                oembedData.AuthorName);

            return new TwitterVerificationResult
            {
                Success = true,
                Username = oembedData.AuthorName,
                TweetText = tweetText
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while fetching tweet: {Url}", tweetUrl);
            return new TwitterVerificationResult
            {
                Success = false,
                ErrorMessage = "Network error while fetching tweet. Please check your connection and try again."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while verifying tweet: {Url}", tweetUrl);
            return new TwitterVerificationResult
            {
                Success = false,
                ErrorMessage = "An unexpected error occurred while verifying the tweet."
            };
        }
    }

    /// <summary>
    /// Validate tweet URL format and normalize to twitter.com
    /// </summary>
    private bool IsValidTweetUrl(string tweetUrl, out string normalizedUrl)
    {
        normalizedUrl = string.Empty;

        if (string.IsNullOrWhiteSpace(tweetUrl))
        {
            return false;
        }

        // Support both twitter.com and x.com, with or without mobile/www prefixes
        var regex = new Regex(
            @"^https?://(?:www\.|mobile\.)?(?:twitter\.com|x\.com)/(\w+)/status/(\d+)",
            RegexOptions.IgnoreCase);

        var match = regex.Match(tweetUrl);
        if (!match.Success)
        {
            return false;
        }

        var username = match.Groups[1].Value;
        var tweetId = match.Groups[2].Value;

        // Normalize to twitter.com format (oEmbed works with both, but standardize)
        normalizedUrl = $"https://twitter.com/{username}/status/{tweetId}";
        return true;
    }

    /// <summary>
    /// Extract tweet text from oEmbed HTML response
    /// </summary>
    private string ExtractTweetTextFromHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        // The oEmbed HTML contains the tweet text within <p> tags
        // Example: <p lang="en" dir="ltr">Tweet text here</p>
        var textRegex = new Regex(@"<p[^>]*>(.*?)</p>", RegexOptions.Singleline);
        var match = textRegex.Match(html);

        if (!match.Success)
        {
            // Fallback: try to extract any text content
            var stripHtml = new Regex(@"<[^>]+>", RegexOptions.Singleline);
            return HttpUtility.HtmlDecode(stripHtml.Replace(html, " ").Trim());
        }

        var tweetText = match.Groups[1].Value;

        // Remove HTML tags (links, etc.)
        var stripTags = new Regex(@"<[^>]+>", RegexOptions.Singleline);
        tweetText = stripTags.Replace(tweetText, " ");

        // Decode HTML entities
        tweetText = HttpUtility.HtmlDecode(tweetText);

        // Clean up whitespace
        tweetText = Regex.Replace(tweetText, @"\s+", " ").Trim();

        return tweetText;
    }

    /// <summary>
    /// Twitter oEmbed API response model
    /// </summary>
    private class OEmbedResponse
    {
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorUrl { get; set; } = string.Empty;
        public string Html { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }
}
