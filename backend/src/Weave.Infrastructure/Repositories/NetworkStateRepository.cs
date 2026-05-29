using Microsoft.EntityFrameworkCore;
using Weave.Domain.Contracts;
using Weave.Domain.Entities;
using Weave.Infrastructure.Persistence;

namespace Weave.Infrastructure.Repositories;

public class NetworkStateRepository : INetworkStateRepository
{
    private readonly WeaveDbContext _db;

    public NetworkStateRepository(WeaveDbContext db)
    {
        _db = db;
    }

    public async Task<NetworkState?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.NetworkStates.FindAsync(new object[] { id }, ct);
    }

    public async Task<NetworkState?> GetByRunIdAsync(string runId, CancellationToken ct = default)
    {
        return await _db.NetworkStates
            .FirstOrDefaultAsync(n => n.RunId == runId, ct);
    }

    public async Task<IReadOnlyList<NetworkState>> GetAllByProjectIdAsync(Guid projectId, CancellationToken ct = default)
    {
        return await _db.NetworkStates
            .Where(n => n.ProjectId == projectId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<NetworkState> CreateAsync(NetworkState state, CancellationToken ct = default)
    {
        _db.NetworkStates.Add(state);
        await _db.SaveChangesAsync(ct);
        return state;
    }

    public async Task UpdateAsync(NetworkState state, CancellationToken ct = default)
    {
        state.UpdatedAt = DateTime.UtcNow;
        _db.NetworkStates.Update(state);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var state = await _db.NetworkStates.FindAsync(new object[] { id }, ct);
        if (state is not null)
        {
            _db.NetworkStates.Remove(state);
            await _db.SaveChangesAsync(ct);
        }
    }
}
