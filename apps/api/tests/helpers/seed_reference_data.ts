import CategoriesSeeder from '../../database/seeders/categories_seeder.js'
import FinancialBaseSeeder from '../../database/seeders/financial_base_seeder.js'
import db from '@adonisjs/lucid/services/db'

/**
 * Reference data (currencies, payment methods, categories) required by functional tests.
 * Lives in seeders — migrations only define schema.
 */
export async function seedReferenceData() {
  const client = db.connection()
  await new FinancialBaseSeeder(client).run()
  await new CategoriesSeeder(client).run()
}
