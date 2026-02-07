# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Vite app
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template (envsubst replaces $API_URL and $NGINX_PORT at startup)
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy custom entrypoint script
COPY docker-entrypoint.sh /custom-entrypoint.sh
RUN chmod +x /custom-entrypoint.sh

EXPOSE 80

# Use our custom entrypoint (not overwriting the nginx image's /docker-entrypoint.sh)
ENTRYPOINT ["/custom-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
