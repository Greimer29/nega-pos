import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('sales_shifts', (table) => {
      table.bigIncrements('id').primary()
      table.timestamp('opened_at').notNullable()
      table.timestamp('closed_at').nullable()
      table
        .bigInteger('opened_by_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table
        .bigInteger('closed_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table.enum('status', ['OPEN', 'CLOSED']).notNullable().defaultTo('OPEN')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['status'], 'sales_shifts_status_index')
      table.index(['opened_at'], 'sales_shifts_opened_at_index')
    })

    this.schema.alterTable('sales', (table) => {
      table
        .bigInteger('sales_shift_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sales_shifts')
        .onDelete('RESTRICT')
        .after('sold_by_user_id')

      table.index(['sales_shift_id'], 'sales_sales_shift_id_index')
    })
  }

  async down() {
    this.schema.alterTable('sales', (table) => {
      table.dropIndex(['sales_shift_id'], 'sales_sales_shift_id_index')
      table.dropForeign(['sales_shift_id'])
      table.dropColumn('sales_shift_id')
    })

    this.schema.dropTable('sales_shifts')
  }
}
