import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('accounts', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable().unique()
      table.string('description', 255).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['is_active'])
    })

    this.schema.createTable('currencies', (table) => {
      table.string('code', 3).primary()
      table.string('name', 64).notNullable()
      table.decimal('rate_per_usd', 15, 4).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['is_active'])
    })

    this.schema.createTable('app_settings', (table) => {
      table.string('key', 64).primary()
      table.text('value').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('payment_methods', (table) => {
      table.bigIncrements('id').primary()
      table.string('code', 50).notNullable().unique()
      table.string('name', 100).notNullable()
      table
        .string('currency_code', 3)
        .notNullable()
        .references('code')
        .inTable('currencies')
        .onDelete('RESTRICT')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['is_active'])
      table.index(['sort_order'])
    })
  }

  async down() {
    this.schema.dropTable('payment_methods')
    this.schema.dropTable('app_settings')
    this.schema.dropTable('currencies')
    this.schema.dropTable('accounts')
  }
}
