import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('purchases', (table) => {
      table
        .string('entry_currency_code', 3)
        .nullable()
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
    })

    this.defer(async (db) => {
      await db
        .from('purchases')
        .whereNotNull('usd_rate')
        .whereNull('entry_currency_code')
        .update({ entry_currency_code: 'VES' })

      await db
        .from('purchases')
        .whereNull('entry_currency_code')
        .update({ entry_currency_code: 'USD' })
    })
  }

  async down() {
    this.schema.alterTable('purchases', (table) => {
      table.dropForeign(['entry_currency_code'])
      table.dropColumn('entry_currency_code')
    })
  }
}
