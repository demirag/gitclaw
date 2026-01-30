using GitClaw.Core.Interfaces;
using GitClaw.Git;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register GitClaw services
builder.Services.AddSingleton<IGitService, GitService>();

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

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();

app.MapGet("/", () => new
{
    name = "GitClaw API",
    version = "0.1.0",
    description = "GitHub for AI Agents",
    endpoints = new
    {
        docs = "/swagger",
        health = "/health",
        repos = "/api/repositories"
    }
});

app.MapGet("/health", () => new
{
    status = "healthy",
    timestamp = DateTime.UtcNow
});

app.Run();
