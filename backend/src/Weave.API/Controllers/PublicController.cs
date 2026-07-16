using Microsoft.AspNetCore.Mvc;
using Weave.Application.Interfaces;

namespace Weave.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicController : ControllerBase
{
    private readonly IAdminService _adminService;

    public PublicController(IAdminService adminService)
    {
        _adminService = adminService;
    }



    [HttpGet("gallery")]
    public async Task<IActionResult> GetGalleryItems(CancellationToken ct)
    {
        var items = await _adminService.GetGalleryItemsAsync(ct);
        return Ok(items);
    }
}
