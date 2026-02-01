var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .AddDatabase("gitclaw");

// Add GitClaw API
var api = builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
    .WithReference(postgres)
    .WaitFor(postgres)  // Wait for PostgreSQL to be ready
    .WithExternalHttpEndpoints();

// Add Frontend (Vite + React) - Aspire way
var frontend = builder.AddNpmApp(name: "gitclaw-frontend", workingDirectory: "../../frontend", scriptName: "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithExternalHttpEndpoints();

// For production deployment, publish as Docker container
if (builder.ExecutionContext.IsPublishMode)
{
    frontend.PublishAsDockerFile();
}

builder.Build().Run();
