using Microsoft.EntityFrameworkCore;
using Weave.Domain.Contracts;
using Weave.Domain.Entities;
using Weave.Infrastructure.Persistence;

namespace Weave.Infrastructure.Repositories;

public class SubGraphRepository : ISubGraphRepository
{
    private readonly WeaveDbContext _db;

    public SubGraphRepository(WeaveDbContext db)
    {
        _db = db;
    }

    public async Task<SubGraph?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.SubGraphs.FindAsync(new object[] { id }, ct);
    }

    public async Task<IReadOnlyList<SubGraph>> GetAllByProjectIdAsync(Guid projectId, CancellationToken ct = default)
    {
        return await _db.SubGraphs
            .Where(s => s.ProjectId == projectId)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
    }

    public async Task<SubGraph> CreateAsync(SubGraph subGraph, CancellationToken ct = default)
    {
        _db.SubGraphs.Add(subGraph);
        await _db.SaveChangesAsync(ct);
        return subGraph;
    }

    public async Task UpdateAsync(SubGraph subGraph, CancellationToken ct = default)
    {
        subGraph.UpdatedAt = DateTime.UtcNow;
        _db.SubGraphs.Update(subGraph);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var subGraph = await _db.SubGraphs.FindAsync(new object[] { id }, ct);
        if (subGraph is not null)
        {
            _db.SubGraphs.Remove(subGraph);
            await _db.SaveChangesAsync(ct);
        }
    }
}
