using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace GitClaw.Api.Controllers;

/// <summary>
/// Git Smart HTTP Protocol implementation
/// Handles git clone, push, pull, fetch operations
/// </summary>
[ApiController]
[Route("{owner}/{repo}.git")]
public class GitProtocolController : ControllerBase
{
    private readonly ILogger<GitProtocolController> _logger;
    private const string RepositoryBasePath = "/tmp/gitclaw-repos";
    
    public GitProtocolController(ILogger<GitProtocolController> logger)
    {
        _logger = logger;
    }
    
    /// <summary>
    /// GET /owner/repo.git/info/refs?service=git-upload-pack
    /// Used for git clone, fetch, pull
    /// </summary>
    [HttpGet("info/refs")]
    public async Task<IActionResult> GetInfoRefs(string owner, string repo, [FromQuery] string service)
    {
        var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo}.git");
        
        if (!Directory.Exists(repoPath))
        {
            return NotFound("Repository not found");
        }
        
        // Validate service
        if (service != "git-upload-pack" && service != "git-receive-pack")
        {
            return BadRequest("Invalid service");
        }
        
        try
        {
            // Set response headers for git smart HTTP
            Response.Headers.Append("Content-Type", $"application/x-{service}-advertisement");
            Response.Headers.Append("Cache-Control", "no-cache");
            
            // Run git service to get refs
            var processInfo = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = $"{service} --stateless-rpc --advertise-refs \"{repoPath}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = repoPath
            };
            
            using var process = Process.Start(processInfo);
            if (process == null)
            {
                return StatusCode(500, "Failed to start git process");
            }
            
            // Write packet header
            var packetHeader = $"# service={service}\n";
            var packetLength = (packetHeader.Length + 4).ToString("x4");
            await Response.BodyWriter.WriteAsync(System.Text.Encoding.UTF8.GetBytes(packetLength));
            await Response.BodyWriter.WriteAsync(System.Text.Encoding.UTF8.GetBytes(packetHeader));
            await Response.BodyWriter.WriteAsync(System.Text.Encoding.UTF8.GetBytes("0000"));
            
            // Stream git output
            await process.StandardOutput.BaseStream.CopyToAsync(Response.BodyWriter.AsStream());
            await process.WaitForExitAsync();
            
            _logger.LogInformation("Served {Service} refs for {Owner}/{Repo}", service, owner, repo);
            
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving info/refs for {Owner}/{Repo}", owner, repo);
            return StatusCode(500, "Internal server error");
        }
    }
    
    /// <summary>
    /// POST /owner/repo.git/git-upload-pack
    /// Handles git clone, fetch, pull (sending data to client)
    /// </summary>
    [HttpPost("git-upload-pack")]
    public async Task<IActionResult> PostUploadPack(string owner, string repo)
    {
        var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo}.git");
        
        if (!Directory.Exists(repoPath))
        {
            return NotFound("Repository not found");
        }
        
        try
        {
            // Set response headers
            Response.Headers.Append("Content-Type", "application/x-git-upload-pack-result");
            Response.Headers.Append("Cache-Control", "no-cache");
            
            // Run git-upload-pack
            var processInfo = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = $"upload-pack --stateless-rpc \"{repoPath}\"",
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = repoPath
            };
            
            using var process = Process.Start(processInfo);
            if (process == null)
            {
                return StatusCode(500, "Failed to start git process");
            }
            
            // Copy request body to git process stdin
            await Request.Body.CopyToAsync(process.StandardInput.BaseStream);
            process.StandardInput.Close();
            
            // Stream git output to response
            await process.StandardOutput.BaseStream.CopyToAsync(Response.BodyWriter.AsStream());
            await process.WaitForExitAsync();
            
            _logger.LogInformation("Served upload-pack for {Owner}/{Repo}", owner, repo);
            
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in upload-pack for {Owner}/{Repo}", owner, repo);
            return StatusCode(500, "Internal server error");
        }
    }
    
    /// <summary>
    /// POST /owner/repo.git/git-receive-pack
    /// Handles git push (receiving data from client)
    /// </summary>
    [HttpPost("git-receive-pack")]
    public async Task<IActionResult> PostReceivePack(string owner, string repo)
    {
        var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo}.git");
        
        if (!Directory.Exists(repoPath))
        {
            return NotFound("Repository not found");
        }
        
        try
        {
            // Set response headers
            Response.Headers.Append("Content-Type", "application/x-git-receive-pack-result");
            Response.Headers.Append("Cache-Control", "no-cache");
            
            // Run git-receive-pack
            var processInfo = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = $"receive-pack --stateless-rpc \"{repoPath}\"",
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = repoPath
            };
            
            using var process = Process.Start(processInfo);
            if (process == null)
            {
                return StatusCode(500, "Failed to start git process");
            }
            
            // Copy request body to git process stdin
            await Request.Body.CopyToAsync(process.StandardInput.BaseStream);
            process.StandardInput.Close();
            
            // Stream git output to response
            await process.StandardOutput.BaseStream.CopyToAsync(Response.BodyWriter.AsStream());
            await process.WaitForExitAsync();
            
            _logger.LogInformation("Served receive-pack (push) for {Owner}/{Repo}", owner, repo);
            
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in receive-pack for {Owner}/{Repo}", owner, repo);
            return StatusCode(500, "Internal server error");
        }
    }
    
    /// <summary>
    /// GET /owner/repo.git/HEAD
    /// Returns the default branch
    /// </summary>
    [HttpGet("HEAD")]
    public IActionResult GetHead(string owner, string repo)
    {
        var repoPath = Path.Combine(RepositoryBasePath, owner, $"{repo}.git");
        var headPath = Path.Combine(repoPath, "HEAD");
        
        if (!System.IO.File.Exists(headPath))
        {
            return NotFound("Repository not found");
        }
        
        var content = System.IO.File.ReadAllText(headPath);
        return Content(content, "text/plain");
    }
}
