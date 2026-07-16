namespace Weave.Application.DTOs.Admin;

public class UserAdminDto
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public IList<string> Roles { get; set; } = new List<string>();
    public int ProjectsCount { get; set; }
    public bool IsSuspended { get; set; }
}
