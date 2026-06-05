using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Weave.Application.Interfaces;
using Weave.Domain.Contracts;
using Weave.Infrastructure.Engine;
using Weave.Infrastructure.Identity;
using Weave.Infrastructure.Persistence;
using Weave.Infrastructure.Repositories;
using Weave.Infrastructure.Services;

namespace Weave.Infrastructure;

/// <summary>
/// Registers all Infrastructure layer services into the DI container.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        // ---- Database ----
        services.AddDbContext<WeaveDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(WeaveDbContext).Assembly.FullName)));

        // ---- Identity ----
        services.AddIdentity<WeaveIdentityUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<WeaveDbContext>()
        .AddDefaultTokenProviders();

        // ---- JWT Authentication ----
        var jwtSettings = configuration.GetSection("Jwt");
        var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]
            ?? throw new InvalidOperationException("JWT Key is not configured."));

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };

            // Support SignalR token via query string
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;

                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
            };
        });

        // ---- Repositories ----
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<ISubGraphRepository, SubGraphRepository>();
        services.AddScoped<INetworkStateRepository, NetworkStateRepository>();

        // ---- Application Services ----
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IAuthService, AuthService>();

        // ---- Engine Client (typed HttpClient) ----
        services.AddHttpClient<IEngineOrchestrator, EngineClient>(client =>
        {
            var engineUrl = configuration["Engine:BaseUrl"] ?? "http://127.0.0.1:8000";
            client.BaseAddress = new Uri(engineUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("Accept", "application/json");

            var apiKey = configuration["Engine:ApiKey"];
            if (!string.IsNullOrEmpty(apiKey))
            {
                client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
            }
        });

        return services;
    }
}
