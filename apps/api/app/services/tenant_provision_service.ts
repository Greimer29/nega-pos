import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import hash from '@adonisjs/core/services/hash'
import { MigrationRunner } from '@adonisjs/lucid/migration'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import env from '#start/env'
import Company from '#models/company'
import DirectoryUser from '#models/directory_user'
import {
  ensureTenantConnection,
  tenantDbNameForSlug,
} from '#utils/tenant_connection'
import { runWithTenant } from '#utils/tenant_context'

export type CreateCompanyDraft = {
  slug: string
  name: string
  adminEmail: string
  adminPassword: string
  adminName: string
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function asHttpError(error: unknown, fallbackMessage: string) {
  if (error && typeof error === 'object' && 'code' in error && 'status' in error) {
    return error
  }

  const message = error instanceof Error ? error.message : fallbackMessage
  const lower = message.toLowerCase()

  if (
    lower.includes('access denied') ||
    lower.includes('create command denied') ||
    lower.includes('er_dbaccess_denied') ||
    lower.includes('1044')
  ) {
    return Object.assign(
      new Error(
        'El usuario MySQL de Railway no puede crear bases de datos. Otorgá GRANT CREATE ON *.* al MYSQLUSER o usá el user root del plugin en DB_USER/DB_PASSWORD.'
      ),
      { code: 'DB_CREATE_DENIED', status: 500 }
    )
  }

  return Object.assign(new Error(message || fallbackMessage), {
    code: 'PROVISION_FAILED',
    status: 500,
  })
}

export default class TenantProvisionService {
  /**
   * Creates (or retries) a company and provisions its tenant DB immediately.
   * No email / OTP — only platform admins call this.
   */
  async createCompany(draft: CreateCompanyDraft) {
    const slug = normalizeSlug(draft.slug)
    if (!slug || slug.length < 2) {
      throw Object.assign(new Error('Slug inválido'), { code: 'SLUG_INVALID', status: 422 })
    }

    const adminEmail = draft.adminEmail.trim().toLowerCase()
    const existingCompany = await Company.findBy('slug', slug)
    if (existingCompany?.status === 'ACTIVE') {
      throw Object.assign(new Error('Ya existe una empresa activa con ese slug'), {
        code: 'SLUG_TAKEN',
        status: 409,
      })
    }

    const existingUser = await DirectoryUser.findBy('email', adminEmail)
    if (existingUser) {
      const company = await Company.find(existingUser.companyId)
      if (company?.status === 'ACTIVE' && company.slug !== slug) {
        throw Object.assign(new Error('Ese email ya está registrado en otra empresa'), {
          code: 'EMAIL_TAKEN',
          status: 409,
        })
      }
    }

    try {
      return await this.provision({
        slug,
        name: draft.name.trim(),
        adminEmail,
        adminPassword: draft.adminPassword,
        adminName: draft.adminName.trim() || 'Administrador',
      })
    } catch (error) {
      logger.error({ err: error, email: adminEmail, slug }, 'Company provision failed')
      throw asHttpError(error, 'No se pudo provisionar la empresa')
    }
  }

  /**
   * Re-runs provision for a company stuck in PROVISIONING/SUSPENDED.
   */
  async retryProvision(
    companyId: number,
    admin: { adminEmail: string; adminPassword: string; adminName?: string }
  ) {
    const company = await Company.findOrFail(companyId)
    if (company.status === 'ACTIVE') {
      throw Object.assign(new Error('La empresa ya está activa'), {
        code: 'COMPANY_ALREADY_ACTIVE',
        status: 409,
      })
    }

    return this.createCompany({
      slug: company.slug,
      name: company.name,
      adminEmail: admin.adminEmail,
      adminPassword: admin.adminPassword,
      adminName: admin.adminName?.trim() || 'Administrador',
    })
  }

  async provision(draft: CreateCompanyDraft) {
    const slug = normalizeSlug(draft.slug)
    const dbName = tenantDbNameForSlug(slug)
    const adminEmail = draft.adminEmail.trim().toLowerCase()

    let company = await Company.findBy('slug', slug)
    if (company?.status === 'ACTIVE') {
      throw Object.assign(new Error('La empresa ya está activa'), {
        code: 'COMPANY_ALREADY_ACTIVE',
        status: 409,
      })
    }

    if (!company) {
      company = await Company.create({
        slug,
        name: draft.name.trim(),
        dbName,
        status: 'PROVISIONING',
      })
    } else {
      company.name = draft.name.trim()
      company.dbName = dbName
      company.status = 'PROVISIONING'
      await company.save()
    }

    try {
      await this.#createDatabase(dbName)

      const connectionName = ensureTenantConnection(dbName)
      await this.#runTenantMigrations(connectionName, dbName, company.id)
      await this.#assertTenantHasTable(dbName, 'app_settings')
      await this.#assertTenantHasTable(dbName, 'users')
      await this.#assertTenantMigrationComplete(dbName)
      await this.#seedTenantMysql(dbName, {
        email: adminEmail,
        password: draft.adminPassword,
        name: draft.adminName.trim() || 'Administrador',
      })

      await DirectoryUser.updateOrCreate(
        { email: adminEmail },
        {
          email: adminEmail,
          password: await DirectoryUser.hashPassword(draft.adminPassword),
          companyId: company.id,
          role: 'ADMIN',
          active: true,
          googleSub: null,
        }
      )

      company.status = 'ACTIVE'
      await company.save()

      logger.info({ slug, dbName, companyId: company.id }, 'Tenant provisioned')
      return company
    } catch (error) {
      company.status = 'SUSPENDED'
      await company.save().catch(() => undefined)
      throw error
    }
  }

  async #openMysql(database?: string) {
    return mysql.createConnection({
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD') ?? '',
      database,
      multipleStatements: false,
    })
  }

  async #createDatabase(dbName: string) {
    const connection = await this.#openMysql()
    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
    } finally {
      await connection.end()
    }
  }

  async #assertTenantHasTable(dbName: string, tableName: string) {
    const connection = await this.#openMysql()
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM information_schema.tables
         WHERE table_schema = ? AND table_name = ?`,
        [dbName, tableName]
      )
      if (Number(rows[0]?.c ?? 0) === 0) {
        throw Object.assign(
          new Error(
            `La tabla "${tableName}" no existe en la BD tenant "${dbName}". Revisá que MigrationRunner use esa base.`
          ),
          { code: 'TENANT_MIGRATION_MISSING_TABLE', status: 500 }
        )
      }
    } finally {
      await connection.end()
    }
  }

  async #assertTenantMigrationComplete(dbName: string) {
    const connection = await this.#openMysql(dbName)
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT name FROM adonis_schema ORDER BY id ASC`
      )
      const applied = rows.map((row) => String(row.name))
      logger.info({ dbName, appliedCount: applied.length, applied }, 'Tenant migration status')

      const required = [
        '1750000000001_create_users_table',
        '1750000000003_create_financial_base_tables',
        '1750000000019_set_base_currency_xau',
      ]
      const missingByFile = required.filter((fragment) =>
        !applied.some((name) => name.includes(fragment))
      )
      if (missingByFile.length > 0) {
        throw Object.assign(
          new Error(
            `Migraciones incompletas en "${dbName}". Faltan: ${missingByFile.join(', ')}. Aplicadas (${applied.length}): ${applied.join(', ') || '(ninguna)'}`
          ),
          { code: 'TENANT_MIGRATIONS_INCOMPLETE', status: 500 }
        )
      }
    } finally {
      await connection.end()
    }
  }

  async #runTenantMigrations(connectionName: string, dbName: string, companyId: number) {
    // Bind ALS so any accidental global `db` usage during migrations hits the tenant.
    await runWithTenant(
      {
        companyId,
        dbName,
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
              dbName,
              status: migrator.status,
              migratedFiles: migrator.migratedFiles,
            },
            'Tenant MigrationRunner failed'
          )
          throw migrator.error
        }

        logger.info(
          {
            connectionName,
            dbName,
            status: migrator.status,
            migratedFiles: Object.keys(migrator.migratedFiles ?? {}),
          },
          'Tenant MigrationRunner finished'
        )
      }
    )
  }

  /**
   * Seeds the tenant using a direct mysql2 connection to `dbName`.
   * Idempotent: safe when schema already exists from a previous failed attempt.
   */
  async #seedTenantMysql(
    dbName: string,
    admin: { email: string; password: string; name: string }
  ) {
    const connection = await this.#openMysql(dbName)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    try {
      const [dbRow] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS current_db')
      const currentDb = String(dbRow[0]?.current_db ?? '')
      if (currentDb !== dbName) {
        throw new Error(`Seed mysql2 abrió "${currentDb}" en vez de "${dbName}"`)
      }

      await connection.query(
        `INSERT INTO app_settings (\`key\`, \`value\`, updated_at)
         VALUES ('base_currency_code', 'XAU', ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = VALUES(updated_at)`,
        [now]
      )

      const currencies = [
        ['XAU', 'Oro', '1.0000'],
        ['USD', 'Dólar estadounidense', '100.0000'],
        ['VES', 'Bolívar', '100.0000'],
      ] as const
      for (const [code, name, rate] of currencies) {
        await connection.query(
          `INSERT INTO currencies (code, name, rate_per_usd, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), rate_per_usd = VALUES(rate_per_usd),
             is_active = 1, updated_at = VALUES(updated_at)`,
          [code, name, rate, now, now]
        )
      }

      const methods = [
        ['cash_usd', 'Efectivo USD', 'USD', 1],
        ['cash_bs', 'Efectivo Bs', 'VES', 2],
        ['transfer', 'Transferencia', 'VES', 3],
        ['mobile_payment', 'Pago móvil', 'VES', 4],
        ['zelle', 'Zelle', 'USD', 5],
        ['binance', 'Binance', 'USD', 6],
      ] as const
      for (const [code, name, currencyCode, sortOrder] of methods) {
        await connection.query(
          `INSERT INTO payment_methods (code, name, currency_code, is_active, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), currency_code = VALUES(currency_code),
             is_active = 1, sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)`,
          [code, name, currencyCode, sortOrder, now, now]
        )
      }

      const passwordHash = await hash.make(admin.password)
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [admin.email]
      )
      if (existing[0]?.id) {
        await connection.query(
          `UPDATE users SET password = ?, name = ?, role = 'ADMIN', active = 1, updated_at = ? WHERE id = ?`,
          [passwordHash, admin.name, now, existing[0].id]
        )
      } else {
        await connection.query(
          `INSERT INTO users (email, password, name, role, permissions, active, created_at, updated_at)
           VALUES (?, ?, ?, 'ADMIN', NULL, 1, ?, ?)`,
          [admin.email, passwordHash, admin.name, now, now]
        )
      }

      logger.info({ dbName, adminEmail: admin.email }, 'Tenant seeded via mysql2')
    } finally {
      await connection.end()
    }
  }
}
