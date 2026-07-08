const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.join(__dirname, '..')
const iconCandidates = [
  path.join(desktopDir, '../web/public/nega-pos-icon.png'),
  path.join(desktopDir, '../web/public/favicon.svg'),
]
const iconPngDest = path.join(desktopDir, 'resources/app-icon.png')
const iconIcoDest = path.join(desktopDir, 'resources/app-icon.ico')
const psScript = path.join(__dirname, 'generate-app-icon.ps1')

const iconSrc = iconCandidates.find((candidate) => fs.existsSync(candidate))

if (!iconSrc) {
  if (fs.existsSync(iconIcoDest)) {
    console.warn('Sin icono fuente en web/public; se mantiene app-icon.ico existente.')
    process.exit(0)
  }
  console.warn(
    'Sin nega-pos-icon.png ni app-icon.ico. El build de desktop puede fallar hasta agregar un icono.'
  )
  process.exit(0)
}

if (!iconSrc.endsWith('.png')) {
  if (fs.existsSync(iconIcoDest)) {
    console.warn(`Icono fuente ${path.basename(iconSrc)} no es PNG; se mantiene app-icon.ico existente.`)
    process.exit(0)
  }
  throw new Error(
    'Agregá apps/web/public/nega-pos-icon.png (256×256) para generar el icono de escritorio.'
  )
}

const { execFileSync, execSync } = require('node:child_process')

fs.mkdirSync(path.dirname(iconPngDest), { recursive: true })

execFileSync(
  'powershell',
  [
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    psScript,
    '-SourcePng',
    iconSrc,
    '-DestPng',
    iconPngDest,
  ],
  { stdio: 'inherit' }
)

execSync(`npx --yes png-to-ico "${iconPngDest}" > "${iconIcoDest}"`, {
  stdio: 'inherit',
  shell: true,
})
