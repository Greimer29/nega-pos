#!/bin/sh
# Production entrypoint for Nega POS API (Railway / Docker).
# Multi-tenant: migrates/seeds only the control plane; tenant DBs are provisioned on demand.
set -e

STORAGE_PATH="${STORAGE_LOCAL_PATH:-${RAILWAY_VOLUME_MOUNT_PATH:-./storage/uploads}}"
echo "==> Ensuring storage directory: ${STORAGE_PATH}"
mkdir -p "${STORAGE_PATH}"

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  if [ "${MULTI_TENANT_ENABLED:-false}" = "true" ]; then
    echo "==> Running central migrations (MULTI_TENANT_ENABLED=true)…"
    node ace migration:run_central --force
  else
    echo "==> Running migrations (RUN_MIGRATIONS_ON_START=true)…"
    node ace migration:run --force
  fi
fi

if [ "${SKIP_BOOTSTRAP_SEED:-false}" != "true" ]; then
  echo "==> Bootstrap…"
  node ace db:bootstrap
fi

echo "==> Starting API server…"
exec node bin/server.js
