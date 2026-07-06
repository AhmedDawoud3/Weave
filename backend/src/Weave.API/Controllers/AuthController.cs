using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Weave.Application.DTOs.Auth;
using Weave.Application.Interfaces;

namespace Weave.API.Controllers;

/// <summary>
/// REST API controller for user authentication — registration and login.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Register a new user account.
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(
        [FromBody] RegisterRequestDto dto,
        [FromServices] IValidator<RegisterRequestDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Succeeded = false,
                Errors = validation.Errors.Select(e => e.ErrorMessage).ToList()
            });
        }

        var result = await _authService.RegisterAsync(dto, ct);

        if (!result.Succeeded)
            return BadRequest(result);

        return Ok(result);
    }

    /// <summary>
    /// Login with email and password to receive a JWT token.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto dto,
        [FromServices] IValidator<LoginRequestDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Succeeded = false,
                Errors = validation.Errors.Select(e => e.ErrorMessage).ToList()
            });
        }

        var result = await _authService.LoginAsync(dto, ct);

        if (!result.Succeeded)
            return Unauthorized(result);

        return Ok(result);
    }

    /// <summary>
    /// Login or register with an external provider like Google or Facebook.
    /// </summary>
    [HttpPost("external-login")]
    public async Task<ActionResult<AuthResponseDto>> ExternalLogin(
        [FromBody] ExternalAuthDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(dto.Provider) || string.IsNullOrEmpty(dto.IdToken))
        {
            return BadRequest(new AuthResponseDto { Succeeded = false, Errors = new List<string> { "Provider and IdToken are required." } });
        }

        var result = await _authService.ExternalLoginAsync(dto, ct);

        if (!result.Succeeded)
            return Unauthorized(result);

        return Ok(result);
    }
}
