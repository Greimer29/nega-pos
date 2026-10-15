import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('machines', (table) => {
      table.boolean('is_credit').notNullable().defaultTo(false)
      table.decimal('amount_paid_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('balance_usd', 15, 4).notNullable().defaultTo(0)
      table.date('credit_due_date').nullable()
      table.index(['is_credit', 'balance_usd'], 'machines_credit_balance_idx')
    })

    this.schema.createTable('machine_payments', (table) => {
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
      table.decimal('amount_usd', 15, 4).notNullable()
      table.date('date').notNullable()
      table.string('note', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['machine_id', 'date'])
      table.index(['date'])
      table.index(['account_id'])
    })
  }

  async down() {
    this.schema.dropTable('machine_payments')
    this.schema.alterTable('machines', (table) => {
      table.dropIndex(['is_credit', 'balance_usd'], 'machines_credit_balance_idx')
      table.dropColumn('credit_due_date')
      table.dropColumn('balance_usd')
      table.dropColumn('amount_paid_usd')
      table.dropColumn('is_credit')
    })
  }
}
