# --- Backend dependencies (prod only)
FROM docker.m.daocloud.io/library/node:20 AS backend_deps
WORKDIR /srv/backend
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# --- Backend build stage
FROM docker.m.daocloud.io/library/node:20 AS backend_builder
WORKDIR /srv/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
COPY base/ ../base/
RUN npm run build

# --- Frontend build stage
FROM docker.m.daocloud.io/library/node:20 AS frontend_builder
WORKDIR /srv/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY base/ ../base/
RUN npm run build

# --- Runtime image with Node + Nginx
FROM docker.m.daocloud.io/library/node:20 AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    PORT=2591 \
    FILE_BASE_PATH=/usr/src/app/files

# Install nginx and prepare directories
RUN apt-get update \
  && apt-get install -y nginx \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /run/nginx \
  && mkdir -p /var/log/nginx \
  && mkdir -p /usr/src/app/files \
  && rm -f /etc/nginx/sites-enabled/default \
  && rm -rf /etc/nginx/conf.d/*

# Copy backend artifacts
COPY --from=backend_deps /srv/backend/node_modules ./node_modules
COPY --from=backend_builder /srv/backend/dist ./dist
COPY backend/package.json backend/package-lock.json ./
COPY base ./base

# Copy frontend static build
COPY --from=frontend_builder /srv/frontend/dist /usr/share/nginx/html

# Nginx configuration and entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
