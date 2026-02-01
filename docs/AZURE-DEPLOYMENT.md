
# Deploying GitClaw to Azure

## Overview

This guide explains how to deploy your .NET Aspire app (GitClaw) to Azure, making it publicly accessible on the internet.

## Architecture on Azure

When deployed to Azure, your app will look like this:

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Container Apps Environment          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │  Frontend        │────▶│  Backend API     │              │
│  │  (React/Vite)    │     │  (.NET)          │              │
│  │  Public Ingress  │     │  Internal        │              │
│  └──────────────────┘     └──────────────────┘              │
│         │                          │                         │
│         │                          │                         │
│         │                  ┌───────▼────────┐                │
│         │                  │  PostgreSQL    │                │
│         │                  │  (Azure DB)    │                │
│         │                  └────────────────┘                │
│         │                                                    │
│  ┌──────▼──────────────────────────────────┐                │
│  │  Azure Application Insights             │                │
│  │  (Monitoring, Logs, Traces)             │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
         │
         │ HTTPS
         ▼
    Internet Users
```

## Prerequisites

1. **Azure Account**
   - Sign up at [azure.microsoft.com](https://azure.microsoft.com/free/)
   - Free tier includes $200 credit for 30 days

2. **Install Azure Developer CLI (azd)**
   ```bash
   # macOS
   brew tap azure/azd && brew install azd
   
   # Windows
   winget install microsoft.azd
   
   # Linux
   curl -fsSL https://aka.ms/install-azd.sh | bash
   ```

3. **Install Azure CLI (az)**
   ```bash
   # macOS
   brew install azure-cli
   
   # Windows
   winget install microsoft.azurecli
   
   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

4. **Docker** (for building container images)
   - Already required for local Aspire development

## Deployment Steps

### Step 1: Initialize Azure Developer CLI

```bash
# Navigate to your project root
cd /Users/demirag/Shared/Projects/gitclaw

# Initialize azd
azd init
```

When prompted:
- **Environment name:** `gitclaw-prod` (or any name you prefer)
- **Subscription:** Select your Azure subscription
- **Location:** Choose a region close to your users (e.g., `eastus`, `westus2`, `westeurope`)

This creates an `azure.yaml` file and `.azure` folder.

### Step 2: Configure Infrastructure

Create `infra` folder for Azure infrastructure as code (Bicep templates):

```bash
# azd will help generate this, or you can use Aspire's built-in support
azd provision --template aspire
```

### Step 3: Deploy to Azure

```bash
# This will:
# 1. Build your app
# 2. Create Azure resources (Container Apps, PostgreSQL, etc.)
# 3. Deploy your containers
# 4. Set up networking and ingress

azd up
```

The first deployment takes 5-10 minutes. After completion, you'll see:
```
SUCCESS: Your application was provisioned and deployed to Azure in XX minutes.

Endpoints:
  gitclaw-frontend: https://gitclaw-frontend.XXXXX.eastus.azurecontainerapps.io
  gitclaw-api: https://gitclaw-api.XXXXX.eastus.azurecontainerapps.io
```

### Step 4: Configure Public Access

By default, Aspire deploys with these settings:
- **Frontend:** Public ingress ✅ (accessible from internet)
- **Backend API:** Internal only 🔒 (only accessible from within Container Apps environment)
- **PostgreSQL:** Private 🔒 (only accessible from backend)

This is the recommended security posture. The frontend can still call the backend because they're in the same Container Apps environment.

## Configuration Changes for Azure

### 1. Update Frontend for Production

The frontend needs to know about the Azure backend URL. Update your `vite.config.ts`:

```typescript
export default defineConfig(() => {
  // In production, API calls will go through the same origin
  // In development (Aspire), use service discovery
  const isDevelopment = process.env.NODE_ENV === 'development';
  const apiUrl = process.env.services__gitclaw__api__https__0 || 
                 process.env.services__gitclaw__api__http__0;
  const port = parseInt(process.env.VITE_PORT || process.env.PORT || '5173');

  return {
    plugins: [react()],
    server: {
      port: port,
      host: true,
      proxy: isDevelopment && apiUrl ? {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      } : undefined
    },
    // ... rest of config
  }
})
```

### 2. Update AppHost for Azure

The AppHost automatically configures resources for Azure when deployed. You may want to add:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// PostgreSQL - will become Azure Database for PostgreSQL in production
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .AddDatabase("gitclaw");

// API - will become Azure Container App
var api = builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithExternalHttpEndpoints(); // Makes API accessible externally if needed

