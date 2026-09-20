import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sale_payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('sale_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sales')
        .onDelete('CASCADE')
      table
        .string('payment_method_code', 50)
        .notNullable()
        .references('code')
        .inTable('payment_methods')
        .onDelete('RESTRICT')
      table.decimal('amount_usd', 15, 4).notNullable()
      table.string('currency_code', 3).notNullable()
      table.decimal('usd_rate', 15, 4).nullable()
      table.decimal('amount_native', 15, 4).nullable()
      table.integer('sort_order').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sale_id'])
      table.index(['payment_method_code'])
    })

    await this.defer(async () => {
      await this.db.rawQuery(`
        INSERT INTO sale_payments (
          sale_id,
          payment_method_code,
          amount_usd,
          currency_code,
          usd_rate,
          amount_native,
          sort_order,
          created_at,
          updated_at
        )
        SELECT
          s.id,
          s.payment_method_code,
          s.total_usd,
          COALESCE(pm.currency_code, 'USD'),
          s.usd_rate,
          s.total_bs,
          0,
          s.created_at,
          s.updated_at
        FROM sales s
        LEFT JOIN payment_methods pm ON pm.code = s.payment_method_code
        WHERE s.payment_type = 'CASH'
          AND s.payment_method_code IS NOT NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
