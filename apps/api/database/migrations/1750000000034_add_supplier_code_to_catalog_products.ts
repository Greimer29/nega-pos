import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.string('supplier_code', 50).nullable().after('barcode')
      table.index(['supplier_code'], 'catalog_products_supplier_code_index')
    })
  }

  async down() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropIndex(['supplier_code'], 'catalog_products_supplier_code_index')
      table.dropColumn('supplier_code')
    })
  }
}
