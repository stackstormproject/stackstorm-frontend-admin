# ==============================================================================
# Multi-Stage Dockerfile — Admin Control Room Portal SPA
# StackStorm E-Commerce Platform — Dickwella Fashion Corner
# Stage 1: Build & Compile React 18 + Vite Admin App
# Stage 2: Serve High-Performance Static Bundle with Nginx Alpine
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build static bundle
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine AS runner

# Remove default nginx static site
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled production bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
