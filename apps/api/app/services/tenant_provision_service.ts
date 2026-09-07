import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { MigrationRunner } from '@adonisjs/lucid/migration'
import mysql from 'mysql2/promise'
import env from '#start/env'
import Company from '#models/company'
import DirectoryUser from '#models/directory_user'
import FinancialBaseSeeder from '#database/seeders/financial_base_seeder'
import AdminUserSeeder from '#database/seeders/admin_user_seeder'
import OtpService from '#services/otp_service'
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
  #otp = new OtpService()

  async requestCreate(draft: CreateCompanyDraft) {
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
      if (company?.status === 'ACTIVE') {
        throw Object.assign(new Error('Ese email ya está registrado en otra empresa'), {
          code: 'EMAIL_TAKEN',
          status: 409,
        })
      }
    }

    await this.#otp.issue({
      email: adminEmail,
      purpose: 'COMPANY_CREATE',
      subject: 'Confirmá el alta de empresa — Nega POS',
      payload: {
        slug,
        name: draft.name.trim(),
        adminEmail,
        adminPassword: draft.adminPassword,
        adminName: draft.adminName.trim(),
      },
    })

    return { email: adminEmail, slug }
  }

  async confirmCreate(email: string, code: string) {
    // Validate OTP first without consuming, so a failed provision can retry the same code.
    const verification = await this.#otp.verify({
      email,
      purpose: 'COMPANY_CREATE',
      code,
    })

    const payload = verification.payload as CreateCompanyDraft | null
    if (!payload?.slug || !payload.name || !payload.adminEmail || !payload.adminPassword) {
      throw Object.assign(new Error('Payload de verificación incompleto'), {
        code: 'OTP_PAYLOAD_INVALID',
        status: 400,
      })
    }

    try {
      const company = await this.provision(payload)
      await this.#otp.markConsumed(verification.id)
      return company
    } catch (error) {
      logger.error({ err: error, email, slug: payload.slug }, 'Company provision failed')
      throw asHttpError(error, 'No se pudo provisionar la empresa')
    }
  }

  async resendCreateOtp(email: string) {
    const normalized = email.trim().toLowerCase()
    let pending = await db
      .connection('central')
      .from('email_verification_codes')
      .where('email', normalized)
      .where('purpose', 'COMPANY_CREATE')
      .whereNull('consumed_at')
      .orderBy('id', 'desc')
      .first()

    // After a failed provision the OTP may already be consumed — reuse last payload.
    if (!pending?.payload) {
      pending = await db
        .connection('central')
        .from('email_verification_codes')
        .where('email', normalized)
        .where('purpose', 'COMPANY_CREATE')
        .orderBy('id', 'desc')
        .first()
    }

    if (!pending?.payload) {
      throw Object.assign(new Error('No hay un alta pendiente para ese email'), {
        code: 'OTP_NOT_FOUND',
        status: 404,
      })
    }

    const payload =
      typeof pending.payload === 'string'
        ? (JSON.parse(pending.payload) as CreateCompanyDraft)
        : (pending.payload as CreateCompanyDraft)

    return this.requestCreate(payload)
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
      await this.#runTenantMigrations(connectionName)
      await this.#seedTenant(connectionName, dbName, company.id, {
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

  async #createDatabase(dbName: string) {
    const connection = await mysql.createConnection({
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD') ?? '',
      multipleStatements: false,
    })

    try {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
    } finally {
      await connection.end()
    }
  }

  async #runTenantMigrations(connectionName: string) {
    const migrator = new MigrationRunner(db, app, {
      direction: 'up',
      connectionName,
      dryRun: false,
      disableLocks: false,
    })

    await migrator.run()

    if (migrator.error) {
      throw migrator.error
    }
  }

  async #seedTenant(
    connectionName: string,
    dbName: string,
    companyId: number,
    admin: { email: string; password: string; name: string }
  ) {
    const client = db.connection(connectionName)

    await runWithTenant(
      {
        companyId,
        dbName,
        connectionName,
        directoryUserId: 0,
      },
      async () => {
        await new FinancialBaseSeeder(client).run()
        await new AdminUserSeeder(client).run(admin)
      }
    )
  }
}
