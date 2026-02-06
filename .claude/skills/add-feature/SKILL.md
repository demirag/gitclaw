---
name: add-feature
description: Complete workflow for adding a new feature to GitClaw including backend, frontend, and tests. Use when implementing new functionality that spans multiple layers.
---

# Add Complete Feature

End-to-end workflow for adding a new feature to GitClaw.

## Overview

This skill guides you through implementing a feature that spans:
1. Backend (API + Service + Database)
2. Frontend (UI + State Management)
3. Tests

## Phase 1: Backend Implementation

### 1. Define Data Model (if needed)

Create entity in `backend/GitClaw.Core/Models/`:

```csharp
namespace GitClaw.Core.Models;

public class YourEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Guid AgentId { get; set; }
    public Agent Agent { get; set; } = null!;
}
```

### 2. Create Database Migration

See `/db-migration` skill for detailed guide:

```bash
cd backend/GitClaw.Data
dotnet ef migrations add AddYourEntityFeature --startup-project ../GitClaw.Api
dotnet ef database update --startup-project ../GitClaw.Api
```

### 3. Add to DbContext

Update `backend/GitClaw.Data/GitClawDbContext.cs`:

```csharp
public DbSet<YourEntity> YourEntities { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<YourEntity>()
        .HasOne(e => e.Agent)
        .WithMany()
        .HasForeignKey(e => e.AgentId);
}
```

### 4. Create Service Interface

See `/add-endpoint` skill, or create in `backend/GitClaw.Core/Interfaces/`:

```csharp
public interface IYourService
{
    Task<YourEntity> CreateAsync(string name, Guid agentId);
    Task<YourEntity?> GetByIdAsync(Guid id);
    Task<List<YourEntity>> ListAsync(Guid? agentId = null);
    Task<bool> DeleteAsync(Guid id, Guid requestingAgentId);
}
```

### 5. Implement Service

In `backend/GitClaw.Data/YourService.cs`:

```csharp
public class YourService : IYourService
{
    private readonly GitClawDbContext _context;

    public YourService(GitClawDbContext context)
    {
        _context = context;
    }

    public async Task<YourEntity> CreateAsync(string name, Guid agentId)
    {
        var entity = new YourEntity
        {
            Id = Guid.NewGuid(),
            Name = name,
            AgentId = agentId,
            CreatedAt = DateTime.UtcNow
        };

        _context.YourEntities.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    // ... other methods
}
```

### 6. Register Service

In `backend/GitClaw.Api/Program.cs`:

```csharp
builder.Services.AddScoped<IYourService, YourService>();
```

### 7. Create Controller

In `backend/GitClaw.Api/Controllers/YourController.cs`:

```csharp
[ApiController]
[Route("api/[controller]")]
public class YourController : ControllerBase
{
    private readonly IYourService _service;
    private readonly IAgentService _agentService;

    public YourController(IYourService service, IAgentService agentService)
    {
        _service = service;
        _agentService = agentService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequest request)
    {
        // Validate API key
        var apiKey = Request.Headers["X-API-Key"].FirstOrDefault();
        var agent = await _agentService.ValidateApiKeyAsync(apiKey);
        if (agent == null) return Unauthorized();

        var result = await _service.CreateAsync(request.Name, agent.Id);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? agentId = null)
    {
        var results = await _service.ListAsync(agentId);
        return Ok(results);
    }
}
```

## Phase 2: Frontend Implementation

### 1. Create API Service

See `/add-page` skill, or create in `frontend/src/services/yourService.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5113';

export interface YourEntity {
  id: string;
  name: string;
  createdAt: string;
  agentId: string;
}

export const yourService = {
  async list(agentId?: string) {
    const params = agentId ? { agentId } : {};
    const response = await axios.get<YourEntity[]>(
      `${API_BASE_URL}/api/your`,
      { params }
    );
    return response.data;
  },

  async create(name: string) {
    const response = await axios.post<YourEntity>(
      `${API_BASE_URL}/api/your`,
      { name }
    );
    return response.data;
  }
};
```

### 2. Create Page Component

In `frontend/src/pages/YourPage.tsx`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { yourService } from '../services/yourService';
import { useState } from 'react';

export default function YourPage() {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['your-entities'],
    queryFn: () => yourService.list()
  });

  const createMutation = useMutation({
    mutationFn: yourService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['your-entities'] });
      setName('');
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Feature</h1>

      {/* Create form */}
      <div className="mb-8">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="border px-4 py-2 rounded"
        />
        <button
          onClick={() => createMutation.mutate(name)}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {items?.map(item => (
            <div key={item.id} className="border p-4 rounded">
              <h3 className="font-bold">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Add Route

In `frontend/src/App.tsx`:

```typescript
import YourPage from './pages/YourPage';

// Add route:
<Route path="/your-feature" element={<YourPage />} />
```

### 4. Add Navigation

In `frontend/src/components/layout/Header.tsx`:

```typescript
<Link to="/your-feature" className="nav-link">
  Your Feature
</Link>
```

## Phase 3: Testing

### 1. Add Backend Tests

Update `scripts/test/test-gitclaw.sh`:

```bash
print_section "Your Feature Tests"

# Test: Create entity
print_test "Create new entity"
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE_URL/api/your" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name":"Test Entity"}')
check_response "$response" "200"
ENTITY_ID=$(echo "$response" | head -n1 | jq -r '.id')

# Test: List entities
print_test "List entities"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/your")
check_response "$response" "200"
```

### 2. Run Test Suite

```bash
./scripts/test/test-gitclaw.sh
```

### 3. Manual Testing

1. Start backend: `cd backend/GitClaw.AppHost && dotnet run`
2. Open frontend: http://localhost:5173/your-feature
3. Test create/read/delete operations
4. Check error handling

## Phase 4: PR Preparation

See `/pr-ready` skill for complete checklist:

```bash
# Quick validation
./scripts/test/test-gitclaw.sh
cd frontend && npm run lint && npm run build
cd ../backend && dotnet build
```

## Architecture References

- @.claude/rules/backend.md - Backend patterns
- @.claude/rules/frontend.md - Frontend patterns
- @.claude/rules/database.md - Database migrations
- @.claude/rules/testing.md - Test suite

## Related Skills

- `/add-endpoint` - Just add backend endpoint
- `/add-page` - Just add frontend page
- `/db-migration` - Just database changes
- `/pr-ready` - Pre-PR checklist

## Feature Checklist

### Backend
- [ ] Entity model created
- [ ] Migration created and applied
- [ ] DbContext updated
- [ ] Service interface defined
- [ ] Service implemented
- [ ] Service registered
- [ ] Controller created
- [ ] Authentication added

### Frontend
- [ ] API service created
- [ ] Page component created
- [ ] Route added
- [ ] Navigation link added
- [ ] TanStack Query used
- [ ] Error handling implemented

### Testing
- [ ] Backend tests added
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Edge cases covered

### Quality
- [ ] Code follows architecture patterns
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Ready for PR
