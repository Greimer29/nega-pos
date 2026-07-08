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

    this.defer(async (db) => {
      const now = new Date()
      await db.table('currencies').insert([
        {
          code: 'USD',
          name: 'Dólar estadounidense',
          rate_per_usd: '1.0000',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'VES',
          name: 'Bolívar',
          rate_per_usd: '1.0000',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ])

      await db.table('payment_methods').insert([
        {
          code: 'cash_usd',
          name: 'Efectivo USD',
          currency_code: 'USD',
          is_active: true,
          sort_order: 1,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'cash_bs',
          name: 'Efectivo Bs',
          currency_code: 'VES',
          is_active: true,
          sort_order: 2,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'transfer',
          name: 'Transferencia',
          currency_code: 'VES',
          is_active: true,
          sort_order: 3,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'mobile_payment',
          name: 'Pago móvil',
          currency_code: 'VES',
          is_active: true,
          sort_order: 4,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'zelle',
          name: 'Zelle',
          currency_code: 'USD',
          is_active: true,
          sort_order: 5,
          created_at: now,
          updated_at: now,
        },
        {
          code: 'binance',
          name: 'Binance',
          currency_code: 'USD',
          is_active: true,
          sort_order: 6,
          created_at: now,
          updated_at: now,
        },
      ])
    })
  }

  async down() {
    this.schema.dropTable('payment_methods')
    this.schema.dropTable('app_settings')
    this.schema.dropTable('currencies')
    this.schema.dropTable('accounts')
  }
}
