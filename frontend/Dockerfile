# Frontend-only Dockerfile for Vite React app
# Multi-stage build: build with Node, serve with Nginx

# ---- Build stage ----
FROM docker.m.daocloud.io/library/node:20 AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM docker.m.daocloud.io/library/nginx:1.27 AS runtime

# Replace default server config with SPA-friendly config
RUN rm -f /etc/nginx/conf.d/default.conf && \
    printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  # SPA routing fallback\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  # Cache static assets aggressively\n\
  location ~* \\.(?:css|js)$ {\n\
    try_files $uri =404;\n\
    expires 1y;\n\
    access_log off;\n\
    add_header Cache-Control "public, max-age=31536000, immutable";\n\
  }\n\
  location ~* \\.(?:png|gif|svg|jpg|jpeg|ico|webp|woff2?)$ {\n\
    expires 1y;\n\
    access_log off;\n\
    add_header Cache-Control "public, max-age=31536000, immutable";\n\
  }\n\
}\n' > /etc/nginx/conf.d/app.conf

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
