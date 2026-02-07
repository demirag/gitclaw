using GitClaw.Core.Interfaces;
using GitClaw.Git;
using GitClaw.Data;
using GitClaw.Api.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Add Aspire service defaults (telemetry, health checks, etc.)
builder.AddServiceDefaults();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Include XML comments if available
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Add PostgreSQL database
// Aspire handles connection for both local container (RunAsContainer) and Azure Flexible Server
builder.AddNpgsqlDbContext<GitClawDbContext>("gitclaw",
    configureDbContextOptions: options =>
    {
        options.UseNpgsql(npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
            npgsqlOptions.CommandTimeout(30);
        });

        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    });

// Register GitClaw services
builder.Services.AddSingleton<IGitService, GitService>();
builder.Services.AddScoped<IAgentService, AgentService>();  // Changed to Scoped for DbContext
builder.Services.AddScoped<IRepositoryService, RepositoryService>();
builder.Services.AddScoped<IPullRequestService, PullRequestService>();
builder.Services.AddScoped<IIssueService, IssueService>();
builder.Services.AddScoped<IReleaseService, ReleaseService>();
builder.Services.AddScoped<GitClaw.Core.Services.ISocialService, GitClaw.Data.Services.SocialService>();

// Register TwitterService with HttpClient for oEmbed API
builder.Services.AddHttpClient<ITwitterService, TwitterService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.Add("User-Agent", "GitClaw/1.0");
});

// Configure CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Map Aspire default endpoints (health checks, etc.)
app.MapDefaultEndpoints();

// Run database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<GitClawDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Ensuring database is created...");
        
        // Wait for database to be ready (for Aspire PostgreSQL container startup)
        var maxRetries = 10;
        var delay = TimeSpan.FromSeconds(2);
        
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                // Try to ensure database exists and run migrations
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("Database migrations completed successfully");
                break;
            }
            catch (Exception ex) when (i < maxRetries - 1)
            {
                logger.LogWarning(ex, "Database not ready yet, retrying in {Delay} seconds... (Attempt {Attempt}/{MaxRetries})", 
                    delay.TotalSeconds, i + 1, maxRetries);
                await Task.Delay(delay);
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to run database migrations");
        throw;
    }
}

// Configure the HTTP request pipeline
// Enable Swagger in all environments for API documentation
app.UseSwagger(options =>
{
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;
});
app.UseSwaggerUI();

app.UseCors();

// Serve static frontend files in production
// In development, Vite dev server runs separately on port 5173
if (!app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// Use rate limiting middleware (should be early in pipeline)
app.UseRateLimiting();

// Use authentication middleware (must be before MapControllers)
app.UseAgentAuthentication();

app.MapControllers();

app.MapGet("/", () => new
{
    name = "GitClaw API",
    version = "0.2.0-postgres",
    description = "GitHub for AI Agents",
    database = "PostgreSQL",
    endpoints = new
    {
        docs = "/swagger",
        health = "/health",
        agents = "/api/agents",
        repos = "/api/repositories"
    }
});

// SPA fallback for React Router (production only)
// Serve index.html for all non-API routes to support client-side routing
if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("index.html");
}

app.Run();
