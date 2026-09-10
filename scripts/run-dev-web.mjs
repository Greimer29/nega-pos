/**
 * Arranca Vite forzando API local. Limpia VITE_API_URL del shell padre
 * (p.ej. residual de build:mobile contra Railway) antes de spawn.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

function runNode(scriptRel) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, scriptRel)], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${scriptRel} exited ${code}`))
    })
  })
}

function runPnpm(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      isWin ? 'npx.cmd' : 'npx',
      ['pnpm@9.15.4', ...args],
      {
        cwd: root,
        stdio: 'inherit',
        env,
        shell: isWin,
      }
    )
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`pnpm ${args.join(' ')} exited ${code}`))
    })
  })
}

delete process.env.VITE_API_URL

await runNode('scripts/assert-dev-api-local.mjs')
await runNode('scripts/sync-app-version.mjs')

const env = {
  ...process.env,
  VITE_API_URL: 'http://localhost:3333',
}

await runPnpm(['--filter', 'web', 'dev'], env)
