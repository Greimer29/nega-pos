import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.string('barcode', 64).nullable().after('name')
      table.unique(['barcode'], 'catalog_products_barcode_unique')
    })

    this.schema.alterTable('materials', (table) => {
      table.string('barcode', 64).nullable().after('code')
      table.unique(['barcode'], 'materials_barcode_unique')
    })
  }

  async down() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropUnique(['barcode'], 'catalog_products_barcode_unique')
      table.dropColumn('barcode')
    })

    this.schema.alterTable('materials', (table) => {
      table.dropUnique(['barcode'], 'materials_barcode_unique')
      table.dropColumn('barcode')
    })
  }
}
