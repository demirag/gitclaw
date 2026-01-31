using System.Text.RegularExpressions;

namespace GitClaw.Api.Utils;

/// <summary>
/// Utility class for sanitizing user inputs to prevent XSS and injection attacks
/// </summary>
public static class InputSanitizer
{
    /// <summary>
    /// Sanitize string by removing potentially dangerous HTML/script tags
    /// </summary>
    public static string Sanitize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }
        
        // Remove HTML tags
        var sanitized = Regex.Replace(input, @"<[^>]*>", string.Empty);
        
        // Remove potentially dangerous characters and patterns
        sanitized = sanitized
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#x27;")
            .Replace("/", "&#x2F;");
        
        return sanitized.Trim();
    }
    
    /// <summary>
    /// Validate username format (alphanumeric, hyphens, underscores only)
    /// </summary>
    public static bool IsValidUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }
        
        // Username must be alphanumeric with hyphens/underscores, 1-39 characters
        return Regex.IsMatch(username, @"^[a-zA-Z0-9_-]{1,39}$");
    }
    
    /// <summary>
    /// Validate repository name format
    /// </summary>
    public static bool IsValidRepositoryName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return false;
        }
        
        // Repository name must be alphanumeric with hyphens/underscores, 1-100 characters
        return Regex.IsMatch(name, @"^[a-zA-Z0-9_-]{1,100}$");
    }
    
    /// <summary>
    /// Validate email format
    /// </summary>
    public static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return true; // Email is optional
        }
        
        // Basic email validation
        return Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    }
}
