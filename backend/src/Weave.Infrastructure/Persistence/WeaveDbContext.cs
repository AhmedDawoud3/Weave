using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Weave.Domain.Entities;
using Weave.Infrastructure.Identity;

namespace Weave.Infrastructure.Persistence;

/// <summary>
/// The main EF Core DbContext for Weave, combining Identity tables
/// with the application's domain entities.
/// </summary>
public class WeaveDbContext : IdentityDbContext<WeaveIdentityUser>
{
    public WeaveDbContext(DbContextOptions<WeaveDbContext> options) : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<SubGraph> SubGraphs => Set<SubGraph>();
    public DbSet<NetworkState> NetworkStates => Set<NetworkState>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ---- Project ----
        builder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.UserId).IsRequired();

            entity.HasIndex(p => p.UserId);

            // Relationship: User -> Projects
            entity.HasOne<WeaveIdentityUser>()
                  .WithMany()
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- SubGraph ----
        builder.Entity<SubGraph>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
            entity.Property(s => s.GraphJson).IsRequired();

            entity.HasIndex(s => s.ProjectId);

            // Relationship: Project -> SubGraphs
            entity.HasOne<Project>()
                  .WithMany(p => p.SubGraphs)
                  .HasForeignKey(s => s.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- NetworkState ----
        builder.Entity<NetworkState>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.RunId).IsRequired().HasMaxLength(100);
            entity.Property(n => n.Status).IsRequired().HasMaxLength(50);
            entity.Property(n => n.MetricsHistoryJson).IsRequired();

            entity.HasIndex(n => n.RunId).IsUnique();
            entity.HasIndex(n => n.ProjectId);

            // Relationship: Project -> NetworkStates
            entity.HasOne<Project>()
                  .WithMany(p => p.NetworkStates)
                  .HasForeignKey(n => n.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
