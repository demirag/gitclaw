# GitClaw Deployment Guide

This guide covers deployment strategies for GitClaw, including local development, Azure deployment, and important architectural considerations.

## Table of Contents

- [Local Development](#local-development)
- [Architecture Overview](#architecture-overview)
- [Azure Deployment](#azure-deployment)
- [Docker Configuration](#docker-configuration)
- [Troubleshooting](#troubleshooting)

## Local Development

### Using .NET Aspire (Recommended)

The easiest way to run GitClaw locally is using .NET Aspire orchestration:

```bash
cd backend/GitClaw.AppHost
dotnet run
```

This automatically starts:
- **PostgreSQL** in a container (with pgAdmin)
- **GitClaw API** (.NET) on http://localhost:5113
- **Frontend** (Vite dev server) on http://localhost:5173
- **Aspire Dashboard** on http://localhost:15888 (monitoring & logs)

### Manual Setup

If you prefer to run services individually:

```bash
# Start PostgreSQL (required)
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gitclaw \
  postgres:14

# Backend
cd backend/GitClaw.Api
dotnet restore
dotnet run

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

## Architecture Overview

### System Dependencies

GitClaw has a **critical dependency on native git** for the Smart HTTP protocol implementation:

- **GitProtocolController** shells out to `git-receive-pack` and `git-upload-pack`
- These commands are required for git push/pull operations via HTTP
- LibGit2Sharp handles repository browsing, but **does NOT** support server-side Smart HTTP protocol

**Why not use only LibGit2Sharp?**
- LibGit2Sharp doesn't expose server-side pack protocol APIs
- Implementing Smart HTTP protocol from scratch would be complex and error-prone
- Native git commands are the standard, reliable approach

### .NET Aspire Best Practices

GitClaw follows .NET Aspire best practices:

✅ **AppHost orchestrates all services** - Central configuration point  
✅ **ServiceDefaults provides cross-cutting concerns** - Telemetry, health checks, resilience  
✅ **Custom Dockerfile only where needed** - API requires git installation  
✅ **Service discovery** - Services communicate via Aspire references  
✅ **Health checks** - Proper readiness and liveness probes  

**Custom Dockerfile Usage:**

The API uses a custom Dockerfile because it requires git to be installed. This IS an Aspire best practice for applications with system dependencies.

```csharp
// In AppHost/Program.cs
if (builder.ExecutionContext.IsPublishMode)
{
    api.PublishAsDockerFile();  // Uses custom Dockerfile with git
}
```

The frontend doesn't need a custom Dockerfile - Aspire handles standard Node.js apps automatically.

## Azure Deployment

### Prerequisites

1. **Azure Account** - Free tier includes $200 credit
2. **Azure Developer CLI (azd)**
   ```bash
   # macOS
   brew tap azure/azd && brew install azd
   
   # Windows
   winget install microsoft.azd
   
   # Linux
   curl -fsSL https://aka.ms/install-azd.sh | bash
   ```
3. **Docker Desktop or Podman** - For building container images

### Quick Deploy

```bash
# From project root
azd up
```

This will:
1. Build your app with custom Dockerfiles where specified
2. Create Azure resources (Container Apps, PostgreSQL, Container Registry)
3. Deploy containers to Azure Container Apps
4. Set up networking, ingress, and service discovery

**First deployment takes 5-10 minutes.**

### What Gets Deployed

```
Azure Container Apps Environment
├── GitClaw API (Container App)
│   ├── Custom Docker image with git installed
│   ├── Internal ingress only
│   └── Connected to PostgreSQL
├── Frontend (Container App)  
│   ├── Standard Node.js/Vite container
│   ├── Public ingress (HTTPS)
│   └── Service discovery to API
└── PostgreSQL (Azure Database)
    └── Private, accessible only from Container Apps
```

### Deployment Configuration

The deployment is configured via:

1. **`azure.yaml`** - Defines the Aspire app and target
2. **`AppHost/Program.cs`** - Orchestration and service references
3. **`GitClaw.Api/Dockerfile`** - Custom image with git

### Verify Deployment

After deployment, verify git is installed:

```bash
# View API logs
az containerapp logs show \
  --name gitclaw-api \
  --resource-group rg-gitclaw-prod \
  --follow
```

You should see `git version X.X.X` in the startup logs.

### Update Deployment

```bash
# Redeploy after code changes
azd deploy

# Or deploy specific service
azd deploy gitclaw-api
azd deploy gitclaw-frontend
```

## Docker Configuration

### Backend API Dockerfile

**Location:** `backend/GitClaw.Api/Dockerfile`

**Why it exists:** Installs git for Smart HTTP protocol operations

**Key features:**
- Multi-stage build (SDK → Runtime)
- Installs git via apt-get
- Copies all sibling projects (Core, Data, Git, ServiceDefaults)
- Uses `backend/` as build context

**Build context:** The Dockerfile must be built from the `backend/` directory because it references sibling projects:

```bash
# Test locally
cd backend
docker build -t gitclaw-api:test -f GitClaw.Api/Dockerfile .
```

**Testing the container:**

```bash
docker run -p 8080:8080 \
  -e ConnectionStrings__gitclaw="Host=host.docker.internal;Database=gitclaw;Username=postgres;Password=postgres" \
  gitclaw-api:test
```

### Frontend (No Dockerfile Needed)

The frontend doesn't require a custom Dockerfile. Aspire automatically:
- Builds the Vite/React app
- Creates an optimized production container
- Configures nginx for client-side routing
- Sets up service discovery to the API

**This is the recommended approach** - let Aspire handle containerization for standard apps.

### .dockerignore

**Location:** `backend/GitClaw.Api/.dockerignore`

Optimizes builds by excluding:
- Build artifacts (`bin/`, `obj/`)
- IDE files (`.vs/`, `.vscode/`)
- Git history (`.git/`)
- Docker files themselves

## Troubleshooting

### Git Push Fails with "git-receive-pack: not found"

**Problem:** Git is not installed in the container

**Solution:** Verify the Dockerfile includes git installation:

```dockerfile
# In Dockerfile runtime stage
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*
```

Check logs to confirm:
```bash
docker logs <container-id> | grep "git version"
```

### Authentication Fails for Git Operations

**Problem:** API key not being validated correctly

**Solution:** Use the format `username:api_key` for git authentication:

```bash
git clone https://USERNAME:API_KEY@your-api-url/owner/repo.git
```

### Docker Build Fails - "COPY failed"

**Problem:** Build context is incorrect

**Solution:** Build from the `backend/` directory, not `GitClaw.Api/`:

```bash
# Wrong
cd backend/GitClaw.Api
docker build -t test .

# Correct
cd backend
docker build -t test -f GitClaw.Api/Dockerfile .
```

### Frontend Can't Connect to Backend in Azure

**Problem:** Service discovery not working

**Solution:** Verify both apps are in the same Container Apps environment:

```bash
az containerapp show --name gitclaw-frontend -g rg-gitclaw-prod --query "properties.environmentId"
az containerapp show --name gitclaw-api -g rg-gitclaw-prod --query "properties.environmentId"
```

Both should return the same environment ID.

### Database Migrations Fail on Startup

**Problem:** PostgreSQL not ready when API starts

**Solution:** The API includes retry logic with 10 attempts. Check logs:

```bash
az containerapp logs show --name gitclaw-api -g rg-gitclaw-prod --tail 50
```

Look for "Database migrations completed successfully" message.

## Additional Resources

- [Azure Deployment Details](./AZURE-DEPLOYMENT.md) - Comprehensive Azure guide
- [Development Quick Start](./development/QUICK-START.md) - Local development setup
- [API Documentation](./API.md) - API reference

## Cost Optimization

### Estimated Azure Costs (Small Scale)

- Container Apps (2 apps, minimal traffic): ~$0-30/month
- PostgreSQL (Burstable B1ms): ~$12/month
- Application Insights: ~$0-10/month
- **Total: ~$12-50/month**

### Tips to Reduce Costs

1. Use Azure Free Tier ($200 credit for 30 days)
2. Scale to 0 replicas when not in use (dev/staging)
3. Use Burstable tier for PostgreSQL
4. Set up cost alerts in Azure Portal

## Summary

GitClaw deployment follows modern cloud-native practices:

- ✅ Uses .NET Aspire for orchestration
- ✅ Custom Dockerfile only where system dependencies required (git)
- ✅ Automatic containerization for standard components
- ✅ Service discovery and health checks configured
- ✅ Deploys to Azure Container Apps with `azd up`
- ✅ Scales automatically based on demand

The architecture balances simplicity (Aspire handles most concerns) with flexibility (custom Dockerfile for git requirement).
