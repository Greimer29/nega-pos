import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('expenses', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.date('date').notNullable()
      table.string('description', 255).notNullable()
      table.decimal('amount_usd', 15, 4).notNullable()
      table
        .string('currency_code', 3)
        .notNullable()
        .defaultTo('USD')
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['date'])
      table.index(['account_id'])
    })

    this.schema.createTable('customer_payments', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('customer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
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
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.decimal('amount_usd', 15, 4).notNullable()
      table.date('date').notNullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['customer_id'])
      table.index(['order_id'])
      table.index(['sale_id'])
      table.index(['date'])
    })

    this.schema.createTable('supplier_payments', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('supplier_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('RESTRICT')
      table
        .bigInteger('purchase_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchases')
        .onDelete('SET NULL')
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.decimal('amount_usd', 15, 4).notNullable()
      table.date('date').notNullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['supplier_id'])
      table.index(['purchase_id'])
      table.index(['date'])
    })
  }

  async down() {
    this.schema.dropTable('supplier_payments')
    this.schema.dropTable('customer_payments')
    this.schema.dropTable('expenses')
  }
}
