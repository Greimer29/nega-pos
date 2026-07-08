import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('counters', (table) => {
      table.string('scope', 50).primary()
      table.integer('value').unsigned().notNullable().defaultTo(0)
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('orders', (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 20).notNullable().unique()
      table
        .bigInteger('customer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
      table.string('guest_name', 150).nullable()
      table.enum('modality', ['WHITE_LABEL', 'CORPORATE']).notNullable()
      table.text('description').notNullable()
      table.integer('total_quantity').unsigned().notNullable()
      table.date('order_date').notNullable()
      table.date('estimated_delivery_date').nullable()
      table
        .enum('status', [
          'DRAFT',
          'CONFIRMED',
          'IN_PRODUCTION',
          'DELIVERED',
          'CANCELLED',
          'RETURNED',
        ])
        .notNullable()
        .defaultTo('DRAFT')
      table.timestamp('confirmed_at').nullable()
      table.enum('payment_type', ['CASH', 'CREDIT']).notNullable().defaultTo('CASH')
      table.date('credit_due_date').nullable()
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('total_price', 15, 2).nullable()
      table.text('notes').nullable()
      table.string('reference_file', 255).nullable()
      table.timestamp('returned_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['customer_id'])
      table.index(['status'])
      table.index(['order_date'])
      table.index(['modality'])
      table.index(['confirmed_at'])
      table.index(['payment_type'])
      table.index(['credit_due_date'])
    })

    this.schema.createTable('order_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity_per_garment', 12, 3).notNullable()
      table.string('notes', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['order_id', 'material_id'])
      table.index(['order_id'])
      table.index(['material_id'])
    })

    this.schema.createTable('order_lines', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('returned_quantity', 12, 3).notNullable().defaultTo(0)
      table.decimal('unit_price_usd', 15, 4).notNullable()
      table.decimal('subtotal_usd', 15, 4).notNullable()
      table.decimal('cost_usd', 15, 4).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['order_id'])
      table.index(['catalog_product_id'])
    })
  }

  async down() {
    this.schema.dropTable('order_lines')
    this.schema.dropTable('order_materials')
    this.schema.dropTable('orders')
    this.schema.dropTable('counters')
  }
}
