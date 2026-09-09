#!/bin/sh
# Production entrypoint for Nega POS API (Railway / Docker).
# Multi-tenant: central + tenant migrations (tenants are a safety net if pre-deploy skipped).
set -e

STORAGE_PATH="${STORAGE_LOCAL_PATH:-${RAILWAY_VOLUME_MOUNT_PATH:-./storage/uploads}}"
echo "==> Ensuring storage directory: ${STORAGE_PATH}"
mkdir -p "${STORAGE_PATH}"

if [ "${MULTI_TENANT_ENABLED:-false}" = "true" ]; then
  if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
    echo "==> Running central migrations (MULTI_TENANT_ENABLED=true)…"
    node ace migration:run_central --force
  fi
  # Idempotent: applies only pending tenant migrations (e.g. 0026 supplier_id).
  # Covers cases where Railway pre-deploy did not run migration:run_tenants.
  if [ "${RUN_TENANT_MIGRATIONS_ON_START:-true}" = "true" ]; then
    echo "==> Running tenant migrations…"
    node ace migration:run_tenants --force
  fi
elif [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  echo "==> Running migrations (RUN_MIGRATIONS_ON_START=true)…"
  node ace migration:run --force
fi

if [ "${SKIP_BOOTSTRAP_SEED:-false}" != "true" ]; then
  echo "==> Bootstrap…"
  node ace db:bootstrap
fi

echo "==> Starting API server…"
exec node bin/server.js
