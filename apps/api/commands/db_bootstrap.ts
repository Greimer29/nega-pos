import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import IndexSeeder from '#database/seeders/main/index_seeder'

/**
 * Seeds base data only when the users table is empty (first deploy).
 * Safe to run on every container start — skips if users already exist.
 * Does NOT reset currencies, admin password, or suppliers on redeploy.
 */
export default class DbBootstrap extends BaseCommand {
  static commandName = 'db:bootstrap'
  static description =
    'Run index seeders only if the database has no users (first-deploy bootstrap)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
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
    await new IndexSeeder(db.connection()).run()
    this.logger.success('Bootstrap seed completed (admin, currencies, categories, base data)')
  }
}
