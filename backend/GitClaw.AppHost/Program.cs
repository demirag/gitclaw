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

// For production deployment, use custom Dockerfile that includes git
// This is REQUIRED because GitProtocolController shells out to native git commands
// (git-receive-pack, git-upload-pack) for Smart HTTP protocol implementation.
// Aspire best practice: Use PublishAsDockerFile() for apps with system dependencies.
// The Dockerfile is in GitClaw.Api directory and references sibling projects.
if (builder.ExecutionContext.IsPublishMode)
{
    api.PublishAsDockerFile();
}

// Add Frontend (Vite + React) - Aspire way
var frontend = builder.AddNpmApp(name: "gitclaw-frontend", workingDirectory: "../../frontend", scriptName: "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithEnvironment("GITCLAW_API_URL", api.GetEndpoint("http"))
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithExternalHttpEndpoints();

// Note: Aspire automatically handles frontend containerization for deployment
// No custom Dockerfile needed for standard Node.js/Vite applications

builder.Build().Run();
