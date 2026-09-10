/**
 * Guarda de desarrollo: `pnpm dev:web` no debe apuntar a la API de producción.
 * Producción (Railway) solo se usa al buildear desktop/mobile con VITE_API_URL explícita.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web')

const ENV_FILES = ['.env.development.local', '.env.local', '.env.development', '.env']

function readViteApiUrl() {
  for (const file of ENV_FILES) {
    const filePath = path.join(webDir, file)
    if (!fs.existsSync(filePath)) continue
    const match = fs.readFileSync(filePath, 'utf8').match(/^VITE_API_URL\s*=\s*(.+)$/m)
    if (!match) continue
    return match[1].trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')
  }
  return 'http://localhost:3333'
}

const apiUrl = readViteApiUrl()
const isRemoteProd =
  /railway\.app/i.test(apiUrl) ||
  /nega-pos-api-production/i.test(apiUrl) ||
  (/^https:\/\//i.test(apiUrl) && !/localhost|127\.0\.0\.1/i.test(apiUrl))

if (isRemoteProd) {
  console.error('')
  console.error('[nega-pos] BLOQUEADO: VITE_API_URL apunta a una API remota/producción:')
  console.error(`  ${apiUrl}`)
  console.error('')
  console.error('  Desarrollo local debe usar la API de Docker/host en :3333.')
  console.error('  En apps/web/.env poné:')
  console.error('    VITE_API_URL=http://localhost:3333')
  console.error('')
  console.error('  Luego: docker compose up -d   (MySQL + API)')
  console.error('         pnpm dev:web')
  console.error('')
  console.error('  Railway solo para builds de release:')
  console.error('    $env:VITE_API_URL="https://…railway.app"; pnpm build:mobile')
  console.error('')
  process.exit(1)
}

console.log(`[nega-pos] Dev API local OK → ${apiUrl}`)
