using Weave.Domain.Entities;

namespace Weave.Domain.Contracts;

/// <summary>
/// Repository contract for Project aggregate operations.
/// </summary>
public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Project>> GetAllByUserIdAsync(string userId, CancellationToken ct = default);
    Task<Project> CreateAsync(Project project, CancellationToken ct = default);
    Task UpdateAsync(Project project, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
}
