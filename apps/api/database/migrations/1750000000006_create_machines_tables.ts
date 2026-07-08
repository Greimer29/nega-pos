import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('machines', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 100).notNullable()
      table.string('type', 80).notNullable()
      table.string('brand', 80).nullable()
      table.string('model', 80).nullable()
      table.string('serial_number', 80).nullable()
      table.date('acquisition_date').nullable()
      table.decimal('acquisition_cost', 15, 2).nullable()
      table
        .enum('status', ['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE'])
        .notNullable()
        .defaultTo('OPERATIONAL')
      table.string('location', 100).nullable()
      table.text('notes').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['type'])
      table.index(['status'])
    })

    this.schema.createTable('machine_expenses', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('machine_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('machines')
        .onDelete('RESTRICT')
      table
        .bigInteger('account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
      table.date('date').notNullable()
      table.enum('category', ['REPAIR', 'SUPPLY', 'MAINTENANCE', 'OTHER']).notNullable()
      table.string('description', 255).notNullable()
      table.decimal('amount', 15, 2).notNullable()
      table
        .string('currency_code', 3)
        .notNullable()
        .defaultTo('USD')
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table
        .bigInteger('supplier_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('SET NULL')
      table.string('receipt_file', 255).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['machine_id', 'date'])
      table.index(['category'])
      table.index(['date'])
      table.index(['supplier_id'])
      table.index(['account_id'])
    })
  }

  async down() {
    this.schema.dropTable('machine_expenses')
    this.schema.dropTable('machines')
  }
}
