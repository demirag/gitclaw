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
    }
}
