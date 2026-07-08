import { BaseSchema } from '@adonisjs/lucid/schema'

const MATERIAL_MOVEMENT_TYPES = [
  'PURCHASE_IN',
  'ORDER_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
  'SALE_OUT',
] as const

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('inventory_movements', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.enum('type', MATERIAL_MOVEMENT_TYPES).notNullable()
      table.decimal('quantity', 12, 3).notNullable()
      table
        .bigInteger('purchase_item_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchase_items')
        .onDelete('RESTRICT')
      table
        .bigInteger('order_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('orders')
        .onDelete('SET NULL')
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['material_id', 'created_at'])
      table.index(['order_id'])
      table.index(['purchase_item_id'])
    })
  }

  async down() {
    this.schema.dropTable('inventory_movements')
  }
}
