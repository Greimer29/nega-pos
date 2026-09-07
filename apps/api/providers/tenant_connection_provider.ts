import type { ApplicationService } from '@adonisjs/core/types'
import { BaseModel } from '@adonisjs/lucid/orm'
import { getTenantStore } from '#utils/tenant_context'
import { isMultiTenantEnabled } from '#utils/multi_tenant'
import type { Database } from '@adonisjs/lucid/database'

/**
 * Makes Lucid models and `db.*` helpers use the per-request tenant connection
 * when AsyncLocalStorage is set. Models with `static connection = 'central'` keep central.
 *
 * Uses `start` (not `boot`) so Lucid's Database service is already bound in the container.
 * Ace preDeploy / migration commands also go through this path safely.
 */
export default class TenantConnectionProvider {
  constructor(protected app: ApplicationService) {}

  async start() {
    if (!isMultiTenantEnabled()) {
      return
    }

    Object.defineProperty(BaseModel, 'connection', {
      configurable: true,
      enumerable: true,
      get() {
        if (Object.prototype.hasOwnProperty.call(this, '__ownConnection')) {
          return (this as { __ownConnection: string }).__ownConnection
        }
        const store = getTenantStore()
        if (store?.connectionName) {
          return store.connectionName
        }
        return 'mysql'
      },
      set(value: string) {
        Object.defineProperty(this, '__ownConnection', {
          configurable: true,
          enumerable: false,
          writable: true,
          value,
        })
      },
    })

    const centralModels = await Promise.all([
      import('#models/company'),
      import('#models/directory_user'),
      import('#models/platform_admin'),
      import('#models/email_verification_code'),
    ])
    for (const mod of centralModels) {
      const Model = mod.default as typeof BaseModel & { connection?: string }
      Model.connection = 'central'
    }

    let database: (Database & { __tenantPrimary?: string }) | null = null
    try {
      database = (await this.app.container.make('lucid.db')) as Database & {
        __tenantPrimary?: string
      }
    } catch {
      return
    }

    if (!database || typeof database.primaryConnectionName !== 'string') {
      return
    }

    database.__tenantPrimary = database.primaryConnectionName
    Object.defineProperty(database, 'primaryConnectionName', {
      configurable: true,
      enumerable: true,
      get() {
        return getTenantStore()?.connectionName ?? database!.__tenantPrimary ?? 'mysql'
      },
      set(value: string) {
        database!.__tenantPrimary = value
      },
    })
  }
}
