import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import type { ConnectionConfig } from '@adonisjs/lucid/types/database'

function baseMysqlConnection(database: string) {
  return {
    client: 'mysql2' as const,
    connection: {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD'),
      database,
    },
    migrations: {
      naturalSort: true as const,
      paths: ['database/migrations'],
    },
    debug: false,
  } satisfies ConnectionConfig
}

/**
 * Ensures a Lucid named connection exists for the given tenant database.
 * Returns the connection name to use with models/query builders.
 */
export function ensureTenantConnection(dbName: string): string {
  const connectionName = `tenant_${dbName}`

  if (!db.manager.has(connectionName)) {
    db.manager.add(connectionName, baseMysqlConnection(dbName))
  }

  return connectionName
}

export function getCentralConnectionName() {
  return 'central'
}

export function tenantDbNameForSlug(slug: string) {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return `nega_pos_t_${safe}`
}
