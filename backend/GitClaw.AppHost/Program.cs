var builder = DistributedApplication.CreateBuilder(args);

// Add Azure PostgreSQL Flexible Server with password authentication
// - Local development: runs as a Docker container via RunAsContainer()
// - Azure deployment: provisions an Azure PostgreSQL Flexible Server
var username = builder.AddParameter("pg-username", secret: true);
var password = builder.AddParameter("pg-password", secret: true);

var postgres = builder.AddAzurePostgresFlexibleServer("postgres")
    .WithPasswordAuthentication(username, password)
    .RunAsContainer()
    .AddDatabase("gitclaw");

// Add GitClaw API - runs as .NET project in development
var api = builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithExternalHttpEndpoints();

// Configure git repository storage persistence
// - Local development: use a project-local directory so repos survive restarts
// - Production: mount an Azure Files volume for durable, shared storage
if (builder.ExecutionContext.IsPublishMode)
{
    // Production: custom Dockerfile with git + persistent volume for repo storage
    // Required because GitProtocolController shells out to native git commands
    // (git-receive-pack, git-upload-pack) for Smart HTTP protocol.
    // Build context must be backend/ (not GitClaw.Api/) so sibling projects are accessible.
    api.PublishAsDockerFile(container =>
    {
        container.WithDockerfile("../", "GitClaw.Api/Dockerfile");
        container.WithVolume("gitclaw-repos", "/data/gitclaw-repos");
        container.WithEnvironment("GitStorage__BasePath", "/data/gitclaw-repos");
    });
}
else
{
    // Local development: persist repos in a project-local directory (not /tmp)
    var localRepoPath = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "../../.data/repos"));
    api.WithEnvironment("GitStorage__BasePath", localRepoPath);
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
