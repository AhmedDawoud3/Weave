using Weave.Domain.Entities;

namespace Weave.Domain.Contracts;

/// <summary>
/// Repository contract for SubGraph persistence operations.
/// </summary>
public interface ISubGraphRepository
{
    Task<SubGraph?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<SubGraph>> GetAllByProjectIdAsync(Guid projectId, CancellationToken ct = default);
    Task<SubGraph> CreateAsync(SubGraph subGraph, CancellationToken ct = default);
    Task UpdateAsync(SubGraph subGraph, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
