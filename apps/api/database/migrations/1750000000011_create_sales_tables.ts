import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('sales', (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 10).nullable().unique()
      table
        .bigInteger('customer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('customers')
        .onDelete('SET NULL')
      table.string('guest_name', 150).nullable()
      table
        .string('payment_method_code', 50)
        .nullable()
        .references('code')
        .inTable('payment_methods')
        .onDelete('SET NULL')
      table.enum('billing_mode', ['FAST', 'ORDER']).notNullable().defaultTo('FAST')
      table
        .enum('order_status', ['PENDING', 'IN_PROCESS', 'DELIVERED'])
        .notNullable()
        .defaultTo('DELIVERED')
      table.enum('payment_type', ['CASH', 'CREDIT']).notNullable().defaultTo('CASH')
      table.decimal('total_usd', 15, 4).notNullable()
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('total_bs', 15, 2).nullable()
      table.decimal('usd_rate', 15, 4).nullable()
      table.date('credit_due_date').nullable()
      table.enum('status', ['DRAFT', 'COMPLETED', 'RETURNED']).notNullable().defaultTo('DRAFT')
      table.timestamp('sold_at').nullable()
      table.timestamp('confirmed_at').nullable()
      table.timestamp('returned_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sold_at'])
      table.index(['customer_id'])
      table.index(['status'])
      table.index(['payment_method_code'])
      table.index(['confirmed_at'])
    })

    this.schema.createTable('sale_lines', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('sale_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sales')
        .onDelete('CASCADE')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('SET NULL')
      table
        .bigInteger('material_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('materials')
        .onDelete('SET NULL')
      table.string('description', 200).notNullable()
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('unit_price_usd', 15, 4).notNullable()
      table.decimal('subtotal_usd', 15, 4).notNullable()
      table.decimal('cost_usd', 15, 4).nullable()
      table.decimal('returned_quantity', 12, 3).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sale_id'])
    })
  }

  async down() {
    this.schema.dropTable('sale_lines')
    this.schema.dropTable('sales')
  }
}
