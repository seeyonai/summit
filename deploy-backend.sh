#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
REMOTE_HOST="chat"
REMOTE_PATH="/opt/summit"
SERVICE_NAME="summit-backend.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

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

ensure_backend_dir() {
  if [ ! -d "$BACKEND_DIR" ]; then
    echo "Backend directory not found at $BACKEND_DIR";
    exit 1;
  fi;
}

ensure_backend_dir;

header "Build backend";
if confirm "Run backend build (npm run build)?"; then
  (cd "$BACKEND_DIR" && npm run build);
fi;

header "Prepare remote directory";
if ssh "$REMOTE_HOST" "test -d '$REMOTE_PATH'"; then
  echo "Remote directory $REMOTE_PATH already exists.";
else
  if confirm "Create remote directory $REMOTE_PATH on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH'";
  fi;
fi;

header "Rsync backend artifacts";
if [ ! -d "$BACKEND_DIR/dist" ]; then
  echo "Build output not found at $BACKEND_DIR/dist.";
  echo "Run the build step before syncing.";
else
  if confirm "Sync backend code to $REMOTE_HOST:$REMOTE_PATH?"; then
    rsync -avz --delete --exclude 'node_modules' --exclude '.env' --exclude '.git' \
      "$BACKEND_DIR/" "$REMOTE_HOST:$REMOTE_PATH/";
  fi;
fi;

header "Ensure systemd service";
if ssh "$REMOTE_HOST" "test -f '$SERVICE_PATH'"; then
  echo "Service file already exists at $SERVICE_PATH.";
else
  if confirm "Create systemd service $SERVICE_NAME for backend?"; then
    ssh "$REMOTE_HOST" "sudo tee '$SERVICE_PATH' >/dev/null" <<'EOF'
[Unit]
Description=Summit Backend API
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/summit
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/summit/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    if confirm "Enable $SERVICE_NAME on $REMOTE_HOST?"; then
      ssh "$REMOTE_HOST" "sudo systemctl enable '$SERVICE_NAME'";
    fi;
  fi;
fi;

service_registered=0;
if ssh "$REMOTE_HOST" "sudo systemctl list-unit-files '$SERVICE_NAME' --no-legend" >/dev/null 2>&1; then
  service_registered=1;
fi;

if [ "$service_registered" -eq 1 ]; then
  header "Reload systemd and restart service";
  if confirm "Reload systemd daemon on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo systemctl daemon-reload";
  fi;
  if confirm "Restart $SERVICE_NAME on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo systemctl restart '$SERVICE_NAME'";
  fi;
else
  echo "Systemd service $SERVICE_NAME is not registered; skipping reload prompts.";
fi;

header "Backend deployment script complete";
