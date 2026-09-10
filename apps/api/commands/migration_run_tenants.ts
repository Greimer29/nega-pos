import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import Company from '#models/company'
import TenantMigrationService from '#services/tenant_migration_service'

/**
 * Runs pending tenant (POS) migrations on every company database.
 * Used by Railway pre-deploy after migration:run_central.
 */
export default class MigrationRunTenants extends BaseCommand {
  static commandName = 'migration:run_tenants'
  static description = 'Run pending migrations on all company (tenant) databases'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Force run in production', alias: 'f' })
  declare force: boolean

  @flags.boolean({ description: 'List companies without migrating', alias: 'd' })
  declare dryRun: boolean

  async run() {
    if (this.app.nodeEnvironment === 'production' && !this.force) {
      this.logger.error('Use --force to run tenant migrations in production')
      this.exitCode = 1
      return
    }

    if (!db.manager.has('central')) {
      this.logger.error('Connection "central" is not configured (set DB_CENTRAL_DATABASE)')
      this.exitCode = 1
      return
    }

    const companies = await Company.query().orderBy('id', 'asc')

    if (companies.length === 0) {
      this.logger.info('No companies in central — nothing to migrate')
      return
    }

    if (this.dryRun) {
      this.logger.info(`Dry-run: ${companies.length} company database(s)`)
      for (const company of companies) {
        this.logger.info(`  #${company.id} ${company.slug} → ${company.dbName} [${company.status}]`)
      }
      return
    }

    this.logger.info(`Migrating ${companies.length} tenant database(s)…`)

    const service = new TenantMigrationService()
    const results = await service.migrateAllCompanies()

    let ok = 0
    let skipped = 0
    let failed = 0

    for (const result of results) {
      if (result.status === 'ok') {
        ok += 1
        const files = result.migratedFiles?.length
          ? ` (applied: ${result.migratedFiles.join(', ') || 'none pending'})`
          : ''
        this.logger.success(`OK  ${result.slug} (${result.dbName})${files}`)
        continue
      }

      if (result.status === 'skipped') {
        skipped += 1
        this.logger.warning(
          `SKIP ${result.slug} (${result.dbName || 'sin db'}): ${result.errorMessage ?? 'skipped'}`
        )
        continue
      }

      failed += 1
      this.logger.error(
        `FAIL ${result.slug} (${result.dbName}): ${result.errorMessage ?? 'unknown error'}`
      )
    }

    this.logger.info(`Tenant migrations summary: ok=${ok} skipped=${skipped} failed=${failed}`)

    if (failed > 0) {
      this.logger.error(
        'One or more tenant databases failed to migrate. Fix the errors above and redeploy — the new API was not promoted.'
      )
      this.exitCode = 1
    } else {
      this.logger.success('All tenant migrations completed')
    }
  }
}
