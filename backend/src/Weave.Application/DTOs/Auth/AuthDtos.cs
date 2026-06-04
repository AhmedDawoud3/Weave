namespace Weave.Application.DTOs.Auth;

public class RegisterRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public bool Succeeded { get; set; }
    public string? Token { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? DisplayName { get; set; }
    public List<string> Errors { get; set; } = new();
}
