---
name: db-migration
description: Create and apply Entity Framework Core database migrations. Use when modifying database schema, adding tables, or updating models.
---

# Database Migration

Guide for creating and applying EF Core migrations in GitClaw.

## CRITICAL: Always Use --startup-project

All `dotnet ef` commands MUST include `--startup-project ../GitClaw.Api` when run from `GitClaw.Data` directory.

**Why?** The Data project doesn't have connection strings or Aspire configuration. The startup project flag tells EF Core to load configuration from the API project.

## Create New Migration

### 1. Modify Your Models

Update entity models in `backend/GitClaw.Core/Models/` or DbContext configuration in `backend/GitClaw.Data/GitClawDbContext.cs`.

### 2. Create Migration

```bash
cd backend/GitClaw.Data
dotnet ef migrations add YourMigrationName --startup-project ../GitClaw.Api
```

**Naming convention**: Use PascalCase describing the change (e.g., `AddUserProfileFields`, `UpdatePullRequestStatus`)

### 3. Review Generated Migration

Check `backend/GitClaw.Data/Migrations/` for:
- Migration file: `TIMESTAMP_YourMigrationName.cs`
- Designer file: `TIMESTAMP_YourMigrationName.Designer.cs`

Review the `Up()` and `Down()` methods to ensure they match your intent.

### 4. Apply Migration

```bash
cd backend/GitClaw.Data
dotnet ef database update --startup-project ../GitClaw.Api
```

**Note**: Aspire automatically applies migrations on startup in development, but it's good practice to apply manually and verify.

## Common Operations

### Rollback to Specific Migration

```bash
cd backend/GitClaw.Data
dotnet ef database update 20260131012848_AddPullRequests --startup-project ../GitClaw.Api
```

### Remove Last Migration (if not applied)

```bash
cd backend/GitClaw.Data
dotnet ef migrations remove --startup-project ../GitClaw.Api
```

**Warning**: Only works if the migration hasn't been applied to the database yet.

### List All Migrations

```bash
cd backend/GitClaw.Data
dotnet ef migrations list --startup-project ../GitClaw.Api
```

### Generate SQL Script (for production)

```bash
cd backend/GitClaw.Data
dotnet ef migrations script --startup-project ../GitClaw.Api --output migration.sql
```

## DbContext Configuration

The `GitClawDbContext` is in `backend/GitClaw.Data/GitClawDbContext.cs`.

**Patterns**:
- Use Fluent API in `OnModelCreating()` for complex relationships
- Entity configurations can be split into separate classes using `IEntityTypeConfiguration<T>`
- Always specify foreign key relationships explicitly

**Example**:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<PullRequest>()
        .HasOne(pr => pr.Repository)
        .WithMany()
        .HasForeignKey(pr => pr.RepositoryId)
        .OnDelete(DeleteBehavior.Cascade);
}
```

## Troubleshooting

### "No DbContext was found"
- You forgot `--startup-project ../GitClaw.Api`
- Or you're not in the `GitClaw.Data` directory

### "Build failed"
- Fix compilation errors in your models first
- Ensure `GitClaw.Api` project can build

### Migration Already Applied
- Can't remove applied migrations with `migrations remove`
- Must create a new migration to revert changes
- Or rollback to a previous migration with `database update`

## Architecture Reference

See @.claude/rules/database.md for detailed information.

## Checklist

- [ ] Models updated in `GitClaw.Core/Models/` or DbContext
- [ ] Migration created with `migrations add`
- [ ] Reviewed generated migration files
- [ ] Applied migration with `database update`
- [ ] Verified changes in database (use pgAdmin or Aspire dashboard)
- [ ] Updated any affected services in `GitClaw.Data/`
- [ ] Tested API endpoints that use modified entities
