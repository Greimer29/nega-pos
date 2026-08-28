import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('expenses', (table) => {
      table.decimal('entry_rate', 18, 6).nullable().after('currency_code')
    })

    this.schema.alterTable('incomes', (table) => {
      table.decimal('entry_rate', 18, 6).nullable().after('currency_code')
    })
  }

  async down() {
    this.schema.alterTable('expenses', (table) => {
      table.dropColumn('entry_rate')
    })

    this.schema.alterTable('incomes', (table) => {
      table.dropColumn('entry_rate')
    })
  }
}
