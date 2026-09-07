import AdminUserSeeder from '../admin_user_seeder.js'
import FinancialBaseSeeder from '../financial_base_seeder.js'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Bootstrap mínimo de una BD tenant (empresa).
 * No crea categorías ni proveedores — la empresa parte en cero.
 */
export default class extends BaseSeeder {
  async run() {
    await new FinancialBaseSeeder(this.client).run()
    await new AdminUserSeeder(this.client).run()
  }
}
