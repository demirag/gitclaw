using GitClaw.Core.Interfaces;
using GitClaw.Git;
using GitClaw.Data;
using GitClaw.Api.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Azure.Identity;
using Azure.Core;
using Npgsql;

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
// Configure Azure AD authentication for Azure PostgreSQL when deployed
var connectionString = builder.Configuration.GetConnectionString("gitclaw");
var isAzureDeployment = !builder.Environment.IsDevelopment() &&
                        connectionString?.Contains("postgres.database.azure.com") == true;

if (isAzureDeployment)
{
    // Azure deployment with Entra ID (Azure AD) authentication
    Console.WriteLine("Configuring Azure PostgreSQL with Entra ID authentication");
    Console.WriteLine($"Connection string: {connectionString}");

    // Azure automatically sets AZURE_CLIENT_ID when a managed identity is assigned to the container
    // This is used as the PostgreSQL username for Azure AD authentication
    var managedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
    Console.WriteLine($"Managed Identity Client ID: {managedIdentityClientId ?? "NOT SET (will try without username)"}");

    // Build proper connection string for Azure AD authentication
    var connStringBuilder = new NpgsqlConnectionStringBuilder(connectionString)
    {
        Database = "gitclaw",
        SslMode = SslMode.Require,
        Timeout = 30,
        CommandTimeout = 30
    };

    // If managed identity client ID is available, use it as username
    // Otherwise, rely on DefaultAzureCredential to figure it out
    if (!string.IsNullOrEmpty(managedIdentityClientId))
    {
        connStringBuilder.Username = managedIdentityClientId;
        Console.WriteLine("Using managed identity client ID as PostgreSQL username");
    }

    var enhancedConnectionString = connStringBuilder.ToString();

    var credential = new DefaultAzureCredential();
    var dataSourceBuilder = new NpgsqlDataSourceBuilder(enhancedConnectionString);

    // Use periodic password provider for Azure AD token authentication
    // Tokens are automatically refreshed before expiry
    dataSourceBuilder.UsePeriodicPasswordProvider(async (_, ct) =>
    {
        var token = await credential.GetTokenAsync(
            new TokenRequestContext(["https://ossrdbms-aad.database.windows.net/.default"]),
            ct);
        return token.Token;
    }, TimeSpan.FromHours(1), TimeSpan.FromSeconds(10));

    var dataSource = dataSourceBuilder.Build();

    builder.Services.AddDbContext<GitClawDbContext>(options =>
    {
        options.UseNpgsql(dataSource, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
            npgsqlOptions.CommandTimeout(30);
        });
    }, ServiceLifetime.Scoped);
}
else if (!string.IsNullOrEmpty(connectionString))
{
    // Local development with standard connection string
    builder.Services.AddDbContext<GitClawDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
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
    }, ServiceLifetime.Scoped);
}
else
{
    // Fallback: Use Aspire configuration for local PostgreSQL container
    builder.AddNpgsqlDbContext<GitClawDbContext>("gitclaw");
}

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
