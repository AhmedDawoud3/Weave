namespace Weave.Application.DTOs.Auth;

public class ExternalAuthDto
{
    public string Provider { get; set; } = string.Empty;
    public string IdToken { get; set; } = string.Empty;
}
