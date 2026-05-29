using Weave.Application.DTOs.Projects;

namespace Weave.Application.Interfaces;

/// <summary>
/// Application service contract for project management operations.
/// </summary>
public interface IProjectService
{
    Task<ProjectDto> CreateAsync(string userId, CreateProjectDto dto, CancellationToken ct = default);
    Task<ProjectDetailDto?> GetByIdAsync(Guid id, string userId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectDto>> GetAllAsync(string userId, CancellationToken ct = default);
    Task<ProjectDto?> UpdateAsync(Guid id, string userId, UpdateProjectDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, string userId, CancellationToken ct = default);

    // SubGraph operations
    Task<SubGraphDto> CreateSubGraphAsync(Guid projectId, string userId, SaveSubGraphDto dto, CancellationToken ct = default);
    Task<SubGraphDto?> UpdateSubGraphAsync(Guid projectId, Guid subGraphId, string userId, SaveSubGraphDto dto, CancellationToken ct = default);
    Task<bool> DeleteSubGraphAsync(Guid projectId, Guid subGraphId, string userId, CancellationToken ct = default);
}
