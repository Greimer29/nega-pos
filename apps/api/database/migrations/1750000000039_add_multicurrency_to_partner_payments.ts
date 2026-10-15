import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('customer_payments', (table) => {
      table
        .string('currency_code', 3)
        .nullable()
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table.decimal('entry_rate', 18, 6).nullable()
      table.decimal('amount_native', 15, 4).nullable()
    })

    this.schema.alterTable('supplier_payments', (table) => {
      table
        .string('currency_code', 3)
        .nullable()
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table.decimal('entry_rate', 18, 6).nullable()
      table.decimal('amount_native', 15, 4).nullable()
    })
  }

  async down() {
    this.schema.alterTable('customer_payments', (table) => {
      table.dropColumn('amount_native')
      table.dropColumn('entry_rate')
      table.dropColumn('currency_code')
    })
    this.schema.alterTable('supplier_payments', (table) => {
      table.dropColumn('amount_native')
      table.dropColumn('entry_rate')
      table.dropColumn('currency_code')
    })
  }
}
