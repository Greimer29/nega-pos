import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('machines', (table) => {
      table
        .string('entry_currency_code', 3)
        .nullable()
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table.decimal('entry_rate', 18, 6).nullable()
      table.decimal('acquisition_amount_native', 15, 4).nullable()
    })

    this.schema.alterTable('machine_payments', (table) => {
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
    this.schema.alterTable('machine_payments', (table) => {
      table.dropColumn('amount_native')
      table.dropColumn('entry_rate')
      table.dropColumn('currency_code')
    })
    this.schema.alterTable('machines', (table) => {
      table.dropColumn('acquisition_amount_native')
      table.dropColumn('entry_rate')
      table.dropColumn('entry_currency_code')
    })
  }
}
