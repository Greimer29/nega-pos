#!/usr/bin/env bash
# Prepara web + sync Capacitor iOS. Ejecutar en macOS (Xcode + CocoaPods).
# Uso (raíz del monorepo):
#   export VITE_API_URL="https://nega-pos-api-production.up.railway.app"
#   bash scripts/prepare-ios.sh
# Luego: pnpm --filter mobile open:ios  → Archive en Xcode

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="${VITE_API_URL:-}"
if [[ -z "$API_URL" ]]; then
  echo "Definí VITE_API_URL (URL pública de la API, sin /api/v1)."
  echo "Ejemplo: export VITE_API_URL=https://nega-pos-api-production.up.railway.app"
  exit 1
fi

API_URL="${API_URL%/}"
export VITE_API_URL="$API_URL"

echo "==> sync-app-version"
node scripts/sync-app-version.mjs

echo "==> build web (VITE_API_URL=$VITE_API_URL)"
pnpm --filter web build

echo "==> runtime-config.json"
node -e "const fs=require('fs'); const u=process.env.VITE_API_URL; fs.writeFileSync('apps/web/dist/runtime-config.json', JSON.stringify({apiUrl:u,useLocalApiProxy:false},null,2)+'\n')"

if [[ ! -d apps/mobile/ios ]]; then
  echo "==> cap add ios (primera vez)"
  pnpm --filter mobile add:ios
fi

echo "==> cap sync ios"
pnpm --filter mobile sync:ios

if command -v pod >/dev/null 2>&1; then
  echo "==> pod install"
  (cd apps/mobile/ios/App && pod install)
else
  echo "AVISO: CocoaPods no está en PATH. En Mac: brew install cocoapods && cd apps/mobile/ios/App && pod install"
fi

echo ""
echo "Listo. Abrí Xcode:"
echo "  pnpm --filter mobile open:ios"
echo "Signing → Team; luego Product → Archive."
