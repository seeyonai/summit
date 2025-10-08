#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
REMOTE_HOST="chat"
REMOTE_PATH="/var/www/summit"

confirm() {
  local prompt="$1";
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

header "✅ Frontend deployment script complete";
