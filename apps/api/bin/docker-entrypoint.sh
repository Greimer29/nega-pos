#!/bin/sh
# Production entrypoint for Nega POS API (Railway / Docker).
# - Ensures upload storage directory exists (Volume or local path)
# - Optionally runs migrations (local docker-compose)
# - Bootstraps seeders ONLY if users table is empty (never overwrites prod data)
# - Starts the HTTP server
set -e

STORAGE_PATH="${STORAGE_LOCAL_PATH:-${RAILWAY_VOLUME_MOUNT_PATH:-./storage/uploads}}"
echo "==> Ensuring storage directory: ${STORAGE_PATH}"
mkdir -p "${STORAGE_PATH}"

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  echo "==> Running migrations (RUN_MIGRATIONS_ON_START=true)…"
  node ace migration:run --force
fi

if [ "${SKIP_BOOTSTRAP_SEED:-false}" != "true" ]; then
  echo "==> Bootstrap seed (only if database is empty)…"
  node ace db:bootstrap
fi

echo "==> Starting API server…"
exec node bin/server.js
