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

    public async Task<AuthResponseDto> ExternalLoginAsync(ExternalAuthDto dto, CancellationToken ct = default)
    {
        string email = string.Empty;
        string name = string.Empty;

        try
        {
            if (dto.Provider.Equals("Google", StringComparison.OrdinalIgnoreCase))
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Weave-App");
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", dto.IdToken);
                var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo", ct);
                if (!response.IsSuccessStatusCode)
                {
                    return new AuthResponseDto { Succeeded = false, Errors = new List<string> { "Invalid Google token." } };
                }
                var googleUser = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                if (googleUser.TryGetProperty("email", out var emailElement))
                    email = emailElement.GetString() ?? string.Empty;
                if (googleUser.TryGetProperty("name", out var nameElement))
                    name = nameElement.GetString() ?? string.Empty;
            }
            else if (dto.Provider.Equals("Facebook", StringComparison.OrdinalIgnoreCase))
            {
                using var httpClient = new HttpClient();
                var response = await httpClient.GetAsync($"https://graph.facebook.com/me?fields=id,name,email&access_token={dto.IdToken}", ct);
                if (!response.IsSuccessStatusCode)
                {
                    return new AuthResponseDto { Succeeded = false, Errors = new List<string> { "Invalid Facebook token." } };
                }
                var facebookUser = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                if (facebookUser.TryGetProperty("email", out var emailElement))
                    email = emailElement.GetString() ?? string.Empty;
                if (facebookUser.TryGetProperty("name", out var nameElement))
                    name = nameElement.GetString() ?? string.Empty;
            }
            else
            {
                return new AuthResponseDto { Succeeded = false, Errors = new List<string> { "Invalid provider." } };
            }
        }
        catch (Exception ex)
        {
            return new AuthResponseDto { Succeeded = false, Errors = new List<string> { $"Token validation failed: {ex.Message}" } };
        }

        if (string.IsNullOrEmpty(email))
        {
            return new AuthResponseDto { Succeeded = false, Errors = new List<string> { "Email is required from the external provider." } };
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            // Create user
            user = new WeaveIdentityUser
            {
                UserName = email.Split('@')[0] + Guid.NewGuid().ToString().Substring(0, 4), // Simple unique username
                Email = email,
                DisplayName = string.IsNullOrEmpty(name) ? email.Split('@')[0] : name,
                CreatedAt = DateTime.UtcNow
            };
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return new AuthResponseDto { Succeeded = false, Errors = createResult.Errors.Select(e => e.Description).ToList() };
            }
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
