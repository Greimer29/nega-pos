import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import mysql from 'mysql2/promise'
import env from '#start/env'
import Company from '#models/company'
import DirectoryUser from '#models/directory_user'
import { resolveStoragePath } from '#utils/storage_path'

/**
 * Hard-deletes a company: DROP DATABASE, directory rows, central company, uploads.
 * Irreversible — platform admin only.
 */
export default class TenantPurgeService {
  async destroyCompany(companyId: number, confirmSlug: string) {
    const company = await Company.find(companyId)
    if (!company) {
      throw Object.assign(new Error('Empresa no encontrada'), {
        code: 'COMPANY_NOT_FOUND',
        status: 404,
      })
    }

    const expected = company.slug.trim().toLowerCase()
    const provided = confirmSlug.trim().toLowerCase()
    if (!provided || provided !== expected) {
      throw Object.assign(new Error(`Para confirmar, escribí el slug exacto: "${company.slug}"`), {
        code: 'CONFIRM_SLUG_MISMATCH',
        status: 422,
      })
    }

    const dbName = company.dbName?.trim()
    const companyIdSnapshot = company.id
    const slug = company.slug

    if (dbName) {
      await this.#dropDatabase(dbName)
      await this.#releaseTenantConnection(dbName)
    }

    await DirectoryUser.query().where('company_id', companyIdSnapshot).delete()
    await company.delete()
    await this.#removeTenantUploads(companyIdSnapshot)

    logger.info(
      { companyId: companyIdSnapshot, slug, dbName },
      'Company hard-deleted (DB + directory + uploads)'
    )

    return { id: companyIdSnapshot, slug, dbName: dbName ?? null }
  }

  async #dropDatabase(dbName: string) {
    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw Object.assign(new Error(`Nombre de BD inválido: ${dbName}`), {
        code: 'INVALID_DB_NAME',
        status: 500,
      })
    }

    const connection = await mysql.createConnection({
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD') ?? '',
      multipleStatements: false,
    })

    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``)
      logger.info({ dbName }, 'Tenant database dropped')
    } catch (error) {
      logger.error({ err: error, dbName }, 'Failed to DROP tenant database')
      throw Object.assign(
        new Error(
          `No se pudo eliminar la BD "${dbName}". Verificá privilegios DROP del usuario MySQL.`
        ),
        { code: 'DB_DROP_DENIED', status: 500 }
      )
    } finally {
      await connection.end()
    }
  }

  async #releaseTenantConnection(dbName: string) {
    const connectionName = `tenant_${dbName}`
    if (!db.manager.has(connectionName)) {
      return
    }

    try {
      // Lucid manager may keep a stale pool pointing at a dropped schema.
      await db.manager.close(connectionName)
    } catch (error) {
      logger.warn({ err: error, connectionName }, 'Could not close tenant Lucid connection')
    }
  }

  async #removeTenantUploads(companyId: number) {
    const root = resolveStoragePath()
    const tenantDir = join(root, `t_${companyId}`)
    try {
      await rm(tenantDir, { recursive: true, force: true })
      logger.info({ companyId, tenantDir }, 'Tenant upload directory removed')
    } catch (error) {
      logger.warn({ err: error, companyId, tenantDir }, 'Could not remove tenant uploads')
    }
  }
}
