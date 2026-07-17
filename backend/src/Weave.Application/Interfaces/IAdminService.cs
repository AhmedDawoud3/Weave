using Weave.Application.DTOs.Admin;
using Weave.Domain.Entities;

namespace Weave.Application.Interfaces;

public interface IAdminService
{
    Task<IEnumerable<UserAdminDto>> GetAllUsersAsync(CancellationToken ct = default);
    Task<bool> SetAdminRoleAsync(string userId, bool isAdmin, CancellationToken ct = default);
    Task<bool> BootstrapAdminAsync(string userId, CancellationToken ct = default);
    Task<bool> ToggleUserSuspensionAsync(string userId, bool suspend, CancellationToken ct = default);
    Task<bool> DeleteUserAsync(string userId, CancellationToken ct = default);
    
    // Platform Stats
    Task<PlatformStatsDto> GetPlatformStatsAsync(CancellationToken ct = default);
    Task<IEnumerable<ProjectAdminDto>> GetAllProjectsAsync(CancellationToken ct = default);



    // Gallery Items
    Task<IEnumerable<GalleryItem>> GetGalleryItemsAsync(CancellationToken ct = default);
    Task<GalleryItem> CreateGalleryItemAsync(GalleryItem item, CancellationToken ct = default);
    Task<GalleryItem?> UpdateGalleryItemAsync(GalleryItem item, CancellationToken ct = default);
    Task<bool> DeleteGalleryItemAsync(string id, CancellationToken ct = default);
}

public class ProjectAdminDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
}

public class PlatformStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalProjects { get; set; }
    public int ActiveNetworks { get; set; }
}
