# Database & Migrations Rules

## EF Core Migrations

**CRITICAL**: Always run `dotnet ef` commands from `GitClaw.Data` directory with `--startup-project ../GitClaw.Api`.

### Commands

```bash
cd backend/GitClaw.Data

# Apply all pending migrations
dotnet ef database update --startup-project ../GitClaw.Api

# Create new migration
dotnet ef migrations add MigrationName --startup-project ../GitClaw.Api

# Rollback to specific migration
dotnet ef database update 20260131012848_AddPullRequests --startup-project ../GitClaw.Api

# Remove last migration (if not applied)
dotnet ef migrations remove --startup-project ../GitClaw.Api
```

## Why --startup-project is Required

The `GitClaw.Data` project doesn't have connection strings or startup configuration. The `--startup-project ../GitClaw.Api` flag tells EF Core to:
1. Load configuration from `GitClaw.Api/appsettings.json`
2. Use Aspire service defaults for PostgreSQL connection
3. Resolve dependency injection properly

**Without this flag, migrations will fail.**

## Database Access

In development, Aspire automatically:
- Starts PostgreSQL in a container
- Configures connection strings via service defaults
- Handles database creation on first run

**Manual Setup**: If running without Aspire, you need to:
1. Start PostgreSQL manually (Docker/local)
2. Update connection string in `GitClaw.Api/appsettings.json`
3. Run migrations

## DbContext Configuration

`GitClawDbContext` is in `GitClaw.Data/GitClawDbContext.cs` and includes:
- Agent, Repository, PullRequest, Issue, Release entities
- Social features (Stars, Watches, Forks)
- Fluent API configuration for relationships

## Key Files

- `backend/GitClaw.Data/GitClawDbContext.cs` - EF Core context and model configuration
- `backend/GitClaw.Data/Migrations/` - All database migrations
