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
  read -r -p "$prompt [y/N]: " response;
  case "$response" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) echo "Skipped."; return 1 ;;
  esac;
}

header() {
  echo;
  echo "==> $1";
}

ensure_frontend_dir() {
  if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Frontend directory not found at $FRONTEND_DIR";
    exit 1;
  fi;
}

ensure_frontend_dir;

header "Build frontend";
if confirm "Run frontend build (npm run build)?"; then
  (cd "$FRONTEND_DIR" && npm run build);
fi;

header "Prepare remote directory";
if ssh "$REMOTE_HOST" "test -d '$REMOTE_PATH'"; then
  echo "Remote directory $REMOTE_PATH already exists.";
else
  if confirm "Create remote directory $REMOTE_PATH on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH'";
  fi;
fi;

header "Rsync frontend artifacts";
if [ ! -d "$FRONTEND_DIR/dist" ]; then
  echo "Build output not found at $FRONTEND_DIR/dist.";
  echo "Run the build step before syncing.";
else
  if confirm "Sync frontend dist to $REMOTE_HOST:$REMOTE_PATH?"; then
    rsync -avz --delete "$FRONTEND_DIR/dist/" "$REMOTE_HOST:$REMOTE_PATH/";
    if [ -f "$FRONTEND_DIR/package.json" ]; then
      if confirm "Sync frontend package.json for reference?"; then
        rsync -avz "$FRONTEND_DIR/package.json" "$REMOTE_HOST:$REMOTE_PATH/package.json";
      fi;
    fi;
    if [ -f "$FRONTEND_DIR/package-lock.json" ]; then
      if confirm "Sync frontend package-lock.json for reference?"; then
        rsync -avz "$FRONTEND_DIR/package-lock.json" "$REMOTE_HOST:$REMOTE_PATH/package-lock.json";
      fi;
    fi;
  fi;
fi;

header "Ensure nginx configuration";
if ssh "$REMOTE_HOST" "test -f '$NGINX_AVAILABLE'"; then
  echo "Nginx config already exists at $NGINX_AVAILABLE.";
else
  if confirm "Create nginx site config for frontend (server_name $SERVER_NAME)?"; then
    ssh "$REMOTE_HOST" "sudo tee '$NGINX_AVAILABLE' >/dev/null" <<EOF
server {
  listen 80;
  server_name $SERVER_NAME;
  root /var/www/summit;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF
  fi;
fi;

if ssh "$REMOTE_HOST" "test -L '$NGINX_ENABLED'"; then
  echo "Nginx site already enabled at $NGINX_ENABLED.";
else
  if ssh "$REMOTE_HOST" "test -f '$NGINX_AVAILABLE'"; then
    if confirm "Enable nginx site by creating symlink?"; then
      ssh "$REMOTE_HOST" "sudo ln -sf '$NGINX_AVAILABLE' '$NGINX_ENABLED'";
    fi;
  else
    echo "Nginx site config missing; skipping enable step.";
  fi;
fi;

header "Reload nginx";
if confirm "Test nginx configuration on $REMOTE_HOST?"; then
  ssh "$REMOTE_HOST" "sudo nginx -t";
fi;
if confirm "Reload nginx on $REMOTE_HOST?"; then
  ssh "$REMOTE_HOST" "sudo systemctl reload nginx";
fi;

header "Frontend deployment script complete";
