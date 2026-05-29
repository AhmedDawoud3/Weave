using Weave.Domain.Entities;

namespace Weave.Domain.Contracts;

/// <summary>
/// Repository contract for NetworkState (training run) persistence.
/// </summary>
public interface INetworkStateRepository
{
    Task<NetworkState?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<NetworkState?> GetByRunIdAsync(string runId, CancellationToken ct = default);
    Task<IReadOnlyList<NetworkState>> GetAllByProjectIdAsync(Guid projectId, CancellationToken ct = default);
    Task<NetworkState> CreateAsync(NetworkState state, CancellationToken ct = default);
    Task UpdateAsync(NetworkState state, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
