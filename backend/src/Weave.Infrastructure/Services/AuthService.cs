using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Weave.Application.DTOs.Auth;
using Weave.Application.Interfaces;
using Weave.Infrastructure.Identity;

namespace Weave.Infrastructure.Services;

/// <summary>
/// Authentication service implementation using ASP.NET Core Identity
/// and JWT bearer tokens.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserManager<WeaveIdentityUser> _userManager;
    private readonly IConfiguration _configuration;

    public AuthService(UserManager<WeaveIdentityUser> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser is not null)
        {
            return new AuthResponseDto
            {
                Succeeded = false,
                Errors = new List<string> { "A user with this email already exists." }
            };
        }

        var user = new WeaveIdentityUser
        {
            UserName = dto.UserName,
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Succeeded = false,
                Errors = result.Errors.Select(e => e.Description).ToList()
            };
        }

        var token = GenerateJwtToken(user);

        return new AuthResponseDto
        {
            Succeeded = true,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            UserId = user.Id,
            UserName = user.UserName,
            DisplayName = user.DisplayName
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user is null)
        {
            return new AuthResponseDto
            {
                Succeeded = false,
                Errors = new List<string> { "Invalid email or password." }
            };
        }

        var isValidPassword = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!isValidPassword)
        {
            return new AuthResponseDto
            {
                Succeeded = false,
                Errors = new List<string> { "Invalid email or password." }
            };
        }

        var token = GenerateJwtToken(user);

        return new AuthResponseDto
        {
            Succeeded = true,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            UserId = user.Id,
            UserName = user.UserName,
            DisplayName = user.DisplayName
        };
    }

    private string GenerateJwtToken(WeaveIdentityUser user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key not configured.")));

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("display_name", user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
