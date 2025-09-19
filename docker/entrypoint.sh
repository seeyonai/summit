#!/bin/sh
set -e

NODE_PID=''
NGINX_PID=''

start_backend() {
  ENTRY_JS="/usr/src/app/dist/index.js"
  if [ ! -f "$ENTRY_JS" ]; then
    ALT_ENTRY="/usr/src/app/dist/backend/src/index.js"
    if [ -f "$ALT_ENTRY" ]; then
      ENTRY_JS="$ALT_ENTRY"
    else
      echo "Error: Backend entry not found at $ENTRY_JS or $ALT_ENTRY" >&2
      exit 1
    fi
  fi
  node "$ENTRY_JS" &
  NODE_PID=$!
  echo "Backend started with PID ${NODE_PID} (entry: $ENTRY_JS)" >&2
}

stop_backend() {
  if [ -n "${NODE_PID}" ]; then
    kill -TERM "${NODE_PID}" 2>/dev/null || true
    wait "${NODE_PID}" 2>/dev/null || true
    NODE_PID=''
  fi
}

stop_nginx() {
  if [ -n "${NGINX_PID}" ]; then
    kill -TERM "${NGINX_PID}" 2>/dev/null || true
    wait "${NGINX_PID}" 2>/dev/null || true
    NGINX_PID=''
  fi
}

term_handler() {
  echo "Received termination signal, stopping services..." >&2
  stop_nginx
  stop_backend
  exit 0
}

trap term_handler INT TERM

start_backend

nginx -g 'daemon off;' &
NGINX_PID=$!
wait "${NGINX_PID}"
term_handler
