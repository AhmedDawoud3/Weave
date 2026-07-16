using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Weave.Application.DTOs.Admin;
using Weave.Application.Interfaces;
using Weave.Infrastructure.Identity;
using Weave.Infrastructure.Persistence;
using Weave.Domain.Entities;

namespace Weave.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly UserManager<WeaveIdentityUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly WeaveDbContext _dbContext;

    public AdminService(
        UserManager<WeaveIdentityUser> userManager,
        RoleManager<IdentityRole> roleManager,
        WeaveDbContext dbContext)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<UserAdminDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        var users = await _userManager.Users.ToListAsync(ct);
        var result = new List<UserAdminDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var projectCount = await _dbContext.Projects.CountAsync(p => p.UserId == user.Id, ct);

            result.Add(new UserAdminDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                CreatedAt = user.CreatedAt,
                Roles = roles.ToList(),
                ProjectsCount = projectCount,
                IsSuspended = user.IsSuspended
            });
        }

        return result;
    }

    public async Task<bool> SetAdminRoleAsync(string userId, bool isAdmin, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        await EnsureAdminRoleExistsAsync();

        if (isAdmin)
        {
            if (!await _userManager.IsInRoleAsync(user, "Admin"))
            {
                await _userManager.AddToRoleAsync(user, "Admin");
            }
        }
        else
        {
            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                await _userManager.RemoveFromRoleAsync(user, "Admin");
            }
        }

        return true;
    }

    public async Task<bool> BootstrapAdminAsync(string userId, CancellationToken ct = default)
    {
        await EnsureAdminRoleExistsAsync();

        var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
        if (adminUsers.Any())
        {
            // System already has an admin
            return false;
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        await _userManager.AddToRoleAsync(user, "Admin");
        return true;
    }

    public async Task<bool> ToggleUserSuspensionAsync(string userId, bool suspend, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;
        user.IsSuspended = suspend;
        await _userManager.UpdateAsync(user);
        return true;
    }

    public async Task<bool> DeleteUserAsync(string userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;
        var result = await _userManager.DeleteAsync(user);
        return result.Succeeded;
    }

    public async Task<PlatformStatsDto> GetPlatformStatsAsync(CancellationToken ct = default)
    {
        return new PlatformStatsDto
        {
            TotalUsers = await _userManager.Users.CountAsync(ct),
            TotalProjects = await _dbContext.Projects.CountAsync(ct),
            ActiveNetworks = await _dbContext.NetworkStates.CountAsync(n => n.Status == "running" || n.Status == "training", ct)
        };
    }

    public async Task<IEnumerable<ProjectAdminDto>> GetAllProjectsAsync(CancellationToken ct = default)
    {
        var projects = await _dbContext.Projects
            .Join(_userManager.Users, 
                  p => p.UserId, 
                  u => u.Id, 
                  (p, u) => new ProjectAdminDto
                  {
                      Id = p.Id.ToString(),
                      Name = p.Name,
                      CreatedAt = p.CreatedAt,
                      OwnerName = u.DisplayName ?? u.UserName ?? string.Empty,
                      OwnerEmail = u.Email ?? string.Empty
                  })
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
            
        return projects;
    }



    public async Task<IEnumerable<GalleryItem>> GetGalleryItemsAsync(CancellationToken ct = default)
    {
        return await _dbContext.GalleryItems.OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
    }

    public async Task<GalleryItem> CreateGalleryItemAsync(GalleryItem item, CancellationToken ct = default)
    {
        _dbContext.GalleryItems.Add(item);
        await _dbContext.SaveChangesAsync(ct);
        return item;
    }

    public async Task<GalleryItem?> UpdateGalleryItemAsync(GalleryItem item, CancellationToken ct = default)
    {
        var existing = await _dbContext.GalleryItems.FindAsync(new object[] { item.Id }, ct);
        if (existing == null) return null;
        existing.Name = item.Name;
        existing.Description = item.Description;
        existing.InputShape = item.InputShape;
        existing.Citation = item.Citation;
        existing.PaperUrl = item.PaperUrl;
        existing.Category = item.Category;
        existing.GraphPayload = item.GraphPayload;
        await _dbContext.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteGalleryItemAsync(string id, CancellationToken ct = default)
    {
        var item = await _dbContext.GalleryItems.FindAsync(new object[] { id }, ct);
        if (item == null) return false;
        _dbContext.GalleryItems.Remove(item);
        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    private async Task EnsureAdminRoleExistsAsync()
    {
        if (!await _roleManager.RoleExistsAsync("Admin"))
        {
            await _roleManager.CreateAsync(new IdentityRole("Admin"));
        }
    }
}
