import AdminUserSeeder from '../admin_user_seeder.js'
import CategoriesSeeder from '../categories_seeder.js'
import FinancialBaseSeeder from '../financial_base_seeder.js'
import SupplierCastilloSeeder from '../supplier_castillo_seeder.js'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await new FinancialBaseSeeder(this.client).run()
    await new CategoriesSeeder(this.client).run()
    await new AdminUserSeeder(this.client).run()
    await new SupplierCastilloSeeder(this.client).run()
  }
}
