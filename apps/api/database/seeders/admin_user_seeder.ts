import env from '#start/env'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL')

    await User.updateOrCreate(
      { email },
      {
        password: env.get('ADMIN_PASSWORD'),
        name: env.get('ADMIN_NOMBRE'),
        role: 'ADMIN',
        active: true,
      }
    )
  }
}
