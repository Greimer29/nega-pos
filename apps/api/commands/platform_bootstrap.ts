import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import PlatformAdmin from '#models/platform_admin'

/**
 * Ensures the platform super-admin exists in the central database.
 * Safe to run on every boot — updateOrCreate by email.
 */
export default class PlatformBootstrap extends BaseCommand {
  static commandName = 'platform:bootstrap'
  static description = 'Create or update the platform super admin from env'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const email = env.get('PLATFORM_ADMIN_EMAIL')
    const password = env.get('PLATFORM_ADMIN_PASSWORD')
    const name = env.get('PLATFORM_ADMIN_NAME') ?? 'Platform Admin'

    if (!email || !password) {
      this.logger.info(
        'PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD not set — skipping platform bootstrap'
      )
      return
    }

    await PlatformAdmin.updateOrCreate(
      { email: email.trim().toLowerCase() },
      {
        email: email.trim().toLowerCase(),
        password: await PlatformAdmin.hashPassword(password),
        name,
        active: true,
      }
    )

    this.logger.success(`Platform admin ready: ${email}`)
  }
}
