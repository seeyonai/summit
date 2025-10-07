#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
REMOTE_HOST="chat"
REMOTE_PATH="/var/www/summit"
SERVER_NAME="summit.seeyon.chat"
NGINX_AVAILABLE="/etc/nginx/sites-available/summit"
NGINX_ENABLED="/etc/nginx/sites-enabled/summit"

confirm() {
  local prompt="$1";
  local response;
  read -n 1 -r -p "$prompt [y/N]: " response;
  echo;
  case "$response" in
    [yY]) return 0 ;;
    *) echo "⏭️  Skipped."; return 1 ;;
  esac;
}

header() {
  echo;
  echo "==> $1";
}

ensure_frontend_dir() {
  if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found at $FRONTEND_DIR";
    exit 1;
  fi;
}

ensure_frontend_dir;

header "🔨 Build frontend";
if confirm "📦 Run frontend build (npm run build)?"; then
  (cd "$FRONTEND_DIR" && npm run build);
fi;

header "📁 Prepare remote directory";
if ssh "$REMOTE_HOST" "test -d '$REMOTE_PATH'"; then
  echo "✓ Remote directory $REMOTE_PATH already exists.";
else
  if confirm "📂 Create remote directory $REMOTE_PATH on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH'";
  fi;
fi;

header "🔄 Rsync frontend artifacts";
if [ ! -d "$FRONTEND_DIR/dist" ]; then
  echo "⚠️  Build output not found at $FRONTEND_DIR/dist.";
  echo "💡 Run the build step before syncing.";
else
  if confirm "📤 Sync frontend dist to $REMOTE_HOST:$REMOTE_PATH?"; then
    rsync -avz --delete "$FRONTEND_DIR/dist/" "$REMOTE_HOST:$REMOTE_PATH/";
  fi;
fi;

header "🌐 Ensure nginx configuration";
if ssh "$REMOTE_HOST" "test -f '$NGINX_AVAILABLE'"; then
  echo "ℹ️  Existing nginx config detected at $NGINX_AVAILABLE.";
fi;

if confirm "⚙️  Install or update nginx site config for frontend (server_name $SERVER_NAME)?"; then
  ssh "$REMOTE_HOST" "sudo tee '$NGINX_AVAILABLE' >/dev/null" <<EOF
server {
  listen 80;
  server_name $SERVER_NAME;

  root $REMOTE_PATH;
  index index.html;
  client_max_body_size 100M;

  location /api/ws {
    proxy_pass http://127.0.0.1:2592;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Origin \$http_origin;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:2591;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Origin \$http_origin;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /files/ {
    proxy_pass http://127.0.0.1:2591;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Origin \$http_origin;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /ws/ {
    proxy_pass http://127.0.0.1:2591;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header Origin \$http_origin;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
  }

  location = /health {
    proxy_pass http://127.0.0.1:2591/health;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Origin \$http_origin;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF
fi;

if ssh "$REMOTE_HOST" "test -L '$NGINX_ENABLED'"; then
  echo "✓ Nginx site already enabled at $NGINX_ENABLED.";
else
  if ssh "$REMOTE_HOST" "test -f '$NGINX_AVAILABLE'"; then
    if confirm "🔗 Enable nginx site by creating symlink?"; then
      ssh "$REMOTE_HOST" "sudo ln -sf '$NGINX_AVAILABLE' '$NGINX_ENABLED'";
    fi;
  else
    echo "⏭️  Nginx site config missing; skipping enable step.";
  fi;
fi;

header "🔄 Reload nginx";
if confirm "🧪 Test nginx configuration on $REMOTE_HOST?"; then
  ssh "$REMOTE_HOST" "sudo nginx -t";
fi;
if confirm "♻️  Reload nginx on $REMOTE_HOST?"; then
  ssh "$REMOTE_HOST" "sudo systemctl reload nginx";
fi;

header "✅ Frontend deployment script complete";
