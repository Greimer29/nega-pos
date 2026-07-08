const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.join(__dirname, '..')
const productName = 'Nega POS'
const releaseDir = path.join(desktopDir, 'release-nega-pos')

try {
  execSync(`taskkill /F /IM "${productName}.exe" /T`, { stdio: 'ignore' })
} catch {
  // App not running.
}

try {
  execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' })
} catch {
  // Electron not running.
}

if (fs.existsSync(releaseDir)) {
  try {
    fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 800 })
  } catch {
    const backupDir = `${releaseDir}-bak-${Date.now()}`
    try {
      fs.renameSync(releaseDir, backupDir)
    } catch {
      console.warn(
        'No se pudo limpiar release-nega-pos; electron-builder puede fallar si hay archivos bloqueados.'
      )
    }
  }
}
