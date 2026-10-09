/**
 * Local Transmit provider compatible with @adonisjs/core 7.3.x.
 * Upstream transmit@3.0.2 calls app.getMode(), which only exists on newer cores
 * (warmup/codegen). Without this shim, `ace test` / local boot crash.
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ApplicationService } from '@adonisjs/core/types'

type AppWithOptionalMode = ApplicationService & {
  getMode?: () => string
}

type TransmitInstance = {
  shutdown: () => Promise<void>
  broadcast: (channel: string, payload?: Record<string, unknown>) => void
  authorize: (...args: unknown[]) => void
  registerRoutes: (modifier?: (route: unknown) => void) => void
  getSubscribersFor: (channel: string) => string[]
}

type TransmitAdapterCtor = new (
  config: Record<string, unknown>,
  router: unknown,
  transport: unknown
) => TransmitInstance

const require = createRequire(import.meta.url)

async function loadTransmitAdapter(): Promise<TransmitAdapterCtor> {
  // exports block package.json; resolve main entry then climb to package root.
  const transmitEntry = require.resolve('@adonisjs/transmit')
  const transmitRoot = dirname(dirname(transmitEntry)) // .../transmit/build/index.js → .../transmit
  // Side-effect: register ContainerBindings for 'transmit'
  await import(pathToFileURL(join(transmitRoot, 'build/src/types/extended.js')).href)
  const mod = (await import(pathToFileURL(join(transmitRoot, 'build/src/transmit.js')).href)) as {
    TransmitAdonisAdapter: TransmitAdapterCtor
  }
  return mod.TransmitAdonisAdapter
}

export default class TransmitCompatProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    // ContainerBindings for 'transmit' come from @adonisjs/transmit extended types
    // (loaded lazily in the factory). Cast keeps us compatible with core 7.3 typings.
    ;(
      this.app.container as { singleton: (name: string, resolver: () => Promise<unknown>) => void }
    ).singleton('transmit', async () => {
      const router = await this.app.container.make('router')
      const config = this.app.config.get<Record<string, unknown>>('transmit', {})
      const app = this.app as AppWithOptionalMode
      const mode = typeof app.getMode === 'function' ? app.getMode() : 'run'
      const transmitConfig = mode === 'warmup' ? { ...config, pingInterval: false } : config

      let transport: unknown = null
      const transportConfig = config.transport as { driver?: () => unknown } | null | undefined
      if (transportConfig?.driver) {
        transport = transportConfig.driver()
      }

      const TransmitAdonisAdapter = await loadTransmitAdapter()
      return new TransmitAdonisAdapter(transmitConfig, router, transport)
    })
  }

  async shutdown() {
    const transmit = (await (
      this.app.container as { make: (name: string) => Promise<TransmitInstance> }
    ).make('transmit')) as TransmitInstance
    await transmit.shutdown()
  }
}
