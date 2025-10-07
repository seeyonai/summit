#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

confirm() {
  local prompt="$1";
  local response;
  read -r -p "$prompt [y/N]: " response;
  case "$response" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) echo "Skipped."; return 1 ;;
  esac;
}

if confirm "Run backend deployment script?"; then
  "$ROOT_DIR/deploy-backend.sh";
fi;

if confirm "Run frontend deployment script?"; then
  "$ROOT_DIR/deploy-frontend.sh";
fi;

echo;
echo "==> Combined deployment complete";
