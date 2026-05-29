namespace Weave.Domain.Entities;

/// <summary>
/// Represents a registered user in the Weave platform.
/// Extends the base IdentityUser with Weave-specific profile fields.
/// The actual Identity base class is applied in the Infrastructure layer
/// to keep the Domain free of ASP.NET Identity dependencies.
/// </summary>
public class ApplicationUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
