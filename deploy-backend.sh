#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
REMOTE_HOST="chat"
REMOTE_PATH="/opt/summit"
SERVICE_NAME="summit-backend.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"
AUTO_YES=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes)
      AUTO_YES="yes"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-y|--yes]"
      echo "  -y, --yes    Automatically confirm all prompts"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h for help"
      exit 1
      ;;
  esac
done

confirm() {
  local prompt="$1";
  if [ "$AUTO_YES" = "yes" ]; then
    echo "$prompt [Y/n]: Y";
    return 0;
  fi;
  local response;
  read -n 1 -r -p "$prompt [Y/n]: " response;
  echo;
  case "$response" in
    [nN]) echo "⏭️  Skipped."; return 1 ;;
    *) return 0 ;;
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

header "🔨 Build backend";
if confirm "📦 Run backend build (npm run build)?"; then
  (cd "$BACKEND_DIR" && npm run build);
fi;

header "📁 Prepare remote directory";
if ssh "$REMOTE_HOST" "test -d '$REMOTE_PATH'"; then
  echo "Remote directory $REMOTE_PATH already exists.";
else
  if confirm "📂 Create remote directory $REMOTE_PATH on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH'";
  fi;
fi;

header "🔄 Rsync backend artifacts";
if [ ! -d "$BACKEND_DIR/dist" ]; then
  echo "Build output not found at $BACKEND_DIR/dist.";
  echo "Run the build step before syncing.";
else
  if confirm "📤 Sync backend code to $REMOTE_HOST:$REMOTE_PATH?"; then
    rsync -avz --delete --exclude '/node_modules' --exclude '/files' --exclude '/logs' --exclude '/customization.json' --exclude '/src' --exclude '.env' --exclude '.env.local' --exclude '.env.production' --exclude '.env.production.local' --exclude '.git' \
      "$BACKEND_DIR/" "$REMOTE_HOST:$REMOTE_PATH/";
    if confirm "📦 Install backend dependencies on $REMOTE_HOST?"; then
      ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && npm install --omit=dev";
    fi;
  fi;
fi;

header "📂 Ensure files directory";
ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH/files' && sudo chmod 777 '$REMOTE_PATH/files'";

header "� Ensure logs directory";
ssh "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_PATH/logs' && sudo chmod 777 '$REMOTE_PATH/logs'";

header "�🔐 Sync production environment file";
if [ -f "$BACKEND_DIR/.env.production" ]; then
  if confirm "📝 Sync .env.production to $REMOTE_HOST?"; then
    rsync -avz "$BACKEND_DIR/.env.production" "$REMOTE_HOST:$REMOTE_PATH/";
  fi;
else
  echo "No .env.production file found at $BACKEND_DIR/.env.production, skipping.";
fi;

if [ -f "$BACKEND_DIR/.env.production.local" ]; then
  if confirm "📝 Sync .env.production.local to $REMOTE_HOST?"; then
    rsync -avz "$BACKEND_DIR/.env.production.local" "$REMOTE_HOST:$REMOTE_PATH";
  fi;
else
  echo "No .env.production.local file found at $BACKEND_DIR/.env.production.local, skipping.";
fi;

header "🎨 Sync customization.json";
if [ -f "$BACKEND_DIR/customization.production.json" ]; then
  if confirm "📝 Sync customization.production.json to $REMOTE_HOST:$REMOTE_PATH/customization.json?"; then
    rsync -avz "$BACKEND_DIR/customization.production.json" "$REMOTE_HOST:$REMOTE_PATH/customization.json";
  fi;
else
  echo "No customization.production.json file found at $BACKEND_DIR/customization.production.json, skipping.";
fi;

service_registered=0;
if ssh "$REMOTE_HOST" "sudo systemctl list-unit-files '$SERVICE_NAME' --no-legend" >/dev/null 2>&1; then
  service_registered=1;
fi;

if [ "$service_registered" -eq 1 ]; then
  if confirm "🚀 Restart $SERVICE_NAME on $REMOTE_HOST?"; then
    ssh "$REMOTE_HOST" "sudo systemctl restart '$SERVICE_NAME'";
  fi;
  header "📊 Check service status";

  ssh "$REMOTE_HOST" "sudo systemctl status '$SERVICE_NAME' --no-pager";
else
  echo "Systemd service $SERVICE_NAME is not registered; skipping reload prompts.";
fi;

header "✅ Backend deployment script complete";
