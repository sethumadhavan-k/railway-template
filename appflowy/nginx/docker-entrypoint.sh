#!/bin/sh
set -eu

export PORT="${PORT:-8080}"
export APPFLOWY_CLOUD_HOST="${APPFLOWY_CLOUD_HOST:-appflowy-cloud.railway.internal}"
export APPFLOWY_CLOUD_PORT="${APPFLOWY_CLOUD_PORT:-8000}"
export GOTRUE_HOST="${GOTRUE_HOST:-gotrue.railway.internal}"
export GOTRUE_PORT="${GOTRUE_PORT:-9999}"
export ADMIN_FRONTEND_HOST="${ADMIN_FRONTEND_HOST:-admin-frontend.railway.internal}"
export ADMIN_FRONTEND_PORT="${ADMIN_FRONTEND_PORT:-3000}"
export APPFLOWY_WEB_HOST="${APPFLOWY_WEB_HOST:-appflowy-web.railway.internal}"
export APPFLOWY_WEB_PORT="${APPFLOWY_WEB_PORT:-80}"
export MINIO_HOST="${MINIO_HOST:-minio.railway.internal}"
export MINIO_API_PORT="${MINIO_API_PORT:-9000}"
export MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

envsubst '${PORT} ${APPFLOWY_CLOUD_HOST} ${APPFLOWY_CLOUD_PORT} ${GOTRUE_HOST} ${GOTRUE_PORT} ${ADMIN_FRONTEND_HOST} ${ADMIN_FRONTEND_PORT} ${APPFLOWY_WEB_HOST} ${APPFLOWY_WEB_PORT} ${MINIO_HOST} ${MINIO_API_PORT} ${MINIO_CONSOLE_PORT}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
