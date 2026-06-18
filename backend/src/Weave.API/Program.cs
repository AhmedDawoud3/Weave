using Weave.API.Hubs;
using Weave.Application;
using Weave.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ---- Layer Registrations ----
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// ---- API Services ----
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Weave API",
        Version = "v1",
        Description = "Backend orchestrator for the Weave Intelligent Visual IDE for Deep Learning."
    });

    // Include XML documentation
    var xmlFilename = $"{typeof(Program).Assembly.GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Ignore obsolete endpoints and properties
    options.IgnoreObsoleteActions();
    options.IgnoreObsoleteProperties();

    // Use inline enum definitions
    options.UseInlineDefinitionsForEnums();
});

// ---- CORS ----
builder.Services.AddCors(options =>
{
    options.AddPolicy("WeavePolicy", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? new[] { "http://localhost:3000", "http://localhost:5173" })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ---- Middleware Pipeline ----
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weave API v1"));
}

if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// Serve SPA static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("WeavePolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TrainingHub>("/hubs/training");

// SPA fallback: serve index.html for any unmatched routes
app.MapFallbackToFile("index.html");

// Apply pending database migrations on startup in Production
if (app.Environment.IsProduction())
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<Weave.Infrastructure.Persistence.WeaveDbContext>();
        Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.Migrate(context.Database);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

app.Run();

