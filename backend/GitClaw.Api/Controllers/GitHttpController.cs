using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using GitClaw.Core.Interfaces;

namespace GitClaw.Api.Controllers;

/// <summary>
/// Git HTTP Smart Protocol implementation
/// Handles git clone, push, pull over HTTP
/// </summary>
[ApiController]
public class GitHttpController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly IRepositoryService _repositoryService;
    private readonly ILogger<GitHttpController> _logger;
    private const string RepositoryBasePath = "/tmp/gitclaw-repos";
    
    public GitHttpController(
        IAgentService agentService,
        IRepositoryService repositoryService,
        ILogger<GitHttpController> logger)
    {
        _agentService = agentService;
        _repositoryService = repositoryService;
        _logger = logger;
    }
    
    /// <summary>
    /// Git info/refs endpoint (for git clone/fetch and git push)
    /// </summary>
    [HttpGet("{owner}/{repo}/info/refs")]
    public async Task<IActionResult> GetInfoRefs(string owner, string repo, [FromQuery] string service)
    {
        try
        {
            // Authenticate
            var apiKey = ExtractApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                Response.Headers.Append("WWW-Authenticate", "Basic realm=\"GitClaw\"");
                return Unauthorized();
            }
            
            var agent = await _agentService.ValidateApiKeyAsync(apiKey);
            if (agent == null)
            {
                return Unauthorized();
            }
            
            // Verify repository exists
            var repository = await _repositoryService.GetRepositoryAsync(owner, repo.Replace(".git", ""));
            if (repository == null)
            {
                return NotFound($"Repository {owner}/{repo} not found");
            }
            
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo.Replace(".git", "")}.git");
            
            if (!Directory.Exists(repoPath))
            {
                return NotFound($"Repository path not found: {repoPath}");
            }
            
            // Validate service parameter
            if (service != "git-upload-pack" && service != "git-receive-pack")
            {
                return BadRequest("Invalid service");
            }
            
            _logger.LogInformation("Git info/refs: {Service} for {Owner}/{Repo}", service, owner, repo);
            
            // Run git command to get refs
            var psi = new ProcessStartInfo
            {
                FileName = service,
                Arguments = $"--stateless-rpc --advertise-refs \"{repoPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            
            using var process = Process.Start(psi);
            if (process == null)
            {
                return StatusCode(500, "Failed to start git process");
            }
            
            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();
            
            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                _logger.LogError("Git command failed: {Error}", error);
                return StatusCode(500, "Git command failed");
            }
            
            // Build smart protocol response with proper packet-line format
            var serviceLine = $"# service={service}\n";
            var servicePacket = $"{(serviceLine.Length + 4):x4}{serviceLine}";
            var response = $"{servicePacket}0000{output}";
            
            return Content(response, $"application/x-{service}-advertisement");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetInfoRefs");
            return StatusCode(500, ex.Message);
        }
    }
    
    /// <summary>
    /// Git upload-pack endpoint (for git clone/fetch)
    /// </summary>
    [HttpPost("{owner}/{repo}/git-upload-pack")]
    public async Task<IActionResult> PostUploadPack(string owner, string repo)
    {
        return await ExecuteGitService(owner, repo, "git-upload-pack");
    }
    
    /// <summary>
    /// Git receive-pack endpoint (for git push)
    /// </summary>
    [HttpPost("{owner}/{repo}/git-receive-pack")]
    public async Task<IActionResult> PostReceivePack(string owner, string repo)
    {
        return await ExecuteGitService(owner, repo, "git-receive-pack");
    }
    
    private async Task<IActionResult> ExecuteGitService(string owner, string repo, string service)
    {
        try
        {
            // Authenticate
            var apiKey = ExtractApiKey();
            if (string.IsNullOrEmpty(apiKey))
            {
                Response.Headers.Append("WWW-Authenticate", "Basic realm=\"GitClaw\"");
                return Unauthorized();
            }
            
            var agent = await _agentService.ValidateApiKeyAsync(apiKey);
            if (agent == null)
            {
                return Unauthorized();
            }
            
            // Verify repository exists
            var repository = await _repositoryService.GetRepositoryAsync(owner, repo.Replace(".git", ""));
            if (repository == null)
            {
                return NotFound();
            }
            
            var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo.Replace(".git", "")}.git");
            
            _logger.LogInformation("Git service: {Service} for {Owner}/{Repo}", service, owner, repo);
            
            // Start git service process
            var psi = new ProcessStartInfo
            {
                FileName = service,
                Arguments = $"--stateless-rpc \"{repoPath}\"",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            
            using var process = Process.Start(psi);
            if (process == null)
            {
                return StatusCode(500, "Failed to start git process");
            }
            
            // Stream request body to git process stdin
            await Request.Body.CopyToAsync(process.StandardInput.BaseStream);
            process.StandardInput.Close();
            
            // Stream git process stdout to response
            Response.ContentType = $"application/x-{service}-result";
            await process.StandardOutput.BaseStream.CopyToAsync(Response.Body);
            
            await process.WaitForExitAsync();
            
            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                _logger.LogError("Git service failed: {Error}", error);
            }
            
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ExecuteGitService");
            return StatusCode(500, ex.Message);
        }
    }
    
    private string? ExtractApiKey()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader))
        {
            return null;
        }
        
        // HTTP Basic auth: "Basic base64(username:password)"
        // Password is the API key
        if (authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
                var decodedBytes = Convert.FromBase64String(encodedCredentials);
                var decodedString = System.Text.Encoding.UTF8.GetString(decodedBytes);
                
                // Format: username:api_key
                var parts = decodedString.Split(':', 2);
                if (parts.Length == 2)
                {
                    return parts[1]; // API key is the password
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode Basic auth header");
            }
        }
        
        return null;
    }
}
