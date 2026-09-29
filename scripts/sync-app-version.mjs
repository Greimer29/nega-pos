/**
 * Sincroniza la versión de apps/desktop/package.json hacia:
 * - apps/web/.env.local + .env.production.local (Vite sí los carga; .env.app.local NO)
 * - apps/desktop/app-meta.json (runtime desktop + cache bust)
 * - apps/mobile/capacitor.app.json (si existe mobile)
 *
 * Mismo patrón que moda-urbana prepare-brand (versión), sin multi-marca.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(rootDir, 'apps', 'desktop')
const webDir = path.join(rootDir, 'apps', 'web')
const mobileDir = path.join(rootDir, 'apps', 'mobile')

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const desktopPackage = JSON.parse(
  fs.readFileSync(path.join(desktopDir, 'package.json'), 'utf8')
)
const appVersion = desktopPackage.version?.trim() || '0.0.0'
const buildId = `${appVersion}-${Date.now()}`

const envLines = [`VITE_APP_VERSION=${appVersion}`, `VITE_BUILD_ID=${buildId}`, '']
const envBody = envLines.join('\n')
// Vite loadEnv solo lee .env / .env.local / .env.[mode] / .env.[mode].local
fs.writeFileSync(path.join(webDir, '.env.local'), envBody, 'utf8')
fs.writeFileSync(path.join(webDir, '.env.production.local'), envBody, 'utf8')
// Legacy name (documentación / scripts viejos); Vite lo ignora.
fs.writeFileSync(path.join(webDir, '.env.app.local'), envBody, 'utf8')

const appMeta = {
  appName: 'Nega POS',
  legalName: 'Nega POS',
  productName: 'Nega POS',
  appId: 'com.negapos.app',
  desktopPort: 51740,
  appVersion,
  buildId,
}
writeJson(path.join(desktopDir, 'app-meta.json'), appMeta)

if (fs.existsSync(mobileDir)) {
  writeJson(path.join(mobileDir, 'capacitor.app.json'), {
    appId: 'com.negapos.app',
    appName: 'Nega POS',
    appVersion,
    buildId,
  })
}

console.log(`sync-app-version: v${appVersion} (build ${buildId})`)
