using Microsoft.EntityFrameworkCore;
using Weave.Domain.Contracts;
using Weave.Domain.Entities;
using Weave.Infrastructure.Persistence;

namespace Weave.Infrastructure.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly WeaveDbContext _db;

    public ProjectRepository(WeaveDbContext db)
    {
        _db = db;
    }

    public async Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Projects
            .Include(p => p.SubGraphs)
            .Include(p => p.NetworkStates)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task<IReadOnlyList<Project>> GetAllByUserIdAsync(string userId, CancellationToken ct = default)
    {
        return await _db.Projects
            .Where(p => p.UserId == userId)
            .Include(p => p.SubGraphs)
            .Include(p => p.NetworkStates)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync(ct);
    }

    public async Task<Project> CreateAsync(Project project, CancellationToken ct = default)
    {
        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);
        return project;
    }

    public async Task UpdateAsync(Project project, CancellationToken ct = default)
    {
        project.UpdatedAt = DateTime.UtcNow;
        _db.Projects.Update(project);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _db.Projects.FindAsync(new object[] { id }, ct);
        if (project is not null)
        {
            _db.Projects.Remove(project);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Projects.AnyAsync(p => p.Id == id, ct);
    }
}
