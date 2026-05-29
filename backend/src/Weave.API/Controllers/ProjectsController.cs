using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weave.Application.DTOs.Projects;
using Weave.Application.Interfaces;

namespace Weave.API.Controllers;

/// <summary>
/// REST API controller for project management.
/// All endpoints require authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("User ID not found in token.");

    /// <summary>
    /// Get all projects for the authenticated user.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDto>>> GetAll(CancellationToken ct)
    {
        var projects = await _projectService.GetAllAsync(GetUserId(), ct);
        return Ok(projects);
    }

    /// <summary>
    /// Get a specific project by ID with full details.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDetailDto>> GetById(Guid id, CancellationToken ct)
    {
        var project = await _projectService.GetByIdAsync(id, GetUserId(), ct);
        if (project is null) return NotFound();
        return Ok(project);
    }

    /// <summary>
    /// Create a new project.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(
        [FromBody] CreateProjectDto dto,
        [FromServices] IValidator<CreateProjectDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

        var project = await _projectService.CreateAsync(GetUserId(), dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = project.Id }, project);
    }

    /// <summary>
    /// Update an existing project.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Update(
        Guid id,
        [FromBody] UpdateProjectDto dto,
        [FromServices] IValidator<UpdateProjectDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

        var project = await _projectService.UpdateAsync(id, GetUserId(), dto, ct);
        if (project is null) return NotFound();
        return Ok(project);
    }

    /// <summary>
    /// Delete a project.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _projectService.DeleteAsync(id, GetUserId(), ct);
        if (!deleted) return NotFound();
        return NoContent();
    }

    // ---- SubGraph Endpoints ----

    /// <summary>
    /// Create a new subgraph within a project.
    /// </summary>
    [HttpPost("{projectId:guid}/subgraphs")]
    public async Task<ActionResult<SubGraphDto>> CreateSubGraph(
        Guid projectId,
        [FromBody] SaveSubGraphDto dto,
        [FromServices] IValidator<SaveSubGraphDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

        try
        {
            var subGraph = await _projectService.CreateSubGraphAsync(projectId, GetUserId(), dto, ct);
            return Created($"api/projects/{projectId}/subgraphs/{subGraph.Id}", subGraph);
        }
        catch (UnauthorizedAccessException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Update an existing subgraph.
    /// </summary>
    [HttpPut("{projectId:guid}/subgraphs/{subGraphId:guid}")]
    public async Task<ActionResult<SubGraphDto>> UpdateSubGraph(
        Guid projectId,
        Guid subGraphId,
        [FromBody] SaveSubGraphDto dto,
        [FromServices] IValidator<SaveSubGraphDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

        var subGraph = await _projectService.UpdateSubGraphAsync(projectId, subGraphId, GetUserId(), dto, ct);
        if (subGraph is null) return NotFound();
        return Ok(subGraph);
    }

    /// <summary>
    /// Delete a subgraph from a project.
    /// </summary>
    [HttpDelete("{projectId:guid}/subgraphs/{subGraphId:guid}")]
    public async Task<IActionResult> DeleteSubGraph(Guid projectId, Guid subGraphId, CancellationToken ct)
    {
        var deleted = await _projectService.DeleteSubGraphAsync(projectId, subGraphId, GetUserId(), ct);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
