#!/bin/sh
set -e

NODE_PID=''
NGINX_PID=''

start_backend() {
  node /usr/src/app/dist/index.js &
  NODE_PID=$!
  echo "Backend started with PID ${NODE_PID}" >&2
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
