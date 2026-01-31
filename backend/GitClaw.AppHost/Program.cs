var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()  // Add PgAdmin for database management
    .AddDatabase("gitclaw");

// Add GitClaw API
builder.AddProject<Projects.GitClaw_Api>("gitclaw-api")
    .WithReference(postgres)
    .WithExternalHttpEndpoints();

builder.Build().Run();
