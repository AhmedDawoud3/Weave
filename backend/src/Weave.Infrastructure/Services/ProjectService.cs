using Weave.Application.DTOs.Projects;
using Weave.Application.Interfaces;
using Weave.Domain.Contracts;
using Weave.Domain.Entities;

namespace Weave.Infrastructure.Services;

/// <summary>
/// Application service implementation for project management.
/// Coordinates between repositories and maps entities to DTOs.
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepo;
    private readonly ISubGraphRepository _subGraphRepo;

    public ProjectService(IProjectRepository projectRepo, ISubGraphRepository subGraphRepo)
    {
        _projectRepo = projectRepo;
        _subGraphRepo = subGraphRepo;
    }

    public async Task<ProjectDto> CreateAsync(string userId, CreateProjectDto dto, CancellationToken ct = default)
    {
        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description,
            UserId = userId
        };

        await _projectRepo.CreateAsync(project, ct);
        return MapToDto(project);
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(Guid id, string userId, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(id, ct);
        if (project is null || project.UserId != userId)
            return null;

        return MapToDetailDto(project);
    }

    public async Task<IReadOnlyList<ProjectDto>> GetAllAsync(string userId, CancellationToken ct = default)
    {
        var projects = await _projectRepo.GetAllByUserIdAsync(userId, ct);
        return projects.Select(MapToDto).ToList();
    }

    public async Task<ProjectDto?> UpdateAsync(Guid id, string userId, UpdateProjectDto dto, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(id, ct);
        if (project is null || project.UserId != userId)
            return null;

        project.Name = dto.Name;
        project.Description = dto.Description;
        await _projectRepo.UpdateAsync(project, ct);

        return MapToDto(project);
    }

    public async Task<bool> DeleteAsync(Guid id, string userId, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(id, ct);
        if (project is null || project.UserId != userId)
            return false;

        await _projectRepo.DeleteAsync(id, ct);
        return true;
    }

    public async Task<SubGraphDto> CreateSubGraphAsync(Guid projectId, string userId, SaveSubGraphDto dto, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(projectId, ct);
        if (project is null || project.UserId != userId)
            throw new UnauthorizedAccessException("Project not found or access denied.");

        var subGraph = new SubGraph
        {
            Name = dto.Name,
            GraphJson = dto.GraphJson,
            ProjectId = projectId
        };

        await _subGraphRepo.CreateAsync(subGraph, ct);
        return MapToSubGraphDto(subGraph);
    }

    public async Task<SubGraphDto?> UpdateSubGraphAsync(Guid projectId, Guid subGraphId, string userId, SaveSubGraphDto dto, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(projectId, ct);
        if (project is null || project.UserId != userId)
            return null;

        var subGraph = await _subGraphRepo.GetByIdAsync(subGraphId, ct);
        if (subGraph is null || subGraph.ProjectId != projectId)
            return null;

        subGraph.Name = dto.Name;
        subGraph.GraphJson = dto.GraphJson;
        await _subGraphRepo.UpdateAsync(subGraph, ct);

        return MapToSubGraphDto(subGraph);
    }

    public async Task<bool> DeleteSubGraphAsync(Guid projectId, Guid subGraphId, string userId, CancellationToken ct = default)
    {
        var project = await _projectRepo.GetByIdAsync(projectId, ct);
        if (project is null || project.UserId != userId)
            return false;

        var subGraph = await _subGraphRepo.GetByIdAsync(subGraphId, ct);
        if (subGraph is null || subGraph.ProjectId != projectId)
            return false;

        await _subGraphRepo.DeleteAsync(subGraphId, ct);
        return true;
    }

    // ---- Mapping Helpers ----

    private static ProjectDto MapToDto(Project p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        UserId = p.UserId,
        SubGraphCount = p.SubGraphs?.Count ?? 0,
        NetworkStateCount = p.NetworkStates?.Count ?? 0
    };

    private static ProjectDetailDto MapToDetailDto(Project p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        UserId = p.UserId,
        SubGraphCount = p.SubGraphs?.Count ?? 0,
        NetworkStateCount = p.NetworkStates?.Count ?? 0,
        SubGraphs = p.SubGraphs?.Select(MapToSubGraphDto).ToList() ?? new(),
        NetworkStates = p.NetworkStates?.Select(MapToNetworkStateDto).ToList() ?? new()
    };

    private static SubGraphDto MapToSubGraphDto(SubGraph s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        GraphJson = s.GraphJson,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static NetworkStateDto MapToNetworkStateDto(NetworkState n) => new()
    {
        Id = n.Id,
        RunId = n.RunId,
        Status = n.Status,
        CurrentEpoch = n.CurrentEpoch,
        TotalEpochs = n.TotalEpochs,
        MetricsHistoryJson = n.MetricsHistoryJson,
        BestMetricsJson = n.BestMetricsJson,
        CreatedAt = n.CreatedAt,
        UpdatedAt = n.UpdatedAt
    };
}