// Frontend - will become Azure Container App with public ingress
var frontend = builder.AddNpmApp(name: "gitclaw-frontend", workingDirectory: "../../frontend", scriptName: "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithExternalHttpEndpoints() // Makes frontend publicly accessible
    .PublishAsDockerFile(); // Ensures it's containerized for production

builder.Build().Run();
```

### 3. Create Dockerfile for Frontend

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Configure nginx to handle client-side routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass $BACKEND_URL; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection keep-alive; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables in Azure

Azure Container Apps will automatically set:
- Connection strings for PostgreSQL
- Service-to-service URLs
- Application Insights instrumentation key

### How Frontend and Backend Communicate

Azure Container Apps provides built-in service discovery for container apps in the same environment. The frontend automatically connects to the backend using the service name `http://gitclaw-api` - no additional configuration needed!

**Key Benefits:**
- ✅ No environment variables required
- ✅ No complex networking setup
- ✅ Traffic stays internal (never leaves the environment)
- ✅ Works automatically after deployment

This is configured in the frontend's nginx proxy:
```nginx
location /api/ {
    proxy_pass http://gitclaw-api/;  # Uses Azure Container Apps service discovery
    # ... proxy headers
}
```

## Custom Domain (Optional)

### 1. Configure Custom Domain in Azure

```bash
# Add custom domain to Container App
az containerapp hostname add \
  --name gitclaw-frontend \
  --resource-group rg-gitclaw-prod \
  --hostname gitclaw.yourdomain.com
```

### 2. Update DNS Records

Add a CNAME record in your DNS provider:
```
Type: CNAME
Name: gitclaw
Value: gitclaw-frontend.XXXXX.eastus.azurecontainerapps.io
```

### 3. Enable HTTPS

Azure Container Apps automatically provides free SSL certificates via Let's Encrypt.

```bash
# Enable managed certificate
az containerapp hostname bind \
  --name gitclaw-frontend \
  --resource-group rg-gitclaw-prod \
  --hostname gitclaw.yourdomain.com \
  --environment gitclaw-env \
  --validation-method CNAME
```

## Monitoring and Logs

### View Application Logs

```bash
# View frontend logs
az containerapp logs show \
  --name gitclaw-frontend \
  --resource-group rg-gitclaw-prod \
  --follow

# View API logs
az containerapp logs show \
  --name gitclaw-api \
  --resource-group rg-gitclaw-prod \
  --follow
```

### Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to your resource group (e.g., `rg-gitclaw-prod`)
3. Click on Container Apps to see your frontend and backend
4. Click on "Application Insights" to see metrics, logs, and traces

## Scaling

Azure Container Apps can automatically scale based on traffic:

```bash
# Configure auto-scaling
az containerapp update \
  --name gitclaw-frontend \
  --resource-group rg-gitclaw-prod \
  --min-replicas 1 \
  --max-replicas 10
```

## Cost Optimization

### Free Tier
- **Container Apps:** First 180,000 vCPU-seconds and 360,000 GiB-seconds free per month
- **PostgreSQL:** Burstable B1ms tier (~$12/month)
- **Application Insights:** First 5GB free per month

### Estimated Monthly Cost (Small Scale)
- Container Apps (2 apps, minimal traffic): ~$0-30
- PostgreSQL (Burstable B1ms): ~$12
- Application Insights: ~$0-10
- **Total: ~$12-50/month**

### Tips to Reduce Costs
1. Use Azure Free Tier while testing
2. Scale down to 0 replicas when not in use (dev/staging environments)
3. Use Burstable tier for PostgreSQL
4. Set up cost alerts in Azure Portal

## Continuous Deployment

### Option 1: GitHub Actions (Recommended)

```bash
# Set up CI/CD with GitHub Actions
azd pipeline config
```

This creates `.github/workflows/azure-dev.yml` that automatically deploys on push to `main`.

### Option 2: Manual Deployment

```bash
# Redeploy after changes
azd deploy

# Or deploy specific service
azd deploy gitclaw-frontend
azd deploy gitclaw-api
```

## Troubleshooting

### Frontend Can't Connect to Backend

**Issue:** Frontend returns 404 or connection errors when calling `/api`

**Solution:**
1. Verify both containers are in the same Container Apps environment
2. Check that backend has ingress enabled (internal is fine)
3. Verify the backend service name matches in the nginx config

```bash
# Check if containers are in the same environment
az containerapp show \
  --name gitclaw-frontend \
  --resource-group rg-gitclaw-prod \
  --query "properties.environmentId"

az containerapp show \
  --name gitclaw-api \
  --resource-group rg-gitclaw-prod \
  --query "properties.environmentId"

# Both should return the same environment ID

# Check backend ingress configuration
az containerapp show \
  --name gitclaw-api \
  --resource-group rg-gitclaw-prod \
  --query "properties.configuration.ingress"
```

The frontend uses Azure Container Apps' built-in service discovery to reach the backend at `http://gitclaw-api`.

### Database Connection Fails

**Issue:** Backend can't connect to PostgreSQL

**Solution:**
1. Verify connection string is set correctly
2. Check that PostgreSQL allows connections from Container Apps
3. Verify firewall rules

```bash
# Check PostgreSQL firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group rg-gitclaw-prod \
  --name gitclaw-postgres
```

### Container Crashes on Startup

**Issue:** Container app shows "Failed" status

**Solution:**
1. Check logs for errors
2. Verify Dockerfile is correct
3. Check environment variables are set

```bash
# View container logs
az containerapp logs show \
  --name gitclaw-api \
  --resource-group rg-gitclaw-prod \
  --tail 100
```

## Clean Up Resources

To delete everything and stop charges:

```bash
# Delete all Azure resources
azd down

# Or manually delete resource group
az group delete --name rg-gitclaw-prod
```

## Next Steps

1. **Set up Custom Domain:** Configure `gitclaw.yourdomain.com`
2. **Enable Authentication:** Add Azure AD B2C or other auth providers
3. **Set up Monitoring:** Configure alerts in Application Insights
4. **Implement CDN:** Use Azure CDN for static assets
5. **Add Caching:** Use Azure Redis Cache for better performance

## Useful Commands

```bash
# Deploy to Azure
azd up

# View deployment status
azd monitor

# View logs
azd logs

# Redeploy after changes
azd deploy

# Delete everything
azd down

# List all environments
azd env list

# Switch environment
azd env select <environment-name>
```

## Resources

- [.NET Aspire Deployment](https://learn.microsoft.com/dotnet/aspire/deployment/overview)
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [Aspire + Azure Tutorial](https://learn.microsoft.com/dotnet/aspire/deployment/azure/aca-deployment)
