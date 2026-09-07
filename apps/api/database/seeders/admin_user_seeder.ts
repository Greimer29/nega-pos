import env from '#start/env'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export type AdminUserSeedOverrides = {
  email?: string
  password?: string
  name?: string
}

export default class extends BaseSeeder {
  async run(overrides: AdminUserSeedOverrides = {}) {
    const email = overrides.email ?? env.get('ADMIN_EMAIL')

    await User.updateOrCreate(
      { email },
      {
        password: overrides.password ?? env.get('ADMIN_PASSWORD'),
        name: overrides.name ?? env.get('ADMIN_NOMBRE'),
        role: 'ADMIN',
        active: true,
      }
    )
  }
}
