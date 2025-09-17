# syntax=docker/dockerfile:1

# --- Backend dependencies (prod only)
FROM registry.daocloud.io/library/node:20-alpine AS backend_deps
WORKDIR /srv/backend
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# --- Backend build stage
FROM registry.daocloud.io/library/node:20-alpine AS backend_builder
WORKDIR /srv/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- Frontend build stage
FROM registry.daocloud.io/library/node:20-alpine AS frontend_builder
WORKDIR /srv/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Runtime image with Node + Nginx
FROM registry.daocloud.io/library/node:20-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    PORT=2591

# Install nginx and prepare directories
RUN apk add --no-cache nginx \
 && mkdir -p /run/nginx \
 && mkdir -p /var/log/nginx \
 && rm -rf /etc/nginx/conf.d/*

# Copy backend artifacts
COPY --from=backend_deps /srv/backend/node_modules ./node_modules
COPY --from=backend_builder /srv/backend/dist ./dist
COPY backend/package.json backend/package-lock.json ./

# Copy frontend static build
COPY --from=frontend_builder /srv/frontend/dist /usr/share/nginx/html

# Nginx configuration and entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
