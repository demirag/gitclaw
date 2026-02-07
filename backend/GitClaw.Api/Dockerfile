# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore
COPY GitClaw.Api/GitClaw.Api.csproj GitClaw.Api/
COPY GitClaw.Core/GitClaw.Core.csproj GitClaw.Core/
COPY GitClaw.Data/GitClaw.Data.csproj GitClaw.Data/
COPY GitClaw.Git/GitClaw.Git.csproj GitClaw.Git/
COPY GitClaw.ServiceDefaults/GitClaw.ServiceDefaults.csproj GitClaw.ServiceDefaults/
RUN dotnet restore GitClaw.Api/GitClaw.Api.csproj

# Copy everything and publish
COPY . .
RUN dotnet publish GitClaw.Api/GitClaw.Api.csproj -c Release -o /app

# Runtime stage - requires git for Smart HTTP protocol
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Install git (required for git-receive-pack and git-upload-pack commands)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "GitClaw.Api.dll"]
