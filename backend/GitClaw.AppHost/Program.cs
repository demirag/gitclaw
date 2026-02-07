var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database
var postgres = builder.AddPostgres("postgres")
    //.WithPgAdmin()
    .AddDatabase("gitclaw");

// Add GitClaw API - runs as .NET project in development
var api = builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithExternalHttpEndpoints();

// For production deployment, use custom Dockerfile that includes git.
// Required because GitProtocolController shells out to native git commands
// (git-receive-pack, git-upload-pack) for Smart HTTP protocol.
// Build context must be backend/ (not GitClaw.Api/) so sibling projects are accessible.
if (builder.ExecutionContext.IsPublishMode)
{
    api.PublishAsDockerFile(container =>
    {
        container.WithDockerfile("../", "GitClaw.Api/Dockerfile");
    });
}

// Add Frontend (Vite + React) - runs npm dev server in development
var frontend = builder.AddNpmApp("gitclaw-frontend", "../../frontend", "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithExternalHttpEndpoints();

if (builder.ExecutionContext.IsPublishMode)
{
    // Tell Aspire the container listens on port 80 (nginx), not the Vite dev port.
    // Re-apply WithExternalHttpEndpoints since WithHttpEndpoint resets the external flag.
    frontend.WithHttpEndpoint(targetPort: 80)
            .WithExternalHttpEndpoints()
            .PublishAsDockerFile();
}

builder.Build().Run();
