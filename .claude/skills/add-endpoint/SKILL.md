---
name: add-endpoint
description: Create a new API endpoint following GitClaw's layered architecture. Use when adding new REST endpoints, API routes, or backend functionality.
---

# Add API Endpoint

Follow GitClaw's layered architecture pattern when creating new API endpoints.

## Steps

### 1. Define the Interface (Core Layer)

Create or update the interface in `backend/GitClaw.Core/Interfaces/`:

```csharp
namespace GitClaw.Core.Interfaces;

public interface IYourService
{
    /// <summary>
    /// Clear, descriptive summary
    /// </summary>
    Task<ReturnType> MethodNameAsync(parameters);
}
```

**Pattern**: All service methods should be async and return `Task<T>`.

### 2. Implement the Service (Data Layer)

Implement in `backend/GitClaw.Data/`:

```csharp
public class YourService : IYourService
{
    private readonly GitClawDbContext _context;

    public YourService(GitClawDbContext context)
    {
        _context = context;
    }

    public async Task<ReturnType> MethodNameAsync(parameters)
    {
        // For LibGit2Sharp operations, use Task.Run():
        return await Task.Run(() => {
            using var repo = new Repository(path);
            // ... LibGit2Sharp operations
            return result.ToList(); // Materialize before disposing
        });
    }
}
```

**Important**:
- Wrap LibGit2Sharp synchronous operations in `Task.Run()`
- Always use `using` for Repository disposal
- Materialize LINQ queries before disposing

### 3. Register the Service

Add to `backend/GitClaw.Api/Program.cs`:

```csharp
builder.Services.AddScoped<IYourService, YourService>();
```

### 4. Create the Controller

Create in `backend/GitClaw.Api/Controllers/`:

```csharp
[ApiController]
[Route("api/[controller]")]
public class YourController : ControllerBase
{
    private readonly IYourService _service;

    public YourController(IYourService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetSomething()
    {
        var result = await _service.MethodNameAsync();
        return Ok(result);
    }
}
```

**Authentication patterns**:
- Use `[Authorize]` attribute for protected endpoints
- Or validate API key manually: `await _agentService.ValidateApiKeyAsync(apiKey)`

### 5. Test the Endpoint

Add test cases to `scripts/test/test-gitclaw.sh`:

```bash
# Test: Your new endpoint
print_test "Your endpoint description"
response=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/your-endpoint" \
  -H "X-API-Key: $API_KEY")
check_response "$response" "200" "Expected data"
```

### 6. Run Tests

```bash
./scripts/test/test-gitclaw.sh
```

## Architecture Reference

See @.claude/rules/backend.md for detailed architecture patterns.

## Checklist

- [ ] Interface defined in `GitClaw.Core/Interfaces/`
- [ ] Service implemented in `GitClaw.Data/`
- [ ] Service registered in `Program.cs`
- [ ] Controller created in `GitClaw.Api/Controllers/`
- [ ] Authentication added if needed
- [ ] Tests added to test suite
- [ ] Tests pass
