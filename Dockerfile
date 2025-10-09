# ============================================
# Stage 1: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Python Backend + Nginx
# ============================================
FROM python:3.11-slim

# Install nginx, supervisor, and curl (for healthcheck)
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend code
COPY backend/ /app/backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy built frontend to nginx under /duty/ path
COPY --from=frontend-builder /app/dist /usr/share/nginx/html/duty

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create data directory
RUN mkdir -p /data/backups && chmod 777 /data

# Expose ports
EXPOSE 80 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:5001/api/health || exit 1

# Start supervisor (manages both nginx and Flask)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
