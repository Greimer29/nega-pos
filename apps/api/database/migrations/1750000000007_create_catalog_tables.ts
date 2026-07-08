import { BaseSchema } from '@adonisjs/lucid/schema'

const SALE_UNITS = ['UND', 'PAR', 'CAJ', 'ROL', 'SET', 'MTS', 'KG'] as const

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('formulas', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['active'])
    })

    this.schema.createTable('formula_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('formula_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('formulas')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity', 12, 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['formula_id', 'material_id'])
    })

    this.schema.createTable('catalog_products', (table) => {
      table.bigIncrements('id').primary()
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.string('category', 100).notNullable()
      table.enum('sale_unit', SALE_UNITS).notNullable().defaultTo('UND')
      table.string('image_path', 255).nullable()
      table
        .bigInteger('formula_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('formulas')
        .onDelete('SET NULL')
      table.decimal('sale_price_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('previous_sale_price_usd', 15, 4).nullable()
      table.decimal('cost_usd', 15, 4).notNullable().defaultTo(0)
      table.decimal('stock_quantity', 12, 3).notNullable().defaultTo(0)
      table.decimal('minimum_stock', 15, 3).notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['name'])
      table.index(['category'])
      table.index(['active'])
      table.index(['formula_id'])
    })
  }

  async down() {
    this.schema.dropTable('catalog_products')
    this.schema.dropTable('formula_materials')
    this.schema.dropTable('formulas')
  }
}
