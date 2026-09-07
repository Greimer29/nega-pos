import FinancialBaseSeeder from '../financial_base_seeder.js'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * @deprecated Prefer TenantBootstrapSeeder for new tenants.
 * Kept for local/dev single-DB bootstrap until multi-tenant cutover.
 * Categories and Castillo supplier are intentionally omitted.
 */
export default class extends BaseSeeder {
  async run() {
    await new FinancialBaseSeeder(this.client).run()
    const { default: AdminUserSeeder } = await import('../admin_user_seeder.js')
    await new AdminUserSeeder(this.client).run()
  }
}
