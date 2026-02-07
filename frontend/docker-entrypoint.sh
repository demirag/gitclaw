#!/bin/sh
set -e

# Get API URL - try Aspire service reference, then API_URL env, then default
# Prefer HTTPS to avoid 301 redirects (ACA enforces HTTPS on external FQDNs)
if [ -z "$API_URL" ]; then
    # Try Aspire-style service reference (env var name has hyphens, must use printenv)
    API_URL=$(printenv 'services__gitclaw-api__https__0' 2>/dev/null || \
              printenv 'services__gitclaw-api__http__0' 2>/dev/null || \
              echo 'http://localhost:5113')
fi
export API_URL

# Port for nginx to listen on (Azure Container Apps may set PORT)
export NGINX_PORT="${PORT:-80}"

# Generate nginx config from template
# Only substitute our variables - leave nginx variables ($uri, $host, etc.) untouched
envsubst '$API_URL $NGINX_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx on port $NGINX_PORT, proxying API to $API_URL"

exec "$@"
