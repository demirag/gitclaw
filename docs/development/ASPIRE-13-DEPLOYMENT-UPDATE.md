# Aspire 13.1 Deployment Configuration Update

**Date:** 2026-02-07
**Status:** ✅ Complete

## Overview

Updated GitClaw's Aspire deployment configuration to follow Aspire 13.1 best practices for containerized deployments with proper build context handling.

## Changes Made

### 1. Backend API - Fixed Dockerfile Configuration

**Problem:**
- Previous configuration used `PublishAsDockerFile()` with incorrect API
- `DockerfileBuild` type doesn't exist in Aspire 13.1
- Build context wasn't properly specified, causing Dockerfile build failures

**Solution:**
```csharp
// Use AddDockerfile() in publish mode instead of PublishAsDockerFile()
IResourceBuilder<IResourceWithEndpoints> api;
if (builder.ExecutionContext.IsPublishMode)
{
    api = builder.AddDockerfile("gitclaw-api", "../", "GitClaw.Api/Dockerfile")
        .WithReference(postgres)
        .WaitFor(postgres)
        .WithHttpEndpoint(port: 8080, targetPort: 8080, name: "http")
        .WithExternalHttpEndpoints();
}
else
{
    api = builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
        .WithReference(postgres)
        .WaitFor(postgres)
        .WithExternalHttpEndpoints();
}
```

**Why This Works:**
- `AddDockerfile()` gives full control over build context and Dockerfile path
- Build context `"../"` points to `backend/` directory (relative to AppHost)
- This allows `COPY . .` in Dockerfile to access all sibling projects:
  - GitClaw.Api
  - GitClaw.Core
  - GitClaw.Data
  - GitClaw.Git
- Development mode uses direct project reference for hot reload
- Production mode uses Dockerfile with git binaries installed

### 2. Frontend - Confirmed Dockerfile Requirement

**Answer:** **Yes, you need a Dockerfile for frontend deployment.**

**Reasons:**
1. **Production Build:** Vite requires `npm run build` to create optimized production assets
2. **Static File Serving:** nginx is used to serve the built SPA with proper routing fallback
3. **Container Deployment:** Azure Container Apps and other cloud platforms expect containerized apps

**Current Configuration (Correct):**
```csharp
IResourceBuilder<IResourceWithEndpoints> frontend;
if (builder.ExecutionContext.IsPublishMode)
{
    frontend = builder.AddDockerfile("gitclaw-frontend", "../../frontend")
        .WaitFor(api)
        .WithEnvironment("GITCLAW_API_URL", api.GetEndpoint("http"))
        .WithHttpEndpoint(port: 8080, targetPort: 8080, name: "http")
        .WithExternalHttpEndpoints();
}
else
{
    frontend = builder.AddNpmApp("gitclaw-frontend", "../../frontend", "dev")
        .WaitFor(api)
        .WithEnvironment("GITCLAW_API_URL", api.GetEndpoint("http"))
        .WithHttpEndpoint(env: "VITE_PORT")
        .WithExternalHttpEndpoints();
}
```

**Key Changes:**
- Removed `.WithReference(api)` - not needed for service-to-service HTTP communication
- Use `.WithEnvironment("GITCLAW_API_URL", api.GetEndpoint("http"))` to pass API URL
- Same pattern for both development and production modes

The [frontend/Dockerfile](../../frontend/Dockerfile) performs:
- Multi-stage build (node:20-alpine → nginx:alpine)
- Vite production build with optimizations
- nginx configuration with SPA routing fallback
- Security headers and static asset caching

## Aspire 13.1 Best Practices Applied

### ✅ Development vs. Production Separation
- **Development:** `AddProject<>()` for backend, `AddNpmApp()` for frontend (hot reload)
- **Production:** `AddDockerfile()` for both backend and frontend (containerized)

### ✅ System Dependencies Handling
- Backend requires native git binaries (git-receive-pack, git-upload-pack)
- Custom Dockerfile installs git via apt-get in runtime image
- `AddDockerfile()` enables this customization with full control

### ✅ Build Context Clarity
- `AddDockerfile(name, contextPath, dockerfilePath)` provides explicit control
- Context path is relative to AppHost directory
- Enables multi-project solution builds with sibling project access

### ✅ Service-to-Service Communication
- Use `.WithEnvironment()` to pass endpoint URLs between services
- Avoid `.WithReference()` when mixing project resources and Dockerfile resources
- Environment variables work consistently across development and production

### ✅ Resource Dependencies
- PostgreSQL → API → Frontend dependency chain
- Proper `WaitFor()` orchestration
- External endpoints configuration

## Deployment Verification

### Local Development
```bash
cd backend/GitClaw.AppHost
dotnet run
```
- Uses `AddProject<>()` and `AddNpmApp()` (no Dockerfiles)
- Hot reloading enabled
- Direct project references

### Production Deployment
```bash
cd backend/GitClaw.AppHost
dotnet publish --configuration Release
```
- Uses Dockerfiles for both frontend and backend
- Builds containers with proper dependencies
- Ready for Azure Container Apps or Docker Compose

### Manifest Generation (Verify Deployment)
```bash
cd backend/GitClaw.AppHost
dotnet run --publisher manifest --output-path manifest.json
```

**Generated Manifest (Backend):**
```json
"gitclaw-api": {
  "type": "container.v1",
  "build": {
    "context": "..",
    "dockerfile": "../GitClaw.Api/Dockerfile"
  },
  "bindings": {
    "http": {
      "targetPort": 8080,
      "external": true
    }
  }
}
```

**Generated Manifest (Frontend):**
```json
"gitclaw-frontend": {
  "type": "container.v1",
  "build": {
    "context": "../../frontend",
    "dockerfile": "../../frontend/Dockerfile"
  },
  "env": {
    "GITCLAW_API_URL": "{gitclaw-api.bindings.http.url}"
  }
}
```

✅ **Paths are correct and verified**

## File Structure

```
backend/
├── GitClaw.AppHost/
│   └── Program.cs          ← Aspire orchestration (updated)
├── GitClaw.Api/
│   └── Dockerfile          ← Backend container with git (existing)
├── GitClaw.Core/
├── GitClaw.Data/
└── GitClaw.Git/

frontend/
└── Dockerfile              ← Frontend nginx container (existing)
```

## Key Takeaways

1. **Backend Dockerfile is required** - Needs native git for Smart HTTP protocol
2. **Frontend Dockerfile is required** - Needs nginx to serve SPA in production
3. **Build context matters** - Multi-project solutions need parent directory context
4. **Aspire 13.1 best practice** - Use `DockerfileBuild` for explicit path configuration

## References

- [Aspire Docker hosting integration](https://learn.microsoft.com/en-us/dotnet/aspire/deployment/docker-integration)
- [PublishAsDockerFile API](https://learn.microsoft.com/en-us/dotnet/api/aspire.hosting.executableresourcebuilderextensions.publishasdockerfile)
- [What's new in Aspire 13.1](https://aspire.dev/whats-new/aspire-13-1/)
