#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
AUTO_YES=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes)
      AUTO_YES="-y"
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

"$ROOT_DIR/deploy-backend.sh" $AUTO_YES;

"$ROOT_DIR/deploy-frontend.sh" $AUTO_YES;

echo;
echo "==> Combined deployment complete";
