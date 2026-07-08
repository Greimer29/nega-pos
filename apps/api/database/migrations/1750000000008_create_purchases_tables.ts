import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('purchases', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('supplier_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('RESTRICT')
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.date('date').notNullable()
      table.date('received_date').nullable()
      table.string('invoice_number', 50).nullable()
      table.string('invoice_file', 255).nullable()
      table.decimal('usd_rate', 15, 4).nullable()
      table.decimal('total_bs', 15, 2).notNullable().defaultTo(0)
      table.decimal('total_usd', 15, 4).nullable()
      table.enum('status', ['DRAFT', 'CONFIRMED', 'VOIDED']).notNullable().defaultTo('DRAFT')
      table.boolean('is_credit').notNullable().defaultTo(false)
      table.date('credit_due_date').nullable()
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0)
      table.text('notes').nullable()
      table.timestamp('voided_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['supplier_id'])
      table.index(['account_id'])
      table.index(['date'])
      table.index(['status'])
      table.index(['is_credit'])
      table.index(['credit_due_date'])
    })

    this.schema.createTable('purchase_items', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('purchase_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('purchases')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.decimal('unit_price_usd', 15, 4).nullable()
      table.decimal('unit_price_bs', 15, 2).notNullable()
      table.decimal('subtotal_usd', 15, 4).nullable()
      table.decimal('subtotal_bs', 15, 2).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['purchase_id'])
      table.index(['material_id'])
      table.index(['catalog_product_id'])
    })
  }

  async down() {
    this.schema.dropTable('purchase_items')
    this.schema.dropTable('purchases')
  }
}
