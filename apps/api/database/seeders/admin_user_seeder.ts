import env from '#start/env'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export type AdminUserSeedOverrides = {
  email?: string
  password?: string
  name?: string
}

export type AdminUserSeedOptions = {
  /** Lucid connection name (required when seeding a tenant DB outside HTTP ALS). */
  connection?: string
}

export default class extends BaseSeeder {
  async run(overrides: AdminUserSeedOverrides = {}, options: AdminUserSeedOptions = {}) {
    const email = overrides.email ?? env.get('ADMIN_EMAIL')
    const conn = options.connection ? { connection: options.connection } : undefined

    await User.updateOrCreate(
      { email },
      {
        password: overrides.password ?? env.get('ADMIN_PASSWORD'),
        name: overrides.name ?? env.get('ADMIN_NOMBRE'),
        role: 'ADMIN',
        active: true,
      },
      conn
    )
  }
}
