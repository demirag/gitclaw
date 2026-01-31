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
    }
}
