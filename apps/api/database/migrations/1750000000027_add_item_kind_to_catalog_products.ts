import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.string('item_kind', 20).notNullable().defaultTo('PRODUCT').after('category')
      table.index(['item_kind'], 'catalog_products_item_kind_index')
    })
  }

  async down() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropIndex(['item_kind'], 'catalog_products_item_kind_index')
      table.dropColumn('item_kind')
    })
  }
}
