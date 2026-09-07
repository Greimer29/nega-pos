import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { MigrationRunner } from '@adonisjs/lucid/migration'
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

export default class TenantProvisionService {
  #otp = new OtpService()

  async requestCreate(draft: CreateCompanyDraft) {
    const slug = normalizeSlug(draft.slug)
    if (!slug || slug.length < 2) {
      throw Object.assign(new Error('Slug inválido'), { code: 'SLUG_INVALID', status: 422 })
    }

    const adminEmail = draft.adminEmail.trim().toLowerCase()
    const existingCompany = await Company.findBy('slug', slug)
    if (existingCompany) {
      throw Object.assign(new Error('Ya existe una empresa con ese slug'), {
        code: 'SLUG_TAKEN',
        status: 409,
      })
    }

    const existingUser = await DirectoryUser.findBy('email', adminEmail)
    if (existingUser) {
      throw Object.assign(new Error('Ese email ya está registrado en otra empresa'), {
        code: 'EMAIL_TAKEN',
        status: 409,
      })
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
    const verification = await this.#otp.consume({
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

    return this.provision(payload)
  }

  async resendCreateOtp(email: string) {
    const pending = await db
      .connection('central')
      .from('email_verification_codes')
      .where('email', email.trim().toLowerCase())
      .where('purpose', 'COMPANY_CREATE')
      .whereNull('consumed_at')
      .orderBy('id', 'desc')
      .first()

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

    const company = await Company.create({
      slug,
      name: draft.name.trim(),
      dbName,
      status: 'PROVISIONING',
    })

    try {
      await db.connection('central').rawQuery(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )

      const connectionName = ensureTenantConnection(dbName)
      await this.#runTenantMigrations(connectionName)
      await this.#seedTenant(connectionName, dbName, company.id, {
        email: adminEmail,
        password: draft.adminPassword,
        name: draft.adminName.trim() || 'Administrador',
      })

      await DirectoryUser.create({
        email: adminEmail,
        password: await DirectoryUser.hashPassword(draft.adminPassword),
        companyId: company.id,
        role: 'ADMIN',
        active: true,
        googleSub: null,
      })

      company.status = 'ACTIVE'
      await company.save()

      return company
    } catch (error) {
      company.status = 'SUSPENDED'
      await company.save().catch(() => undefined)
      throw error
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
