import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('sale_line_materials', (table) => {
      table.bigIncrements('id').primary()
      table
        .bigInteger('sale_line_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sale_lines')
        .onDelete('CASCADE')
      table
        .bigInteger('material_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('materials')
        .onDelete('RESTRICT')
      table.decimal('quantity_per_unit', 12, 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['sale_line_id', 'material_id'])
      table.index(['sale_line_id'])
      table.index(['material_id'])
    })
  }

  async down() {
    this.schema.dropTable('sale_line_materials')
  }
}
