using GitClaw.Core.Interfaces;
using GitClaw.Git;
using GitClaw.Data;
using GitClaw.Api.Middleware;
using GitClaw.ServiceDefaults;
using Microsoft.EntityFrameworkCore;

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
// Use Aspire if available, otherwise fallback to connection string
var connectionString = builder.Configuration.GetConnectionString("gitclaw");
if (!string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddDbContext<GitClawDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    // Use Aspire configuration
    builder.AddNpgsqlDbContext<GitClawDbContext>("gitclaw");
}

// Register GitClaw services
builder.Services.AddSingleton<IGitService, GitService>();
builder.Services.AddScoped<IAgentService, AgentService>();  // Changed to Scoped for DbContext
builder.Services.AddScoped<IRepositoryService, RepositoryService>();
builder.Services.AddScoped<IPullRequestService, PullRequestService>();
builder.Services.AddScoped<GitClaw.Core.Services.ISocialService, GitClaw.Data.Services.SocialService>();

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
    await dbContext.Database.MigrateAsync();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

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

app.Run();
