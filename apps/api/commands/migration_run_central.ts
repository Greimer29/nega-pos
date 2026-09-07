import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { MigrationRunner } from '@adonisjs/lucid/migration'
import db from '@adonisjs/lucid/services/db'

/**
 * Runs migrations against the central (control-plane) database only.
 * Tenant DBs: use migration:run_tenants (Railway pre-deploy runs both).
 */
export default class MigrationRunCentral extends BaseCommand {
  static commandName = 'migration:run_central'
  static description = 'Run pending migrations on the central database'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Force run in production', alias: 'f' })
  declare force: boolean

  async run() {
    if (this.app.nodeEnvironment === 'production' && !this.force) {
      this.logger.error('Use --force to run central migrations in production')
      this.exitCode = 1
      return
    }

    if (!db.manager.has('central')) {
      this.logger.error('Connection "central" is not configured (set DB_CENTRAL_DATABASE)')
      this.exitCode = 1
      return
    }

    const migrator = new MigrationRunner(db, this.app, {
      direction: 'up',
      connectionName: 'central',
      dryRun: false,
      disableLocks: false,
    })

    await migrator.run()

    if (migrator.error) {
      this.logger.error(migrator.error.message)
      this.error = migrator.error
      this.exitCode = 1
      return
    }

    this.logger.success('Central migrations completed')
  }
}
