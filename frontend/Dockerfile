# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application with production environment variables
# Set VITE_API_BASE_URL to use relative /api path (proxied by nginx)
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Create startup script to substitute environment variables
RUN printf '#!/bin/sh\n\
set -e\n\
# Use GITCLAW_API_HTTPS from Azure environment variables\n\
# Falls back to service name for Azure Container Apps service discovery\n\
export BACKEND_URL="${GITCLAW_API_HTTPS:-http://gitclaw-api}"\n\
echo "Using backend URL: $BACKEND_URL"\n\
# Extract hostname from URL for SSL SNI and Host header\n\
export BACKEND_HOST=$(echo "$BACKEND_URL" | sed -E "s|https?://([^/:]+).*|\\1|")\n\
echo "Backend host: $BACKEND_HOST"\n\
# Substitute environment variables in nginx config\n\
envsubst "\\$BACKEND_URL \\$BACKEND_HOST" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf\n\
# Start nginx\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 8000

CMD ["/docker-entrypoint.sh"]
