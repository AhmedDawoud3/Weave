using Microsoft.AspNetCore.Identity;

namespace Weave.Infrastructure.Identity;

/// <summary>
/// The actual Identity user class used by ASP.NET Core Identity.
/// Maps to the Domain's ApplicationUser concept but inherits IdentityUser
/// to leverage the full Identity framework.
/// </summary>
public class WeaveIdentityUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsSuspended { get; set; } = false;
}
