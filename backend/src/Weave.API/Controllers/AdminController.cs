using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Weave.Application.DTOs.Admin;
using Weave.Application.Interfaces;
using Weave.Domain.Entities;

namespace Weave.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [Authorize]
    [HttpPost("bootstrap")]
    public async Task<IActionResult> BootstrapAdmin(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var success = await _adminService.BootstrapAdminAsync(userId, ct);
        if (!success)
        {
            return BadRequest(new { message = "Bootstrap failed. Either an admin already exists or user not found." });
        }

        return Ok(new { message = "Successfully bootstrapped as Admin. Please log in again to refresh your token." });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserAdminDto>>> GetAllUsers(CancellationToken ct)
    {
        var users = await _adminService.GetAllUsersAsync(ct);
        return Ok(users);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("users/{userId}/role")]
    public async Task<IActionResult> SetUserRole(string userId, [FromBody] SetRoleRequestDto request, CancellationToken ct)
    {
        var success = await _adminService.SetAdminRoleAsync(userId, request.IsAdmin, ct);
        if (!success)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(new { message = "User role updated successfully." });
    }
    [Authorize(Roles = "Admin")]
    [HttpPost("users/{userId}/suspend")]
    public async Task<IActionResult> ToggleUserSuspension(string userId, [FromBody] SuspendRequestDto request, CancellationToken ct)
    {
        var success = await _adminService.ToggleUserSuspensionAsync(userId, request.Suspend, ct);
        if (!success) return NotFound(new { message = "User not found." });
        return Ok(new { message = "User suspension updated successfully." });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(string userId, CancellationToken ct)
    {
        var success = await _adminService.DeleteUserAsync(userId, ct);
        if (!success) return NotFound(new { message = "User not found or could not be deleted." });
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("stats")]
    public async Task<ActionResult<PlatformStatsDto>> GetStats(CancellationToken ct)
    {
        return Ok(await _adminService.GetPlatformStatsAsync(ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("projects")]
    public async Task<ActionResult<IEnumerable<ProjectAdminDto>>> GetAllProjects(CancellationToken ct)
    {
        return Ok(await _adminService.GetAllProjectsAsync(ct));
    }



    // --- Gallery Items ---
    [Authorize(Roles = "Admin")]
    [HttpGet("gallery")]
    public async Task<ActionResult<IEnumerable<GalleryItem>>> GetGalleryItems(CancellationToken ct)
    {
        return Ok(await _adminService.GetGalleryItemsAsync(ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("gallery")]
    public async Task<ActionResult<GalleryItem>> CreateGalleryItem([FromBody] GalleryItem item, CancellationToken ct)
    {
        return Ok(await _adminService.CreateGalleryItemAsync(item, ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("gallery/{id}")]
    public async Task<ActionResult<GalleryItem>> UpdateGalleryItem(string id, [FromBody] GalleryItem item, CancellationToken ct)
    {
        item.Id = id;
        var updated = await _adminService.UpdateGalleryItemAsync(item, ct);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("gallery/{id}")]
    public async Task<IActionResult> DeleteGalleryItem(string id, CancellationToken ct)
    {
        var success = await _adminService.DeleteGalleryItemAsync(id, ct);
        if (!success) return NotFound();
        return NoContent();
    }
}

public class SuspendRequestDto
{
    public bool Suspend { get; set; }
}
