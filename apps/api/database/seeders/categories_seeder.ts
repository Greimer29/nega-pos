import Category from '#models/category'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

const CATEGORIES = [
  { name: 'Uniforme', sortOrder: 1 },
  { name: 'Camisa', sortOrder: 2 },
  { name: 'Pantalón', sortOrder: 3 },
  { name: 'Accesorio', sortOrder: 4 },
  { name: 'Otro', sortOrder: 99 },
] as const

export default class extends BaseSeeder {
  async run() {
    for (const row of CATEGORIES) {
      await Category.updateOrCreate(
        { name: row.name },
        {
          active: true,
          sortOrder: row.sortOrder,
        }
      )
    }
  }
}
