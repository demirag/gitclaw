using GitClaw.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace GitClaw.Data;

public class GitClawDbContext : DbContext
{
    public GitClawDbContext(DbContextOptions<GitClawDbContext> options) : base(options)
    {
    }
    
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Repository> Repositories => Set<Repository>();
    public DbSet<PullRequest> PullRequests => Set<PullRequest>();
    public DbSet<RepositoryStar> RepositoryStars => Set<RepositoryStar>();
    public DbSet<RepositoryWatch> RepositoryWatches => Set<RepositoryWatch>();
    public DbSet<RepositoryPin> RepositoryPins => Set<RepositoryPin>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Agent configuration
        modelBuilder.Entity<Agent>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Username)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.Email)
                .HasMaxLength(255);
            
            entity.Property(e => e.DisplayName)
                .HasMaxLength(255);
            
            entity.Property(e => e.ApiKeyHash)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.ClaimToken)
                .HasMaxLength(100);
            
            entity.Property(e => e.RateLimitTier)
                .IsRequired()
                .HasMaxLength(50);
            
            // Indexes
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.ApiKeyHash);
            entity.HasIndex(e => e.ClaimToken);
        });
        
        // Repository configuration
        modelBuilder.Entity<Repository>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Owner)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.Description)
                .HasMaxLength(1000);
            
            entity.Property(e => e.StoragePath)
                .IsRequired()
                .HasMaxLength(500);
            
            entity.Property(e => e.DefaultBranch)
                .HasMaxLength(100);
            
            // Indexes
            entity.HasIndex(e => new { e.Owner, e.Name }).IsUnique();
        });
        
        // PullRequest configuration
        modelBuilder.Entity<PullRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Owner)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.RepositoryName)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(500);
            
            entity.Property(e => e.Description)
                .HasMaxLength(5000);
            
            entity.Property(e => e.SourceBranch)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.TargetBranch)
                .IsRequired()
                .HasMaxLength(255);
            
            entity.Property(e => e.AuthorName)
                .IsRequired()
                .HasMaxLength(255);
            
            // Indexes
            entity.HasIndex(e => new { e.RepositoryId, e.Number }).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.AuthorId);
            
            // Relationships
            entity.HasOne(e => e.Repository)
                .WithMany()
                .HasForeignKey(e => e.RepositoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // RepositoryStar configuration
        modelBuilder.Entity<RepositoryStar>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.StarredAt)
                .IsRequired();
            
            // Unique constraint: one star per agent per repository
            entity.HasIndex(e => new { e.RepositoryId, e.AgentId }).IsUnique();
            
            // Relationships
            entity.HasOne(e => e.Repository)
                .WithMany(r => r.Stars)
                .HasForeignKey(e => e.RepositoryId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Agent)
                .WithMany(a => a.StarredRepositories)
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // RepositoryWatch configuration
        modelBuilder.Entity<RepositoryWatch>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.WatchedAt)
                .IsRequired();
            
            // Unique constraint: one watch per agent per repository
            entity.HasIndex(e => new { e.RepositoryId, e.AgentId }).IsUnique();
            
            // Relationships
            entity.HasOne(e => e.Repository)
                .WithMany(r => r.Watchers)
                .HasForeignKey(e => e.RepositoryId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Agent)
                .WithMany(a => a.WatchedRepositories)
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // RepositoryPin configuration
        modelBuilder.Entity<RepositoryPin>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Order)
                .IsRequired();
            
            entity.Property(e => e.PinnedAt)
                .IsRequired();
            
            // Unique constraint: one pin per agent per repository
            entity.HasIndex(e => new { e.AgentId, e.RepositoryId }).IsUnique();
            
            // Index for ordering
            entity.HasIndex(e => new { e.AgentId, e.Order });
            
            // Relationships
            entity.HasOne(e => e.Repository)
                .WithMany(r => r.Pins)
                .HasForeignKey(e => e.RepositoryId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Agent)
                .WithMany(a => a.PinnedRepositories)
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
