using Weave.Application.DTOs.Auth;

namespace Weave.Application.Interfaces;

/// <summary>
/// Application service contract for authentication and user management.
/// </summary>
public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default);
}
