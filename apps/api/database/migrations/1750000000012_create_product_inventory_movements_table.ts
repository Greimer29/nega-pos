import { BaseSchema } from '@adonisjs/lucid/schema'

const PRODUCT_MOVEMENT_TYPES = [
  'PURCHASE_IN',
  'SALE_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
] as const

export default class extends BaseSchema {
  protected tableName = 'product_inventory_movements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('RESTRICT')
      table.enum('type', PRODUCT_MOVEMENT_TYPES).notNullable()
      table.decimal('quantity', 12, 3).notNullable()
      table.string('note', 255).nullable()
      table
        .bigInteger('purchase_item_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchase_items')
        .onDelete('SET NULL')
      table
        .bigInteger('order_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('orders')
        .onDelete('SET NULL')
      table
        .bigInteger('sale_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sales')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()

      table.index(['catalog_product_id'])
      table.index(['purchase_item_id'])
      table.index(['order_id'])
      table.index(['sale_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
