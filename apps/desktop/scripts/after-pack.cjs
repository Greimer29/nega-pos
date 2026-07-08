const path = require('node:path')
const rcedit = require('rcedit')

/** Aplica el icono de Nega POS al .exe (Windows). */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const exePath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.exe`
  )
  const iconPath = path.join(context.packager.projectDir, 'resources', 'app-icon.ico')

  await rcedit(exePath, { icon: iconPath })
}
