# Aspire Frontend Integration

## Overview

The GitClaw frontend has been configured to integrate with the Aspire AppHost following best practices from the Microsoft Aspire documentation.

## What Changed

### 1. AppHost Configuration

**Packages Added:**
- `Aspire.Hosting.NodeJs` (9.5.2) - Provides Node.js integration
- `CommunityToolkit.Aspire.Hosting.NodeJS.Extensions` (9.9.0) - Adds Vite-specific support

**Program.cs Updates:**
```csharp
// Old approach - using AddExecutable
var frontendPath = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", "..", "frontend"));
builder.AddExecutable("gitclaw-frontend", "npm", frontendPath, "run", "dev", "--", "--host", "--port", "5173", "--strictPort")
    .WithHttpEndpoint(port: 5173, isProxied: false)
    .WithExternalHttpEndpoints();

// New approach - using AddNpmApp (Aspire way)
builder.AddNpmApp(name: "gitclaw-frontend", workingDirectory: "../../frontend", scriptName: "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithExternalHttpEndpoints();
```

### 2. Vite Configuration

Updated `frontend/vite.config.ts` to:
- Read port from environment variable `VITE_PORT` or `PORT` (set by Aspire)
- Configure proxy to route `/api/*` requests to the backend
- Use Aspire's service discovery via environment variables
- **Note:** Service names with hyphens (`gitclaw-api`) become double underscores in env vars (`services__gitclaw__api__https__0`)

```typescript
export default defineConfig(() => {
  // Get the API service URL from Aspire environment variables
  // Hyphens in service names become double underscores in env vars
  const apiUrl = process.env.services__gitclaw__api__https__0 || process.env.services__gitclaw__api__http__0;
  const port = parseInt(process.env.VITE_PORT || process.env.PORT || '5173');

  console.log('Vite Config - API URL:', apiUrl);
  console.log('Vite Config - Port:', port);

  return {
    plugins: [react()],
    server: {
      port: port,
      host: true, // Listen on all addresses
      proxy: apiUrl ? {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      } : undefined
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: './index.html'
      }
    }
  }
})
```

### 3. API Client Configuration

Updated `frontend/src/lib/api.ts`:
- Changed base URL to use `/api` prefix
- Proxy handles routing to backend automatically
- No hardcoded URLs needed

```typescript
// Old: const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5113';
// New: const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
```

### 4. Environment Variables

Updated `frontend/.env`:
```bash
# With Aspire proxy configuration, API calls go through /api
# The proxy in vite.config.ts routes them to the backend
VITE_API_BASE_URL=/api
```

## Benefits

### 1. **Service Discovery**
- Frontend automatically discovers the backend URL via Aspire
- No hardcoded ports or URLs
- Works in any environment (dev, staging, production)

### 2. **Automatic Dependency Management**
- `WithNpmPackageInstallation()` ensures `npm install` runs automatically
- `WaitFor(api)` ensures the backend starts before the frontend

### 3. **Single Origin**
- All requests go through the same origin
- No CORS issues during development
- Simplified security configuration

### 4. **Aspire Dashboard Integration**
- Frontend appears in the Aspire dashboard
- View logs, metrics, and traces
- Start/stop frontend from the dashboard

### 5. **Better Developer Experience**
- Single command to start entire stack
- Automatic restarts on changes
- Integrated telemetry and monitoring

## How to Use

### Starting the Application

From VS Code:
1. Press `F5` or `Ctrl+F5`
2. Select `App Host [default configuration]`
3. The Aspire dashboard opens automatically
4. Both backend and frontend start automatically

From CLI:
```bash
cd backend/GitClaw.AppHost
dotnet run
```

### Accessing the Application

1. **Aspire Dashboard**: Opens automatically (usually `https://localhost:17XXX`)
2. **Frontend**: Click the URL in the dashboard for `gitclaw-frontend`
3. **Backend API**: Click the URL in the dashboard for `gitclaw-api`

### How the Proxy Works

When the frontend makes a request:
```typescript
// Frontend code
await api.get('/agents/me');  // This calls /api/agents/me
```

1. Request goes to `http://localhost:<vite-port>/api/agents/me`
2. Vite proxy intercepts requests matching `/api/*`
3. Proxy rewrites the path (removes `/api` prefix)
4. Forwards to backend: `https://localhost:<api-port>/agents/me`
5. Response is returned to the frontend

### Environment Variables Injected by Aspire

Aspire automatically sets these environment variables:
- `VITE_PORT` - Port for the Vite dev server
- `services__gitclaw_api__https__0` - HTTPS URL for the API
- `services__gitclaw_api__http__0` - HTTP URL for the API (fallback)

## Troubleshooting

### Error: "The endpoint 'http' for resource 'gitclaw-frontend' requested a proxy"
**Full error:** `The endpoint 'http' for resource 'gitclaw-frontend' requested a proxy (IsProxied is true). Non-container resources cannot be proxied when both TargetPort and Port are specified with the same value.`

**Solution:** Use `AddNpmApp` instead of `AddViteApp`. The `AddViteApp` extension tries to set up Aspire's proxy, which conflicts with Vite's own proxy configuration.

```csharp
// ❌ Don't use AddViteApp if you're using Vite's proxy
builder.AddViteApp(name: "gitclaw-frontend", workingDirectory: "../../frontend")

// ✅ Use AddNpmApp instead
builder.AddNpmApp(name: "gitclaw-frontend", workingDirectory: "../../frontend", scriptName: "dev")
    .WithHttpEndpoint(env: "VITE_PORT")
```

### Frontend fails to start
1. Ensure `node` and `npm` are installed
2. Check the Aspire dashboard logs for `gitclaw-frontend`
3. Try running `npm install` manually in the `frontend` folder
4. Check the console output in the terminal for Vite errors

### API calls fail with 404
1. Verify the API name in `AppHost Program.cs` matches the proxy config
   - AppHost: `"gitclaw-api"` (with hyphen)
   - Vite config: `services__gitclaw__api__https__0` (hyphen becomes double underscore)
2. Check that the proxy rewrite rule is correct
3. Inspect network requests in browser DevTools (Network tab)
4. Check the Vite console output - it should print the API URL

### Environment variables not being read
1. Verify the service name in `AppHost Program.cs` matches the expected format
2. **Important:** Hyphens in service names become double underscores in environment variables
   - `gitclaw-api` → `services__gitclaw__api__https__0`
   - `my-service` → `services__my__service__https__0`
3. Check the Vite console output for the resolved API URL
4. Use `console.log(process.env)` in `vite.config.ts` to see all available environment variables

### Vite config fails to load
1. Run `npm install` in the frontend folder
2. Restart the AppHost
3. Check for TypeScript errors in `vite.config.ts`

## References

- [Building a Full-Stack App with React and Aspire](https://devblogs.microsoft.com/dotnet/new-aspire-app-with-react/)
- [Aspire Documentation](https://learn.microsoft.com/dotnet/aspire/)
- [Aspire Dashboard Overview](https://learn.microsoft.com/dotnet/aspire/fundamentals/dashboard/overview)
- [Community Toolkit for Aspire](https://github.com/CommunityToolkit/Aspire)
