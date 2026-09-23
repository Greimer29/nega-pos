import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.boolean('wholesale_enabled').notNullable().defaultTo(false)
      table.decimal('wholesale_units_per_pack', 12, 3).nullable()
      table.decimal('wholesale_cost_usd', 15, 4).nullable()
      table.decimal('wholesale_sale_price_usd', 15, 4).nullable()
    })

    this.schema.alterTable('materials', (table) => {
      table.boolean('wholesale_enabled').notNullable().defaultTo(false)
      table.decimal('wholesale_units_per_pack', 12, 3).nullable()
      table.decimal('wholesale_cost_usd', 15, 4).nullable()
      table.decimal('wholesale_sale_price_usd', 15, 4).nullable()
    })

    this.schema.alterTable('purchase_items', (table) => {
      table.boolean('is_wholesale').notNullable().defaultTo(false)
      table.decimal('units_per_pack', 12, 3).nullable()
    })

    this.schema.alterTable('sale_lines', (table) => {
      table.boolean('is_wholesale').notNullable().defaultTo(false)
      table.decimal('units_per_pack', 12, 3).nullable()
    })
  }

  async down() {
    this.schema.alterTable('sale_lines', (table) => {
      table.dropColumn('is_wholesale')
      table.dropColumn('units_per_pack')
    })

    this.schema.alterTable('purchase_items', (table) => {
      table.dropColumn('is_wholesale')
      table.dropColumn('units_per_pack')
    })

    this.schema.alterTable('materials', (table) => {
      table.dropColumn('wholesale_enabled')
      table.dropColumn('wholesale_units_per_pack')
      table.dropColumn('wholesale_cost_usd')
      table.dropColumn('wholesale_sale_price_usd')
    })

    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('wholesale_enabled')
      table.dropColumn('wholesale_units_per_pack')
      table.dropColumn('wholesale_cost_usd')
      table.dropColumn('wholesale_sale_price_usd')
    })
  }
}
