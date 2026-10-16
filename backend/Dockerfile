# ==========================================
# Backend Production Dockerfile (Node.js + Express)
# ==========================================

FROM node:20-slim

# Install system dependencies for health checks and HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests first for efficient layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# Copy backend source code
COPY . .

# Set ownership and switch to non-root user for security
RUN chown -R node:node /app
USER node

# Expose backend port
EXPOSE 5000

# Health check route configured in server.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "server.js"]