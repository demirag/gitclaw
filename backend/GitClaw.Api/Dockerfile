# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
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
