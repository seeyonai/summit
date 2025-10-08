#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

"$ROOT_DIR/deploy-backend.sh";

"$ROOT_DIR/deploy-frontend.sh";

echo;
echo "==> Combined deployment complete";
