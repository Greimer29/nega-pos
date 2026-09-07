import type { ApplicationService } from '@adonisjs/core/types'
import { BaseModel } from '@adonisjs/lucid/orm'
import { getTenantStore } from '#utils/tenant_context'
import { isMultiTenantEnabled } from '#utils/multi_tenant'
import type { Database } from '@adonisjs/lucid/database'

const CENTRAL_CONNECTION = 'central'

/**
 * Per-request tenant binding for Lucid.
 * Central models keep connection "central" via an own data property (never the ALS getter).
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
        const store = getTenantStore()
        if (store?.connectionName) {
          return store.connectionName
        }
        return 'mysql'
      },
    })

    const centralModels = await Promise.all([
      import('#models/company'),
      import('#models/directory_user'),
      import('#models/platform_admin'),
      import('#models/email_verification_code'),
    ])

    for (const mod of centralModels) {
      const Model = mod.default as typeof BaseModel
      // Own DATA property so Lucid never falls through to BaseModel's tenant getter.
      Object.defineProperty(Model, 'connection', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: CENTRAL_CONNECTION,
      })
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
