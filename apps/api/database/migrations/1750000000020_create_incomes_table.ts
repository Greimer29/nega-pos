import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('incomes', (table) => {
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
  }

  async down() {
    this.schema.dropTable('incomes')
  }
}
