# Multi-stage Dockerfile for Render deployment
# Builds both client and server into a single container

# Stage 1: Build Client
FROM node:18-alpine AS client-builder

WORKDIR /client
COPY client/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY client/ .
RUN npm run build

# Stage 2: Build Server
FROM node:18-alpine AS server-builder

WORKDIR /server
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY server/ .
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine

# Install nginx and dependencies
RUN apk add --no-cache nginx wget

# Create necessary directories
RUN mkdir -p /app/logs /run/nginx /var/log/nginx

# Copy server built files and dependencies
WORKDIR /app
COPY --from=server-builder /server/dist ./dist
COPY --from=server-builder /server/node_modules ./node_modules
COPY --from=server-builder /server/package.json ./

# Copy client built files to nginx directory
COPY --from=client-builder /client/dist /usr/share/nginx/html

# Configure Nginx
RUN echo 'server { \n\
    listen 80; \n\
    server_name _; \n\
    root /usr/share/nginx/html; \n\
    index index.html; \n\
    \n\
    # Gzip compression \n\
    gzip on; \n\
    gzip_vary on; \n\
    gzip_min_length 1024; \n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \n\
    \n\
    # Security headers \n\
    add_header X-Frame-Options "SAMEORIGIN" always; \n\
    add_header X-Content-Type-Options "nosniff" always; \n\
    add_header X-XSS-Protection "1; mode=block" always; \n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \n\
    \n\
    # Handle SPA routing \n\
    location / { \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    \n\
    # API proxy to backend \n\
    location /api { \n\
        proxy_pass http://127.0.0.1:3001; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_set_header X-Forwarded-Proto $scheme; \n\
        proxy_cache_bypass $http_upgrade; \n\
        proxy_read_timeout 300s; \n\
        proxy_connect_timeout 75s; \n\
    } \n\
    \n\
    # Socket.IO proxy \n\
    location /socket.io { \n\
        proxy_pass http://127.0.0.1:3001; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_set_header X-Forwarded-Proto $scheme; \n\
        proxy_cache_bypass $http_upgrade; \n\
        proxy_read_timeout 86400s; \n\
        proxy_connect_timeout 75s; \n\
    } \n\
    \n\
    # Cache static assets \n\
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \n\
        expires 1y; \n\
        add_header Cache-Control "public, immutable"; \n\
        access_log off; \n\
    } \n\
    \n\
    # Disable access to hidden files \n\
    location ~ /\. { \n\
        deny all; \n\
        access_log off; \n\
        log_not_found off; \n\
    } \n\
}' > /etc/nginx/http.d/default.conf

# Create startup script
RUN echo '#!/bin/sh \n\
set -e \n\
\n\
echo "Starting Node.js server..." \n\
node /app/dist/index.js & \n\
SERVER_PID=$! \n\
\n\
echo "Waiting for server to be ready..." \n\
sleep 5 \n\
\n\
echo "Starting Nginx..." \n\
nginx -g "daemon off;" & \n\
NGINX_PID=$! \n\
\n\
echo "Application started successfully" \n\
echo "Server PID: $SERVER_PID" \n\
echo "Nginx PID: $NGINX_PID" \n\
\n\
# Wait for any process to exit \n\
wait -n \n\
\n\
# Exit with status of process that exited first \n\
exit $?' > /start.sh && chmod +x /start.sh

# Expose port (Render will map this to their public port)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start both services
CMD ["/start.sh"]
