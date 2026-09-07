import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('catalog_product_sizes', (table) => {
      table.bigIncrements('id').notNullable()
      table
        .bigInteger('catalog_product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('CASCADE')
      table.string('size', 20).notNullable()
      table.decimal('stock_quantity', 15, 4).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['catalog_product_id', 'size'])
      table.index(['catalog_product_id'])
      table.index(['size'])
    })

    this.schema.alterTable('order_lines', (table) => {
      table
        .bigInteger('catalog_product_size_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_product_sizes')
        .onDelete('SET NULL')
      table.string('size', 20).nullable()
      table.text('notes').nullable()
    })

    this.schema.alterTable('sale_lines', (table) => {
      table
        .bigInteger('catalog_product_size_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('catalog_product_sizes')
        .onDelete('SET NULL')
      table.string('size', 20).nullable()
    })
  }

  async down() {
    this.schema.alterTable('sale_lines', (table) => {
      table.dropForeign(['catalog_product_size_id'])
      table.dropColumn('catalog_product_size_id')
      table.dropColumn('size')
    })

    this.schema.alterTable('order_lines', (table) => {
      table.dropForeign(['catalog_product_size_id'])
      table.dropColumn('catalog_product_size_id')
      table.dropColumn('size')
      table.dropColumn('notes')
    })

    this.schema.dropTable('catalog_product_sizes')
  }
}
