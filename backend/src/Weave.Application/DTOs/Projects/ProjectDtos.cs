namespace Weave.Application.DTOs.Projects;

/// <summary>
/// DTO for creating a new project.
/// </summary>
public class CreateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

/// <summary>
/// DTO for updating an existing project.
/// </summary>
public class UpdateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

/// <summary>
/// DTO returned when listing or reading a project.
/// </summary>
public class ProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int SubGraphCount { get; set; }
    public int NetworkStateCount { get; set; }
}

/// <summary>
/// DTO for detailed project view, including subgraphs.
/// </summary>
public class ProjectDetailDto : ProjectDto
{
    public List<SubGraphDto> SubGraphs { get; set; } = new();
    public List<NetworkStateDto> NetworkStates { get; set; } = new();
}

/// <summary>
/// DTO for SubGraph data.
/// </summary>
public class SubGraphDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string GraphJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for creating/updating a SubGraph.
/// </summary>
public class SaveSubGraphDto
{
    public string Name { get; set; } = string.Empty;
    public string GraphJson { get; set; } = "{}";
}

/// <summary>
/// DTO for NetworkState (training run) data.
/// </summary>
public class NetworkStateDto
{
    public Guid Id { get; set; }
    public string RunId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? CurrentEpoch { get; set; }
    public int? TotalEpochs { get; set; }
    public string MetricsHistoryJson { get; set; } = "[]";
    public string? BestMetricsJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
