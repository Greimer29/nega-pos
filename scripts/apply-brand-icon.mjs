import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcJpg = process.argv[2]
const outDir = path.join(root, 'apps/web/public')
const mobileRes = path.join(root, 'apps/mobile/android/app/src/main/res')
const ps1 = path.join(root, 'scripts/generate-brand-icons.ps1')

if (!srcJpg || !fs.existsSync(srcJpg)) {
  console.error('Usage: node scripts/apply-brand-icon.mjs <source.jpg|png>')
  process.exit(1)
}

execFileSync(
  'powershell',
  ['-ExecutionPolicy', 'Bypass', '-File', ps1, '-SourcePath', srcJpg, '-WebPublic', outDir, '-MobileRes', mobileRes],
  { stdio: 'inherit' }
)
