import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { isMultiTenantEnabled } from '#utils/multi_tenant'

/**
 * First-deploy bootstrap.
 * Multi-tenant: only ensures platform admin (via platform:bootstrap); no POS seed.
 * Legacy: seeds tenant index seeder when users table is empty.
 */
export default class DbBootstrap extends BaseCommand {
  static commandName = 'db:bootstrap'
  static description =
    'Bootstrap first-deploy data (platform admin in multi-tenant; legacy POS seed otherwise)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    if (isMultiTenantEnabled()) {
      this.logger.info('Multi-tenant mode — bootstrapping platform admin only')
      const result = await this.kernel.exec('platform:bootstrap', [])
      this.exitCode = result.exitCode
      this.error = result.error ?? undefined
      return
    }

    let total = 0

    try {
      const row = await db.from('users').count('* as total').first()
      total = Number(row?.total ?? 0)
    } catch (error) {
      this.logger.error(
        'Cannot read users table. Ensure migrations ran (Railway pre-deploy or RUN_MIGRATIONS_ON_START=true).'
      )
      this.error = error as Error
      this.exitCode = 1
      return
    }

    if (total > 0) {
      this.logger.info(`Bootstrap skipped: ${total} user(s) already exist`)
      return
    }

    this.logger.info('Empty database detected — running index seeder…')

    const { default: IndexSeeder } = await import('#database/seeders/main/index_seeder')
    await new IndexSeeder(db.connection()).run()

    this.logger.success('Bootstrap seed completed (admin + financial base)')
  }
}
