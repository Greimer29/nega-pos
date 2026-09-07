import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { MigrationRunner } from '@adonisjs/lucid/migration'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import env from '#start/env'
import Company from '#models/company'
import { ensureTenantConnection } from '#utils/tenant_connection'
import { runWithTenant } from '#utils/tenant_context'

export type TenantMigrationStatus = 'ok' | 'skipped' | 'error'

export type TenantMigrationResult = {
  companyId: number
  slug: string
  dbName: string
  status: TenantMigrationStatus
  migratedFiles?: string[]
  errorMessage?: string
}

function openMysql(database?: string) {
  return mysql.createConnection({
    host: env.get('DB_HOST'),
    port: env.get('DB_PORT'),
    user: env.get('DB_USER'),
    password: env.get('DB_PASSWORD') ?? '',
    database,
    multipleStatements: false,
  })
}

async function databaseExists(dbName: string): Promise<boolean> {
  const connection = await openMysql()
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM information_schema.schemata
       WHERE schema_name = ?`,
      [dbName]
    )
    return Number(rows[0]?.c ?? 0) > 0
  } finally {
    await connection.end()
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return String(error)
}

export default class TenantMigrationService {
  /**
   * Runs pending tenant migrations for one company DB.
   * Uses runWithTenant so accidental global `db` usage does not hit `railway`.
   */
  async migrateCompany(company: {
    id: number
    slug: string
    dbName: string
  }): Promise<TenantMigrationResult> {
    const base = {
      companyId: company.id,
      slug: company.slug,
      dbName: company.dbName,
    }

    if (!company.dbName?.trim()) {
      return {
        ...base,
        status: 'skipped',
        errorMessage: 'Company sin db_name',
      }
    }

    try {
      const exists = await databaseExists(company.dbName)
      if (!exists) {
        return {
          ...base,
          status: 'error',
          errorMessage: `La BD MySQL "${company.dbName}" no existe. Provisioná de nuevo o creá la base manualmente.`,
        }
      }

      const connectionName = ensureTenantConnection(company.dbName)

      const migratedFiles = await runWithTenant(
        {
          companyId: company.id,
          dbName: company.dbName,
          connectionName,
          directoryUserId: 0,
        },
        async () => {
          const migrator = new MigrationRunner(db, app, {
            direction: 'up',
            connectionName,
            dryRun: false,
            disableLocks: false,
          })

          await migrator.run()

          if (migrator.error) {
            logger.error(
              {
                err: migrator.error,
                connectionName,
                dbName: company.dbName,
                slug: company.slug,
                status: migrator.status,
                migratedFiles: migrator.migratedFiles,
              },
              'Tenant MigrationRunner failed'
            )
            throw migrator.error
          }

          const files = Object.keys(migrator.migratedFiles ?? {})
          logger.info(
            {
              connectionName,
              dbName: company.dbName,
              slug: company.slug,
              status: migrator.status,
              migratedFiles: files,
            },
            'Tenant MigrationRunner finished'
          )
          return files
        }
      )

      return {
        ...base,
        status: 'ok',
        migratedFiles,
      }
    } catch (error) {
      const message = errorMessage(error)
      logger.error(
        { err: error, companyId: company.id, slug: company.slug, dbName: company.dbName },
        'Tenant migration failed'
      )
      return {
        ...base,
        status: 'error',
        errorMessage: message,
      }
    }
  }

  /**
   * Migrates every company registered in central that has a db_name.
   * Continues on errors; caller decides exit code from the results.
   */
  async migrateAllCompanies(): Promise<TenantMigrationResult[]> {
    const companies = await Company.query().orderBy('id', 'asc')
    const results: TenantMigrationResult[] = []

    for (const company of companies) {
      results.push(
        await this.migrateCompany({
          id: company.id,
          slug: company.slug,
          dbName: company.dbName,
        })
      )
    }

    return results
  }
}
