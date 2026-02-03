# Simplified Dockerfile for Render deployment
# Builds client and server, serves everything from Express

# Stage 1: Build Client
FROM node:18-alpine AS client-builder

WORKDIR /client
COPY client/package*.json ./
RUN npm install && npm cache clean --force
COPY client/ .
# Remove test files before building
RUN rm -rf src/__tests__ src/**/*.test.* src/**/*.spec.*
RUN npm run build

# Stage 2: Build Server
FROM node:18-alpine AS server-builder

WORKDIR /server
COPY server/package*.json ./
RUN npm install && npm cache clean --force
COPY server/ .
# Remove test files before building
RUN rm -rf src/__tests__ src/**/*.test.* src/**/*.spec.*
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine

# Create necessary directories
RUN mkdir -p /app/logs /app/public

WORKDIR /app

# Copy server built files and dependencies
COPY --from=server-builder /server/dist ./dist
COPY --from=server-builder /server/node_modules ./node_modules
COPY --from=server-builder /server/package.json ./

# Copy client built files to public directory
COPY --from=client-builder /client/dist ./public

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the Node.js server
CMD ["node", "dist/index.js"]
