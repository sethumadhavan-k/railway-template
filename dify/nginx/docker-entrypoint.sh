#!/bin/sh
set -eu

export PORT="${PORT:-8080}"
export API_HOST="${API_HOST:-api.railway.internal}"
export API_PORT="${API_PORT:-5001}"
export WEB_HOST="${WEB_HOST:-web.railway.internal}"
export WEB_PORT="${WEB_PORT:-8080}"
export API_WEBSOCKET_HOST="${API_WEBSOCKET_HOST:-api-websocket.railway.internal}"
export API_WEBSOCKET_PORT="${API_WEBSOCKET_PORT:-5001}"
export PLUGIN_DAEMON_HOST="${PLUGIN_DAEMON_HOST:-plugin-daemon.railway.internal}"
export PLUGIN_DAEMON_PORT="${PLUGIN_DAEMON_PORT:-5002}"
export NGINX_PROXY_READ_TIMEOUT="${NGINX_PROXY_READ_TIMEOUT:-3600s}"
export NGINX_PROXY_SEND_TIMEOUT="${NGINX_PROXY_SEND_TIMEOUT:-3600s}"

envsubst '${PORT} ${API_HOST} ${API_PORT} ${WEB_HOST} ${WEB_PORT} ${API_WEBSOCKET_HOST} ${API_WEBSOCKET_PORT} ${PLUGIN_DAEMON_HOST} ${PLUGIN_DAEMON_PORT} ${NGINX_PROXY_READ_TIMEOUT} ${NGINX_PROXY_SEND_TIMEOUT}' \
  < /etc/nginx/proxy.conf.template \
  > /etc/nginx/proxy.conf

envsubst '${PORT} ${API_HOST} ${API_PORT} ${WEB_HOST} ${WEB_PORT} ${API_WEBSOCKET_HOST} ${API_WEBSOCKET_PORT} ${PLUGIN_DAEMON_HOST} ${PLUGIN_DAEMON_PORT} ${NGINX_PROXY_READ_TIMEOUT} ${NGINX_PROXY_SEND_TIMEOUT}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
