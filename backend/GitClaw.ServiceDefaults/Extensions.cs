using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace GitClaw.ServiceDefaults;

public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
    {
        // Add health checks
        builder.Services.AddHealthChecks();
        
        // Add telemetry (basic for now)
        // Can be extended with OpenTelemetry later
        
        return builder;
    }

    public static WebApplication MapDefaultEndpoints(this WebApplication app)
    {
        // Map health check endpoints
        app.MapHealthChecks("/health");
        app.MapHealthChecks("/alive", new HealthCheckOptions
        {
            Predicate = _ => false
        });
        
        return app;
    }
}
